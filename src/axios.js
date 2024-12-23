import {AxiosError,default as axiosOrg } from 'axios'
import Utils from "./utils";
import Url from "url";
let axiosGlobalMessageHandle = null
let axiosGlobalBaseUrl = ''

export function setAxiosGlobalMessageHandle(callback) {
    axiosGlobalMessageHandle = callback
}

export function setAxiosGlobalBaseUrl(uri) {
    setAxiosGlobalBaseUrl = uri
}

let axiosGlobalLoadingServiceHandle = null

export function setAxiosGlobalLoadingServiceHandle(loadingService) {
    axiosGlobalLoadingServiceHandle = loadingService
}

function extendAxios(_axios) {
    _axios.defaults.timeout = 0
    _axios.promiseRejectError = (error) => {
        if (!Utils.typeIs('object', error)) {
            error = new AxiosError()
        }
        let msg = Utils.valueGet(error, 'response.data.message', '')
        if ('CSRF token mismatch.' === msg) {
            msg = '页面已过期，请刷新重试';
        } else if ('Unauthenticated.' === msg) {
            msg = '权限不足!'
        }
        if (!Utils.isEmpty(msg)) {
            error.message += ":" + msg
        }

        let errors = Utils.valueGet(error, 'response.data.errors', {})
        if (!Utils.isEmpty(errors)) {
            error.message += ":" + Utils.joinToString(errors, "<br>")
        }
        if (true !== _axios.requestIsQuiet) {
            _axios.message(error.message, 'error')
        }
        return Promise.reject(error);
    }
    _axios.buildAxiosRequestConfig = (reqConfig, data, headers, method)=> {
        let axiosReqConfig
        if (Utils.typeIs('string', reqConfig)) {
            axiosReqConfig.url = reqConfig
        } else {
            axiosReqConfig = Object.assign({}, reqConfig)
        }
        if (!Utils.isEmpty(method) && Utils.typeIs('string', method)) {
            axiosReqConfig.method = method.toUpperCase()
        }
        if (Utils.isEmpty(axiosReqConfig.method)) {
            axiosReqConfig.method = 'GET'
        }

        if (Utils.isEmpty(axiosReqConfig.url)) throw new AxiosError(
            '地址不能为空',
            null,
            null,
            null,
            null,
        );

        if (!Utils.isUndefined(data)) {
            if (['PUT', 'POST', 'PATCH'].includes(axiosReqConfig.method.toUpperCase())) {
                axiosReqConfig.data = data
            } else {
                axiosReqConfig.url = Utils.buildUrl(axiosReqConfig.url, data)
                //axiosReqConfig.params = data
            }
        }
        if (!Utils.isEmpty(headers)) {
            axiosReqConfig.headers = Object.assign(axiosReqConfig.headers, headers)
        }

        return axiosReqConfig
    }


    _axios.interceptorsResponseSuccess = async (response) => {
        _axios.tryCloseLoading()
        if (!Utils.valueGet(response, 'config.isApiRequest', false)) {
            return response
        }
        let res_data = Utils.valueGet(response, 'data', null);
        let axiosError = new AxiosError(
            '~',
            null,
            response.config,
            response.request,
            response,
        );
        if (!res_data) {
            axiosError.message = "返回数据为空"
            return Promise.reject(axiosError)
        }

        let res_code = Utils.valueGet(res_data, 'code', 0);
        res_code = parseInt(res_code)
        switch (res_code) {
            case 20301:
                let redirectUrl = Utils.valueGet(res_data, 'redirect_url', Utils.valueGet(res_data, 'data.redirect_url', Utils.valueGet(res_data, 'data', '')));
                if (redirectUrl && Utils.typeIs('string', redirectUrl)) {
                    window.location.href = redirectUrl;
                    return null;
                }
                break;
            case 20302:
                let forward_url = Utils.valueGet(res_data, 'data.forward_url', ''),
                    forward_headers = Utils.valueGet(res_data, 'data.forward_headers', {}),
                    forward_params = Utils.valueGet(res_data, 'data.forward_params', {}),
                    forward_method = Utils.valueGet(res_data, 'data.forward_method', 'POST'),
                    forward_return_api = Utils.valueGet(res_data, 'data.forward_return_api', ''),
                    forward_return_method = Utils.valueGet(res_data, 'data.forward_return_method', ''),
                    originalHeaders = Utils.valueGet(response, 'config.headers', {}), // 第一次请求后端的参数数据
                    originalParams = Utils.valueGet(response, 'config.params', {}), // 第一次请求后端的参数数据
                    originalData = Utils.valueGet(response, 'config.data', {}); // 第一次请求后端的参数数据

                if (Utils.typeIs('string', originalParams)) {
                    try {
                        originalParams = JSON.parse(originalParams)
                    } catch (e) {
                        originalParams = {}
                    }
                }
                if (Utils.typeIs('string', originalData)) {
                    try {
                        originalData = JSON.parse(originalData)
                    } catch (e) {
                        originalData = {}
                    }
                }
                if (!forward_url || !forward_return_api) {
                    axiosError.message = "转发地址错误"
                    return Promise.reject(axiosError);
                }

                let forward_use_params = true;

                if (['PUT', 'POST', 'PATCH'].includes(forward_method.toUpperCase())) {
                    forward_use_params = false;
                }

                res_data = await _axios.request({
                    url: forward_url,
                    method: forward_method,
                    params: forward_use_params ? forward_params : null,
                    data: forward_use_params ? null : forward_params,
                    headers: forward_headers,
                });

                if (['PUT', 'POST', 'PATCH'].includes(forward_return_method.toUpperCase())) {
                    originalData = Object.assign({}, originalData, {forward_return_result: res_data});
                } else {
                    originalParams = Object.assign({}, originalParams, {forward_return_result: res_data});
                }
                res_data = await _axios.request({
                    url: forward_return_api,
                    method: forward_return_method,
                    params: originalParams,
                    data: originalData,
                    headers: originalHeaders,
                });
                break;
        }

        let res_status = Utils.valueGet(res_data, 'status', false);

        if (true !== res_status) {
          return Promise.reject(axiosError);
        }
        return res_data;
    }
    _axios.interceptorsResponseError = (error) => {
        _axios.tryCloseLoading()
        return _axios.promiseRejectError(error);
    }
    _axios.interceptorsRequestBefore = async (config) => {

        let token = document.head.querySelector('meta[name="csrf-token"]');
        //laravel csrf-token
        if (token) {
            config.headers['X-CSRF-TOKEN'] = token.content;
        }

        if (true === Utils.valueGet(config,"isApiRequest",false)) {
            config.headers['X-Requested-With'] = 'XMLHttpRequest'
        }

        let urlParse = Url.parse(config.url)
        if (Utils.isEmpty(urlParse.protocol) && Utils.isEmpty(config.baseURL) && !Utils.isEmpty(axiosGlobalBaseUrl)) {
            config.baseURL = axiosGlobalBaseUrl
        }


        return config;
    }
    _axios.interceptorsRequestError = (error) => {
        _axios.tryCloseLoading()
        return _axios.promiseRejectError(error);
    }


    _axios.messageHandle = null
    _axios.setMessageHandle = (callback) => {
        let _i = _axios.create()
        extendAxios(_i)
        _i.messageHandle = callback
        return _i
    }
    _axios.message = (msg, type) => {
        if (Utils.typeIs('function', _axios.messageHandle)) {
            return _axios.messageHandle(msg, type)
        }

        if (Utils.typeIs('function', axiosGlobalMessageHandle)) {
            return axiosGlobalMessageHandle(msg, type)
        }

        let windowMessageHandle = Utils.valueGet(window, '_extendMessageHandle', null)
        if (Utils.typeIs('function', windowMessageHandle)) {
            return windowMessageHandle(msg, type)
        }
        alert(msg);
    }

    _axios.loadingService = null
    _axios.useLoading = (loadingService) => {
        let _i = _axios.create()
        extendAxios(_i)
        if (Utils.isEmpty(loadingService)) {
            loadingService = axiosGlobalLoadingServiceHandle()
        }
        _i.loadingService = loadingService;
        return _i;
    }
    _axios.tryCloseLoading = () => {
        if (Utils.isEmpty(_axios.loadingService)) {
            return;
        }
        try {
            _axios.loadingService.close();
        } catch (e) {

        }
    }

    _axios.requestIsQuiet = false
    _axios.quiet = (isQuiet) => {
        let _i = _axios.create()
        extendAxios(_i)
        _i.requestIsQuiet = !!isQuiet
        return _i
    }
    _axios.withBaseUrl = (uri) => {
        let _i = _axios.create()
        extendAxios(_i)
        _i.defaults.baseURL = uri
        return _i
    }


    _axios.apiRequest = async (reqConfig, data) => {
        let axiosReqConfig

        try {
            axiosReqConfig = _axios.buildAxiosRequestConfig(reqConfig, data)
        } catch (error) {
            return _axios.interceptorsRequestError(error)
        }

        axiosReqConfig.isApiRequest = true
        return _axios.request(axiosReqConfig)
    }
    _axios.apiPost = async (url, data, reqConfig) => {
        let axiosReqConfig
        try {
            axiosReqConfig = _axios.buildAxiosRequestConfig(reqConfig)
        } catch (error) {
            return _axios.interceptorsRequestError(error)
        }
        axiosReqConfig.isApiRequest = true
        return _axios.post(url, data, reqConfig)
    }
    _axios.apiPatch = async (url, params, reqConfig) => {
        let axiosReqConfig
        try {
            axiosReqConfig = _axios.buildAxiosRequestConfig(reqConfig)
        } catch (error) {
            return _axios.interceptorsRequestError(error)
        }
        axiosReqConfig.isApiRequest = true
        return _axios.patch(Utils.buildUrl(url, params), reqConfig)
    }
    _axios.apiGet = async (url, params, reqConfig) => {
        let axiosReqConfig
        try {
            axiosReqConfig = _axios.buildAxiosRequestConfig(reqConfig)
        } catch (error) {
            return _axios.interceptorsRequestError(error)
        }
        axiosReqConfig.isApiRequest = true
        return _axios.get(Utils.buildUrl(url, params), reqConfig)
    }
    _axios.apiDelete = async (url, params, reqConfig) => {
        let axiosReqConfig
        try {
            axiosReqConfig = _axios.buildAxiosRequestConfig(reqConfig)
        } catch (error) {
            return _axios.interceptorsRequestError(error)
        }
        axiosReqConfig.isApiRequest = true
        return _axios.delete(Utils.buildUrl(url, params), reqConfig)
    }


    _axios.interceptors.request.use(function (config) {
        // 在发送请求之前做些什么
        return _axios.interceptorsRequestBefore(config);
    }, function (error) {
        // 对请求错误做些什么
        return _axios.interceptorsRequestError(error)
    });

    _axios.interceptors.response.use(function (response) {

        return _axios.interceptorsResponseSuccess(response)

    }, function (error) {
        return _axios.interceptorsResponseError(error)
    });
}

export function newAxios(){
    let axios = axiosOrg.create()
    extendAxios(axios)
    return axios
}

export const axios = newAxios()
extendAxios(axios)



export default axios