import {AxiosResponse,AxiosRequestConfig} from "axios";
export interface routeObject {
	uri:string,
	method:string,
}
export function setNotNotUseAuthToken(v: boolean): void;
export class LeRoute  {
	constructor()
	getRoute(routeName:string):routeObject
	buildReqConfig(routePath:any, urlParams?:object): AxiosRequestConfig
	quiet(isQuiet:boolean):LeRoute
	useLoading(loadingService?:any):LeRoute
	request(api:string|object, params?:object, headers?:object):Promise<AxiosResponse>
	buildUrl(api:string|object, params?:object):string
	redirect(api:string|object, params?:object, target?:string):void
}

export default LeRoute