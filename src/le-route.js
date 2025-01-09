import Utils from './utils'
import {axios, AxiosError, newAxios} from './axios'
import StorageUtil from './storage'

const storageKeyRouteCacheId = "LeRouteCacheId"
const storageKeyLeServiceRoutes = "LeServiceRoutes"


const globalRouteCacheId = Utils.valueGet(window, "LeServiceRouteCacheId", "")
const globalHasServiceRoutes = () => {
    return !Utils.isUndefined(window.LeServiceRoutes);
}
const globalServiceRoutes = Utils.valueGet(window, 'LeServiceRoutes', {})
const globalRoutesApi = Utils.valueGet(window, 'LeServiceRoutesApi', false)
const globalRouteApi = Utils.valueGet(window, 'LeServiceRouteApi', false)


const sessionIsChanged = () => {
    let cacheSessionId = StorageUtil.localGet(storageKeyRouteCacheId)
    if (globalRouteCacheId && globalRouteCacheId !== cacheSessionId) {
        StorageUtil.localSet(storageKeyRouteCacheId, globalRouteCacheId)
        return true
    }
    return false
}

const cacheGetLeServiceRoutes = () => {
    let leServiceRoutes = StorageUtil.localGet(storageKeyLeServiceRoutes)
    if (!leServiceRoutes || !Utils.typeIs('object', leServiceRoutes)) {
        leServiceRoutes = {}
    }

    return leServiceRoutes
}
const cacheSetLeServiceRoutes = (routes) => {
    StorageUtil.localSet(storageKeyLeServiceRoutes, routes)
    return routes
}
const cacheSetLeServiceRoute = (routeName, route) => {
    let leServiceRoutes = cacheGetLeServiceRoutes()
    leServiceRoutes[routeName] = route
    cacheSetLeServiceRoutes(leServiceRoutes)
    return leServiceRoutes
}

const cacheGetLeServiceRoute = (routeName) => {
    return Utils.valueGet(cacheGetLeServiceRoutes(), routeName)
}

const cacheClearLeServiceRoutes = () => {
    StorageUtil.localRemove(storageKeyLeServiceRoutes)
}

let notNotUseAuthToken = false

export function setNotNotUseAuthToken(v) {
    notNotUseAuthToken = !!v
}

const isNotNotUseAuthToken = function (){
    return notNotUseAuthToken
}

class leRouteClass {
    _quiet
    _loadingService

    constructor() {
        if (sessionIsChanged()) {
            cacheClearLeServiceRoutes()
        }
        if (globalHasServiceRoutes()) {
            cacheSetLeServiceRoutes(globalServiceRoutes)
            return
        }

        if (!!globalRoutesApi) {
            axios.quiet(true).apiGet(globalRoutesApi).then(function (res) {
                cacheSetLeServiceRoutes(Utils.valueGet(res, 'data', {}))
            });
        }

    }

    getRoute(routeName) {

        if (!Utils.typeIs('string', routeName)
            || Utils.isEmpty(routeName)
        ) {
            return null
        }
        let leServiceRoutes = cacheGetLeServiceRoutes()

        let route = null

        if (routeName?.includes('/')) {
            route = {
                uri: routeName,
                method: "GET"
            }
        } else if (routeName in leServiceRoutes) {
            route = leServiceRoutes[routeName]
        } else if (!!globalRouteApi) {
            let requestReturned = false
            axios.quiet(true).apiGet(globalRouteApi, {name: routeName}).then(function (res) {
                route = Utils.valueGet(res, 'data', {})
                cacheSetLeServiceRoute(routeName, route)
            }).finally(function () {
                requestReturned = true
            })

            Utils.timeCountDown(180, null, function () {
                return requestReturned
            }, 1)
        }

        if (!route || !Utils.typeIs('object', route)) {
            return null
        }

        return route
    }

    buildReqConfig(routePath, urlParams) {
        urlParams = Object.assign({}, urlParams)
        let route = null;
        if (Utils.typeIs('object', routePath)) {
            route = routePath;
        } else if (Utils.typeIs('string', routePath)) {
            route = this.getRoute(routePath);
        }
        if (!route) {
            return null
        }
        let uri = Utils.valueGet(route, 'uri')
        let method = Utils.valueGet(route, 'method', 'GET')
        if (!Utils.typeIs('string', method)) {
            method = 'GET'
        }

        if (!uri || !Utils.typeIs('string', uri)) {
            return null
        }

        let paraReg = new RegExp(/[\{\:\*]+([^\/]+)/, 'g');
        let paraModReg = new RegExp(/[\*\?\:]/, 'g');
        uri = uri.replace(paraReg, function (para, paraKey) {
            paraKey = paraKey.replace(paraModReg, '')
            let paraValue = Utils.valueGet(urlParams, paraKey, '-');
            if (!['PUT', 'POST', 'PATCH'].includes(method.toUpperCase())){
                delete urlParams[paraKey]
            }
            return paraValue
        });

        return {url: Utils.buildUrl(uri, urlParams), method: method, data: urlParams}

    }

    quiet(isQuiet) {
        this._quiet = isQuiet
        return this
    }


    useLoading(loadingService) {
        this._loadingService = loadingService;
        return this
    }

    request(api, params, headers) {
        let _this = this;

        let data = Object.assign({}, params)
        let reqConfig = this.buildReqConfig(api, params);
        if (!reqConfig) {
            return Promise.reject(new AxiosError("路由错误"))
        }
        if (!!headers) {
            headers = {}
        }

        if (!isNotNotUseAuthToken()){
            let tokenId = StorageUtil.getAuthToken('id', '');
            if(tokenId){
                headers['Authorization'] = 'Bearer ' + tokenId;
            }
        }

        let clientSource = StorageUtil.getClientSource()
        if(clientSource){
            headers['ClientSource'] = clientSource;
        }
        reqConfig.headers = headers


        let _axios = newAxios()
        if (this._loadingService) {
            _axios = _axios.useLoading(_this._loadingService)
        }


        return _axios.quiet(!!this._quiet).apiRequest(reqConfig)

    }

    buildUrl(api, params) {
        return Utils.valueGet(this.buildReqConfig(api, params), "url", "")
    }

    redirect(api, params, target) {
        let url = this.buildUrl(api, params);
        if (!url) {
            return;
        }
        Utils.linkClick(url, target)
    }
}

const LeRoute = new leRouteClass()
export default LeRoute
