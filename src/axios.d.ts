import {AxiosResponse, AxiosRequestConfig, AxiosInstance} from "axios";
export function setAxiosGlobalMessageHandle(callback: CallableFunction): void;
export function setAxiosGlobalBaseUrl(uri: string): void;
export function setAxiosGlobalLoadingServiceHandle(callback: CallableFunction): void;

export declare interface AxiosExStatic extends AxiosInstance {
    useLoading(loadingService?: any): AxiosExStatic;


    tryCloseLoading(): void;

    quiet(isQuiet: boolean): AxiosExStatic;
    withBaseUrl(uri: string): AxiosExStatic;

    setMessageHandle(callback: CallableFunction): AxiosExStatic;

    buildAxiosRequestConfig(reqConfig : AxiosRequestConfig | Object | string ,data ?: object,headers ?: object,method ?: string):AxiosRequestConfig

    apiRequest(reqConfig : AxiosRequestConfig | Object,data ?: Object):Promise<AxiosResponse>
    apiPost(url : string ,data ?: object,reqConfig ?: AxiosRequestConfig | Object):Promise<AxiosResponse>
    apiPatch(url : string ,data ?: object,reqConfig ?: AxiosRequestConfig | Object):Promise<AxiosResponse>
    apiGet(url : string ,params ?: object,reqConfig ?: AxiosRequestConfig | Object):Promise<AxiosResponse>
    apiDelete(url : string ,params ?: object,reqConfig ?: AxiosRequestConfig | Object):Promise<AxiosResponse>

}
export function newAxios(): AxiosExStatic
export declare const axios: AxiosExStatic
export default axios