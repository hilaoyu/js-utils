import Utils from './utils'

const storageKeyLeClientSource = "LeClientSource"
const storageKeyAuthLoggedUser = "authLoggedUser"
const storageKeyAuthToken = "authToken"

export const StorageUtil = {
    serializeValue: function (value) {
        try {
            return JSON.stringify(value);
        } catch (e) {
            console.error(e)
        }
        return '';
    },
    unSerializeValue: function (value) {
        try {
            return JSON.parse(value)
        } catch (e) {
            console.error(e)
        }
        return null;
    },
    sessionSet: function (key, value) {
        if (!(key && Utils.typeIs('string', key))) {
            return false;
        }

        try {
            window.sessionStorage.setItem(key, this.serializeValue(value));
            return true
        } catch (e) {
            console.error(e)
        }

        return false
    },
    sessionGet: function (key) {
        if (!(key && Utils.typeIs('string', key))) {
            return null;
        }

        return this.unSerializeValue(window.sessionStorage.getItem(key));
    },
    sessionRemove: function (key) {
        if (!(key && Utils.typeIs('string', key))) {
            return false;
        }
        window.sessionStorage.removeItem(key);
        return true;
    },
    sessionClear: function () {
        window.sessionStorage.clear();
        return true;
    },
    localSet: function (key, value) {
        if (!(key && Utils.typeIs('string', key))) {
            return false;
        }

        try {
            window.localStorage.setItem(key, this.serializeValue(value));
            return true
        } catch (e) {
            console.error(e)
        }

        return false
    },
    localGet: function (key) {
        if (!(key && Utils.typeIs('string', key))) {
            return null;
        }
        return this.unSerializeValue(window.localStorage.getItem(key));
    },
    localRemove: function (key) {
        if (!(key && Utils.typeIs('string', key))) {
            return false;
        }
        window.localStorage.removeItem(key);
        return true;
    },
    localClear: function () {
        window.localStorage.clear();
        return true;
    },
    setClientSource: function () {
        let source = this.getClientSource();
        if (!source) {
            source = Utils.uuid();
            this.sessionSet(storageKeyLeClientSource, source);
        }
        return source;
    },
    getClientSource: function () {
        return this.sessionGet(storageKeyLeClientSource);
    },
    removeClientSource: function () {
        return this.sessionRemove(storageKeyLeClientSource);
    },

    saveAuthInfo: function (user, token) {
        if (!Utils.isEmpty(user)) {
            this.sessionSet(storageKeyAuthLoggedUser, user)
        }
        if (!Utils.isEmpty(token)) {
            this.sessionSet(storageKeyAuthToken, token)
        }
    },
    clearAuthInfo: function () {
        this.sessionRemove(storageKeyAuthLoggedUser)
        this.sessionRemove(storageKeyAuthToken)
    },
    getAuthUser: function (key, defaultValue) {
        let user = this.sessionGet(storageKeyAuthLoggedUser);
        if (Utils.typeIs('string', key) && '' !== key) {
            return Utils.valueGet(user, key, defaultValue)
        }
        return user
    },
    getAuthToken: function (key, defaultValue) {
        let token = this.sessionGet(storageKeyAuthToken);
        if (Utils.typeIs('string', key) && '' !== key) {
            return Utils.valueGet(token, key, defaultValue)
        }
        return token
    }
}

export default StorageUtil