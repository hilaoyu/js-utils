export interface UtilsStatic  {
	typeIs(type : string, obj : any): boolean;
	isUndefined(obj : any): boolean;
	isEmpty(obj : any): boolean;

	randomString(len : number, numOnly ?: boolean): string;

	base64En(data : any,urlSafe?: boolean): string;
	base64De(data : string): string;

	baseName(uri : string): string;
	uuid(): string;

	joinToString(obj : any, glue ?: string, withObjKey ?: boolean): string;
	valueGet(obj : any, key : string, defaultValue ?: any): any;

	timeCountDown(timeout : number, completedCallback ?: CallableFunction, progressCallback ?: CallableFunction, step ?: Number): void;

	timedRedirect(timeout : number, redirect : string, progressCallback ?: CallableFunction): void;
	runOnceInTime(callback : CallableFunction, time : number, timer ?: number): number;
	sleep(time : Number, func ?: CallableFunction): Promise<void>;

	listenKeyUp(key : string, tag : string, callback : CallableFunction): boolean;

	listenKeyUpRemove(key : string, tag : any): void;
	buildUrl(url : string, params ?: any): string;

	isUrl(str : string): boolean;
	inArray(needle : any, arr : Array<any>): boolean;

	formatDataTime(str : string): string;

	formatFileSize(value : number): string;
	urlGetQueryParameter(name : string): string;
}

export const Utils:UtilsStatic
export default Utils
