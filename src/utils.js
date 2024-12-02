import {v4 as uuidv4} from 'uuid';
import Url from 'url';
import {Base64} from 'js-base64';

export const Utils = {
    typeIs: function (type, obj) {
        type = String(type).toLowerCase();
        if ('array' == type) {
            return Array.isArray(obj);
        }
        return (typeof obj).toLowerCase() == type;
    },
    isUndefined: function (obj) {
        if (this.typeIs('undefined', obj)) {
            return true;
        }
        return false
    },
    isEmpty: function (obj) {
        if (this.typeIs('undefined', obj) || null === obj ) {
            return true;
        }
        if (this.typeIs('string', obj) ) {

            return String(obj).length <= 0;
        }
        if (this.typeIs('number', obj) ) {
            return isNaN(obj);
        }
        if (this.typeIs('array', obj) || this.typeIs('object', obj)) {

            return Object.values(obj).length <= 0;
        }
        return !obj
    },
    randomString: function (len, numOnly) {
        len = parseInt(len);
        if (len <= 0) {
            len = 6
        }
        /*****默认去掉了容易混淆的字符oOLl,gq,Vv,Uu,I****!*/
        let chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhjkmnprstwxyz0123456789';
        if (numOnly || false) {
            chars = '0123456789';
        }

        let maxPos = chars.length;
        let str = '';
        for (let i = 0; i < len; i++) {
            str += chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return str;
    },
    base64En: function (data, urlSafe) {
        return Base64.encode(data, urlSafe);
    },
    base64De: function (data) {
        return Base64.decode(data);
    },
    baseName: function (uri) {
        var idx = uri.lastIndexOf('/')
        idx = idx > -1 ? idx : uri.lastIndexOf('\\')
        if (idx < 0) {
            return uri
        }
        return uri.substring(idx + 1);
    },
    uuid: function () {
        let uuid = uuidv4();
        return uuid.replace(/-/g, '');
    },
    joinToString: function (obj, glue, withObjKey) {
        let strArr = [];
        if (this.typeIs('array', obj)) {
            strArr = obj;
        } else if (this.typeIs('object', obj)) {
            for (let i in obj) {
                let value = this.joinToString(obj[i], glue, withObjKey);
                if (true === withObjKey) {
                    value = i + ':' + value;
                }
                strArr.push(value);
            }
        } else {
            strArr.push(String(obj));
        }

        return strArr.join(glue);
    },
    valueGet: function (obj, key, defaultValue) {
        if (this.typeIs('undefined', defaultValue)) {
            defaultValue = null
        }

        if (this.isEmpty(obj)) {
            return defaultValue
        }
        if (!this.typeIs('object', obj) && !this.typeIs('array', obj)) {
            return defaultValue
        }

        let tempObj = obj;
        let arr = String(key).split(".");
        if (arr.length > 0 && (this.typeIs('array', tempObj) || this.typeIs('object', tempObj))) {

            for (let i = 0; i < arr.length; i++) {
                if (tempObj[arr[i]] == undefined) {
                    return defaultValue;
                } else {
                    tempObj = tempObj[arr[i]];
                }
            }
        }

        return !this.isEmpty(tempObj) ? tempObj : defaultValue;
    },
    timeCountDown: function (timeout, completedCallback, progressCallback, step) {
        let _this = this;
        timeout = parseInt(timeout) || 0;
        step = parseInt(step) || 1;
        if (step < 1) {
            step = 1;
        }
        if (timeout > 0) {
            if (this.typeIs("function", progressCallback)) {
                let isBreak = progressCallback(timeout);
                if (true === isBreak) {
                    return
                }
            }
            timeout -= step;
            setTimeout(function () {
                _this.timeCountDown(timeout, completedCallback, progressCallback, step)
            }, 1000 * step)
        } else {
            if (this.typeIs("function", completedCallback)) {
                completedCallback();
            }
        }
    },
    timedRedirect: function (timeout, redirect, progressCallback) {
        let _this = this;
        timeout = parseInt(timeout) || 0;
        if (timeout > 0) {
            if (this.typeIs("function", progressCallback)) {
                progressCallback(timeout)
            }
            timeout--;
            setTimeout(function () {
                _this.timedRedirect(timeout, redirect, progressSelector)
            }, 1000)

        } else {
            if (redirect) {
                window.location.href = redirect;
            }
        }
    },
    runOnceInTime: function (callback, time, timer) {
        if (!this.typeIs("function", callback)) {
            return false;
        }
        time = parseInt(time) || 500;
        if (timer || null) {
            clearTimeout(timer);
        }
        timer = setTimeout(function () {
            callback();
        }, time)

        return timer;
    },
    sleep: async function (time, func) {
        return new Promise(function (resolve, reject) {
            setTimeout(() => {
                if (func)
                    resolve(func())
            }, time);
        })
    },
    _keyUpEvents: {},
    _keyUpEventListened: false,
    listenKeyUp: function (key, tag, callback) {

        if (!this.typeIs('string', key)) {
            return false;
        }
        key = key.toLowerCase();
        if (!this.typeIs('string', tag)) {
            return false;
        }
        if (!this.typeIs('function', callback)) {
            return false;
        }
        //console.log('add:' + key +':'+tag)
        let events = this.valueGet(this._keyUpEvents, key, {});
        events[tag] = callback;
        this._keyUpEvents[key] = events;
        if (!this._keyUpEventListened) {
            let _this = this;
            window.addEventListener('keyup', function (event) {
                let code;
                if (event.key !== undefined) {
                    code = event.key.toLowerCase();
                }

                let events = _this.valueGet(_this._keyUpEvents, code, {});

                for (let i in events) {
                    events[i](event);
                }

            })
            this._keyUpEventListened = true;
        }

    },
    listenKeyUpRemove: function (key, tag) {
        //console.log('remove:' + key +':'+tag)

        if (!this.typeIs('string', key)) {
            return false;
        }
        key = key.toLowerCase();
        let events = this.valueGet(this._keyUpEvents, key, {});
        if (this.typeIs('string', tag) && '' != tag) {
            delete (events[tag]);
        } else {
            events = {}
        }

        this._keyUpEvents[key] = events;

    },
    buildUrl: function (uri, params) {
        if (this.typeIs('object', params)) {
            let urlParse = Url.parse(uri, true);
            let urlQuery = this.valueGet(urlParse, 'query', {})

            urlParse.query = Object.assign({}, urlQuery, params)
            urlParse.search = ''
            //console.log(urlParse);

            uri = urlParse.format()
        }

        return uri;
    },
    isUrl: function (str) {
        if (!this.typeIs('string', str)) {
            return false;
        }

        var strRegex = '^((https|http|ftp|rtsp|mms|wss|ws)://)'
            + '(([0-9a-z_!~*\'().&=+$%-]+: )?[0-9a-z_!~*\'().&=+$%-]+@)?' //ftp的user@
            + '(([0-9]{1,3}.){3}[0-9]{1,3}' // IP形式的URL- 199.194.52.184
            + '|' // 允许IP和DOMAIN（域名）
            + '([0-9a-z_!~*\'()-]+.)*' // 域名- www.
            + '([0-9a-z][0-9a-z-]{0,61})?[0-9a-z].' // 二级域名
            + '[a-z]{2,6})' // first level domain- .com or .museum
            + '(:[0-9]{1,4})?' // 端口- :80
            + '((/?)|' // a slash isn't required if there is no file name
            + '(/[0-9a-zA-Z_!~*\'().;?:@&=+$,%#-]+)+/?)$';
        var re = new RegExp(strRegex);
        return re.test(str);

    },
    inArray: function (needle, arr) {
        if (!this.typeIs('array', arr)) {
            return false;
        }

        return arr.indexOf(needle) > -1
    },
    formatDataTime: function (str) {
        let t = new Date(Date.parse(str))
        return t.getFullYear()
            + "-"
            + (t.getMonth() + 1).toString().padStart(2, '0')
            + "-"
            + t.getDate().toString().padStart(2, '0')
            + " "
            + t.getHours().toString().padStart(2, '0')
            + ":"
            + t.getMinutes().toString().padStart(2, '0')
            + ":"
            + t.getSeconds().toString().padStart(2, '0')
    },
    formatFileSize: function (value) {
        if (null == value || '' == value) {
            return "0 Bytes";
        }
        var unitArr = new Array("Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB");
        var index = 0;
        var srcsize = parseFloat(value);
        index = Math.floor(Math.log(srcsize) / Math.log(1024));
        var size = srcsize / Math.pow(1024, index);
        size = size.toFixed(2);//保留的小数位数
        return size + unitArr[index];
    },
    urlGetQueryParameter: function (name) {
        var params = location.search.slice(1).split('&');
        var result = "";
        params.forEach(function (param) {
            var components = param.split('=');
            if (components[0] === name) {
                result = components.slice(1).join('=');
            }
        });
        return result;
    }
}
export default Utils

