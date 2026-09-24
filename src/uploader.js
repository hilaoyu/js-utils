import Utils from './utils';
import {axios} from "./axios";
import PQueue from "p-queue";

const CHUNK_UPLOAD_TIMEOUT_MS = 60000;
const RETRY_DELAY_START_MS = 300;
const RETRY_DELAY_MAX_MS = 5000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error) {
    if (!error) return false;
    if (error.name === 'AbortError' || error.name === 'CanceledError') return true;
    if (error.code === 'ERR_CANCELED') return true;
    const msg = String(error.message || '');
    return /abort|cancel/i.test(msg);
}

/** 分片上传失败文案：axios 英文 Network Error / timeout 等统一为「网络错误」 */
function normalizeUploadErrorMessage(error) {
    const msg = String(error?.message || '');
    const code = String(error?.code || '');
    const combined = `${msg} ${code}`.toLowerCase();
    if (
        /network\s*error/.test(combined)
        || /timeout/.test(combined)
        || /err_network/.test(combined)
        || /econnaborted/.test(combined)
        || /err_internet_disconnected/.test(combined)
        || /failed to fetch/.test(combined)
        || /net::/.test(combined)
        || !msg
    ) {
        return '网络错误';
    }
    // 分片上传场景其它失败也兜底中文，避免弹框再冒英文
    if (/^[a-z0-9_\s.:-]+$/i.test(msg) && /[a-z]/i.test(msg)) {
        return '网络错误';
    }
    return msg || '网络错误';
}

function normalizeChunksCompleted(input) {
    if (Utils.isEmpty(input)) {
        return [];
    }
    if (Utils.typeIs('array', input)) {
        return input.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    }
    if (Utils.typeIs('object', input)) {
        return Object.keys(input).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
    }
    return [];
}

export class Uploader {
    constructor(serverUrl, autoStart) {
        this.setServerUrl(serverUrl);
        this.requestQueue = new PQueue({concurrency: 1, autoStart: autoStart})
        let _this = this
        this.requestQueue.on('idle',()=>{
            _this.triggerEventUploadFinished(false)
        })
    }
    serverUrl = ""
    fileLimitMaxSize = 0
    fileLimitAllowExt = []
    chunkSize = 2000000
    limitMaxThreads = 1
    client

    fileQueue = []
    requestQueue

    eventOnError = function (err) {
        console.error(err)
    }
    triggerEventError(err) {
        if (Utils.typeIs('function', this.eventOnError)) {
            this.eventOnError(err)
        }
    }
    setEventOnError(callback) {
        if (Utils.typeIs('function', callback)) {
            this.eventOnError = callback
        }
    }

    eventOnUploadFinished = function (completedUrls){
        console.log("completedUrls:",completedUrls)
    }
    triggerEventUploadFinished(force ){
        if(this.requestQueue.size > 0){
            return
        }
        if(!force && this.fileQueue.length <= 0){
            return
        }
        let completedUrls = []
        this.fileQueue.forEach((item)=>{
            if(Utils.isEmpty(item.url)){
                return
            }
            if(item.uploadCompleted){
                completedUrls.push(item.url)
            }
        })
        this.eventOnUploadFinished(completedUrls)
    }
    setEventOnUploadFinished(callback) {
        if (Utils.typeIs('function', callback)) {
            this.eventOnUploadFinished = callback
        }
    }

    eventOnFileQueueChange = function (queue, changedIndex) {
        console.log(queue)
        console.log(changedIndex)
        if(changedIndex >= 0 && queue.length > changedIndex){
            console.log(queue[changedIndex].chunksCompletedPercent)
        }

    }
    triggerEventFileQueueChange(current) {
        if (Utils.typeIs('function', this.eventOnFileQueueChange)) {
            let i = -1
            if(!Utils.isUndefined(current)){
                i = this.fileQueue.findIndex((item)=>{return item.file.name === current.file.name})
            }
            this.eventOnFileQueueChange(this.fileQueue,i)
        }
    }
    setEventOnFileQueueChange(callback) {
        if (Utils.typeIs('function', callback)) {
            this.eventOnFileQueueChange = callback
        }
    }

    setServerUrl(url) {
        if (!!url && Utils.typeIs('string', url)) {
            this.serverUrl = url
            this.client = axios.withBaseUrl(url)
        }
    }
    setFileLimitMaxSize(v) {
        if (Utils.typeIs('number', v)) {
            this.fileLimitMaxSize = v
        }

    }
    setFileLimitAllowExt(v) {
        if (Utils.typeIs('array', v)) {
            this.fileLimitAllowExt = v
        }

    }
    setChunkSize(v) {
        if (Utils.typeIs('number', v)) {
            this.chunkSize = v
        }
    }
    setLimitMaxThreads(v) {
        if (Utils.typeIs('number', v)) {
            this.limitMaxThreads = v
            this.requestQueue.concurrency = v
        }
    }

    isReady(){
        return !Utils.isEmpty(this.serverUrl)
    }

    getFileQueue(){
        return this.fileQueue
    }

    selectFile(multiple,clearQueue,customId, allowExt) {
        let _this = this
        if (Utils.isEmpty(allowExt)) {
            allowExt = this.fileLimitAllowExt
        }

        let fileSelectInput = document.createElement('input')
        fileSelectInput.setAttribute("type", "file")
        if (!!multiple) {
            fileSelectInput.setAttribute("multiple", "multiple")
        }
        let accept = []
        if (Utils.typeIs('array', allowExt) && allowExt.length > 0) {
            allowExt.forEach(function (ext) {
                if (!Utils.typeIs('string', ext)) {
                    return
                }
                ext = ext.trim()
                if (Utils.isEmpty(ext)) {
                    return
                }
                if (!ext.startsWith(".")) {
                    ext = "." + ext
                }
                accept.push(ext)
            })
        }
        if (accept.length > 0) {
            fileSelectInput.setAttribute("accept", accept.join(","))
        }

        fileSelectInput.addEventListener('change', function (e) {
            //Get files
            for (let i = 0; i < e.target.files.length; i++) {
                _this.addFile(e.target.files[i],clearQueue,customId)
            }
        })

        fileSelectInput.click();
    }

    /**
     * @param {File} file
     * @param {boolean} [clearQueue]
     * @param {*} [customId]
     * @param {{ taskId?: string, chunksCompleted?: object|number[] }} [resumeOptions]
     */
    addFile(file,clearQueue,customId, resumeOptions) {
        if(clearQueue){
            this.clear(true)
        }
        return this.fileQueueAdd(file,customId, resumeOptions)
    }

    /**
     * 续传：跳过 generate-task，只传缺失分片
     * @param {File} file
     * @param {{ taskId: string, chunksCompleted?: object|number[] }} resumeOptions
     */
    resumeFile(file, resumeOptions) {
        if (!resumeOptions || Utils.isEmpty(resumeOptions.taskId)) {
            this.triggerEventError(new Error("续传缺少 taskId"))
            return
        }
        return this.fileQueueAdd(file, resumeOptions.customId, resumeOptions)
    }

    fileQueueAdd(file,customId, resumeOptions) {
        let _this = this
        if (_this.fileLimitMaxSize > 0 && file.size > _this.fileLimitMaxSize) {
            _this.triggerEventError(new Error("文件大小超出限制:" + Utils.formatFileSize(_this.fileLimitMaxSize)))
            return
        }
        let chunks = Math.ceil(file.size / _this.chunkSize)

        const pushQueueItem = (taskId, initialCompleted) => {
            const abortController = new AbortController()
            abortController.signal.addEventListener("abort", () => {});
            abortController.signal.throwIfAborted = ()=>{}
            let qi = {
                file: file,
                taskId: taskId,
                customId:customId,
                chunks: chunks,
                chunksCompleted: normalizeChunksCompleted(initialCompleted),
                chunksCompletedMap: Utils.typeIs('object', initialCompleted) && !Utils.typeIs('array', initialCompleted)
                    ? { ...initialCompleted }
                    : {},
                chunksCompletedPercent: 0,
                uploadCompleted: false,
                error: "",
                errorMessage: "",
                fileUri: "",
                controller:abortController,
                remove:function (){
                    _this.fileQueueRemove(taskId)
                }
            }
            if (qi.chunks > 0 && qi.chunksCompleted.length > 0) {
                qi.chunksCompletedPercent = Math.min(
                    100,
                    Math.round((qi.chunksCompleted.length / qi.chunks) * 100)
                )
            }
            _this.fileQueue.push(qi)
            _this.triggerEventFileQueueChange(qi)
            _this.requestQueueAdd(qi)
        }

        const resumeTaskId = resumeOptions && resumeOptions.taskId
        if (!Utils.isEmpty(resumeTaskId)) {
            pushQueueItem(resumeTaskId, resumeOptions.chunksCompleted)
            return
        }

        _this.client.quiet().apiRequest({url: '/generate-task', method: "post"}, {
            file_name: file.name,
            size: file.size,
            chunks: chunks,
            chunk_size: _this.chunkSize,
        }).then(function (res) {
            let taskId = Utils.valueGet(res, "data.id")
            if (Utils.isEmpty(taskId)) {
                _this.triggerEventError(new Error("生成上传任务失败"))
                return
            }
            pushQueueItem(taskId, Utils.valueGet(res, "data.chunks_completed", {}))
        }).catch(function (err) {
            _this.triggerEventError(err)
        })

    }

    applyUploadResponse(fileQueueItem, res) {
        const map = Utils.valueGet(res, "data.chunks_completed", null)
        if (map && Utils.typeIs('object', map)) {
            fileQueueItem.chunksCompletedMap = { ...map }
            fileQueueItem.chunksCompleted = normalizeChunksCompleted(map)
        }
        let completedPercent = Utils.valueGet(res,"data.chunks_completed_percent",0)
        let completed = Utils.valueGet(res,"data.upload_completed",false)
        let url = Utils.valueGet(res,"data.url",false)
        if(completedPercent > fileQueueItem.chunksCompletedPercent ){
            fileQueueItem.chunksCompletedPercent = Math.min(100,completedPercent)
        }
        if (completed) {
            fileQueueItem.url = url
            fileQueueItem.uploadCompleted = completed
            fileQueueItem.chunksCompletedPercent = 100
        }
        fileQueueItem.errorMessage = ""
        fileQueueItem.error = ""
    }

    requestQueueAdd(fileQueueItem) {
        let _this = this
        const completedSet = new Set(fileQueueItem.chunksCompleted || [])
        const missing = []
        for (let i = 0; i < fileQueueItem.chunks; i++) {
            if (!completedSet.has(i)) {
                missing.push(i)
            }
        }

        // 本地已记满全部分片时，再投最后一片以拿最终 url / upload_completed（依赖服务端幂等）
        const chunkIndexes = missing.length > 0
            ? missing
            : (fileQueueItem.chunks > 0 ? [fileQueueItem.chunks - 1] : [])

        for (let i of chunkIndexes) {
            _this.requestQueue.add(async ({signal}) => {
                if(signal.aborted){
                    return
                }

                let delay = RETRY_DELAY_START_MS

                while (!signal.aborted) {
                    const formData = new FormData();
                    formData.append("task_id", fileQueueItem.taskId)
                    formData.append("chunk", i)
                    const start = i * _this.chunkSize;
                    const end = start + _this.chunkSize;
                    const sliceBlob = fileQueueItem.file.slice(start, end);
                    formData.append('file', sliceBlob);

                    try {
                        const res = await _this.client.quiet().apiRequest({
                            url:"/upload",
                            method:"post",
                            timeout: CHUNK_UPLOAD_TIMEOUT_MS,
                            headers: {
                                'Content-Encoding': 'multipart/form-data'
                            },
                            signal: signal
                        }, formData)

                        _this.applyUploadResponse(fileQueueItem, res)
                        _this.triggerEventFileQueueChange(fileQueueItem)
                        return
                    } catch (error) {
                        if (isAbortError(error) || signal.aborted) {
                            return
                        }
                        fileQueueItem.errorMessage = normalizeUploadErrorMessage(error)
                        fileQueueItem.error = fileQueueItem.errorMessage
                        _this.triggerEventFileQueueChange(fileQueueItem)
                        await sleep(delay)
                        delay = Math.min(delay * 2, RETRY_DELAY_MAX_MS)
                    }
                }
            }, {signal: fileQueueItem.controller.signal})
        }
    }

    startUpload(){
        this.requestQueue.start()
    }
    pauseUpload(){
        this.requestQueue.pause()
    }
    clear(ignoreEventFinished){
        this.requestQueue.clear()
        this.fileQueue = []
        this.triggerEventFileQueueChange()
        if(!ignoreEventFinished){
            this.triggerEventUploadFinished(true)
        }

    }

    fileQueueRemove(taskId){
        let i = this.fileQueue.findIndex((item)=>{return item.taskId === taskId})
        if(i < 0){
            return;
        }
        this.fileQueue[i].controller.abort("")
        this.fileQueue.splice(i,1)

        this.triggerEventFileQueueChange()
        this.triggerEventUploadFinished(true)
    }

}
