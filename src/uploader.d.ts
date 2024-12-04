import {AxiosExStatic} from "./axios";
import pQueue from "p-queue";

export interface fileQueueItem {
	file:File,
	taskId:String,
	chunks:number,
	chunksCompleted:Array<number>,
	chunksCompletedPercent:number,
	uploadCompleted:boolean,
	previewUrl:boolean,
	error:string,
	controller:AbortController,
	remove():void
}

export class Uploader  {
	serverUrl:string
	fileLimitMaxSize:number
	fileLimitAllowExt:Array<string>
	chunkSize:number
	limitMaxThreads:number
	client:AxiosExStatic
	fileQueue:Array<fileQueueItem>
	requestQueue:pQueue
	constructor(serverUrl:string,autoStart:boolean)
	setServerUrl(url:string):void
	setFileLimitMaxSize(v:number):void
	setFileLimitAllowExt(v:Array<string>):void
	setChunkSize(v:number):void
	setLimitMaxThreads(v:number):void
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

