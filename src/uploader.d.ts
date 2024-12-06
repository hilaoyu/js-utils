
export interface fileQueueItem {
	file:File,
	taskId:String,
	chunks:number,
	chunksCompleted:Array<number>,
	chunksCompletedPercent:number,
	uploadCompleted:boolean,
	previewUrl:string,
	errorMessage:string,
	controller:AbortController,
	remove():void
}

export class Uploader  {
	constructor(serverUrl:string,autoStart:boolean)
	setServerUrl(url:string):void
	setFileLimitMaxSize(v:number):void
	setFileLimitAllowExt(v:Array<string>):void
	setChunkSize(v:number):void
	setLimitMaxThreads(v:number):void
	isReady():boolean
	selectFile(multiple:boolean,allowExt?:Array<string>):void
	addFile(file:File):void
	getFileQueue():Array<fileQueueItem>
	setEventOnError(callback:(err:Error) => void):void
	setEventOnUploadFinished(callback:(completedTaskIds:Array<string>,uncompletedTaskIds:Array<string>) => void):void
	setEventOnFileQueueChange(callback:(queue:Array<fileQueueItem>,changedIndex?:number) => void):void
	startUpload():void
	pauseUpload():void
	clear():void
	fileQueueRemove(index:number):void
}

