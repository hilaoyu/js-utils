import Utils from './utils';
import {axios} from "./axios";
import pQueue from "p-queue";

export class Uploader {
    constructor(serverUrl, autoStart) {
        this.setServerUrl(serverUrl);
        this.requestQueue = new pQueue({concurrency: 1, autoStart: autoStart})
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

    eventOnUploadFinished = function (completedTaskIds,uncompletedTaskIds){
        console.log("completedTaskIds:",completedTaskIds)
        console.log("uncompletedTaskIds:",uncompletedTaskIds)
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
        console.log(queue[changedIndex].chunksCompletedPercent)
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
            this.requestQueue.concurrency(v)
        }
    }

    isReady(){
        return !Utils.isEmpty(this.serverUrl)
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
    addFile(file,clearQueue,customId) {
        if(clearQueue){
            this.clear(true)
        }
        return this.fileQueueAdd(file,customId)
    }

    fileQueueAdd(file,customId) {
        let _this = this
        if (_this.fileLimitMaxSize > 0 && file.size > _this.fileLimitMaxSize) {
            _this.triggerEventError(new Error("文件大小超出限制:" + Utils.formatFileSize(_this.fileLimitMaxSize)))
            return
        }
        let chunks = Math.ceil(file.size / _this.chunkSize)
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
            const abortController = new AbortController()
            abortController.signal.addEventListener("abort", () => {});
            abortController.signal.throwIfAborted = ()=>{}
            let qi = {
                file: file,
                taskId: taskId,
                customId:customId,
                chunks: chunks,
                chunksCompleted: [],
                chunksCompletedPercent: 0,
                uploadCompleted: false,
                error: "",
                fileUri: "",
                controller:abortController,
                remove:function (){
                    let i = _this.fileQueue.findIndex((item)=>{return item.file.name === file.name})
                    if(i >= 0){
                        _this.fileQueueRemove(i)
                    }
                }
            }
            _this.fileQueue.push(qi)
            _this.triggerEventFileQueueChange(qi)
            _this.requestQueueAdd(qi)

        }).catch(function (err) {
            _this.triggerEventError(err)
        })

    }

    requestQueueAdd(fileQueueItem) {
        let _this = this
        for (let i = 0; i < fileQueueItem.chunks; i++) {
            _this.requestQueue.add(async ({signal}) => {
                if(signal.aborted){
                    return
                }

                const formData = new FormData();
                formData.append("task_id", fileQueueItem.taskId)
                formData.append("chunk", i)
                const start = i * _this.chunkSize;
                const end = start + _this.chunkSize;
                const sliceBlob = fileQueueItem.file.slice(start, end);
                formData.append('file', sliceBlob); // 替换为你的文件路径
                const req = _this.client.quiet().apiRequest({
                    url:"/upload",
                    method:"post",
                    headers: {
                        'Content-Encoding': 'multipart/form-data'
                    },
                    signal: signal
                    },formData)

                try {
                     await req.then(function (res){
                         fileQueueItem.chunksCompleted.push(i)
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
                     })
                } catch (error) {
                    if (!(error instanceof CancelError)) {
                        fileQueueItem.errorMessage = error.message
                    }
                }finally {
                    _this.triggerEventFileQueueChange(fileQueueItem)
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

    fileQueueRemove(index){
        if(this.fileQueue.length <= index){
            return
        }
        this.fileQueue[index].controller.abort("")
        this.fileQueue.splice(index,1)

        this.triggerEventFileQueueChange()
        this.triggerEventUploadFinished(true)
    }

}

