
export interface fileQueueItem {
	file:File,
	taskId:String,
	customId:any,
	chunks:number,
	chunksCompleted:Array<number>,
	chunksCompletedMap?:Record<string, any>,
	chunksCompletedPercent:number,
	uploadCompleted:boolean,
	url:string,
	errorMessage:string,
	controller:AbortController,
	remove():void
}

export interface UploadResumeOptions {
	taskId:string,
	chunksCompleted?:Record<string, any>|Array<number>,
	customId?:any
}

export class Uploader  {
	constructor(serverUrl:string,autoStart:boolean)
	setServerUrl(url:string):void
	setFileLimitMaxSize(v:number):void
	setFileLimitAllowExt(v:Array<string>):void
	setChunkSize(v:number):void
	setLimitMaxThreads(v:number):void
	isReady():boolean

	selectFile(multiple:boolean,clearQueue?:boolean,customId?:any,allowExt?:Array<string>):void
	addFile(file:File,clearQueue?:boolean,customId?:any,resumeOptions?:UploadResumeOptions):void
	resumeFile(file:File,resumeOptions:UploadResumeOptions):void

	getFileQueue():Array<fileQueueItem>
	setEventOnError(callback:(err:Error) => void):void
	setEventOnUploadFinished(callback:(completedUrls:Array<string>) => void):void
	setEventOnFileQueueChange(callback:(queue:Array<fileQueueItem>,changedIndex?:number) => void):void
	startUpload():void
	pauseUpload():void
	clear():void
	fileQueueRemove(taskId:string):void
}
