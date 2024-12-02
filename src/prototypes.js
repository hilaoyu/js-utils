if (typeof String.prototype.ltrim != 'function') {
    String.prototype.trim = function (char, type) {
        if (char) {
            if (type == 'left') {
                return this.replace(new RegExp('^\\' + char + '+', 'g'), '');
            } else if (type == 'right') {
                return this.replace(new RegExp('\\' + char + '+$', 'g'), '');
            }
            return this.replace(new RegExp('^\\' + char + '+|\\' + char + '+$', 'g'), '');
        }
        return this.replace(/^\s+|\s+$/g, '');
    };
}
if (typeof String.prototype.ltrim != 'function') {
    String.prototype.ltrim = function (char) {
        return this.trim(char, 'left')
    };
}
if (typeof String.prototype.rtrim != 'function') {
    String.prototype.rtrim = function (char) {
        return this.trim(char, 'right')
    };
}
if (typeof String.prototype.upperFirst != 'function') {
    String.prototype.upperFirst = function () {
        return this.slice(0, 1).toUpperCase() + this.slice(1);
    };
}
if (typeof String.prototype.camelToLine != 'function') {
    /**
     * 驼峰式转横线
     * @param str
     */
    String.prototype.camelToLine = function () {
        let temp = this.replace(/[A-Z]/g, function (match) {
            return "-" + match.toLowerCase();
        });
        if (temp.slice(0, 1) === '-') { //如果首字母是大写，执行replace时会多一个-，这里需要去掉
            temp = temp.slice(1);
        }
        return temp;
    };
}
if (typeof String.prototype.lineToCamel != 'function') {
    /**
     * 横线转驼峰式
     * @param str
     */
    String.prototype.lineToCamel = function (upperFirst) {
        let temp = this.replace(/([^\-])(?:\\\\-+([^\-]))/g, function ($0, $1, $2) {
            return $1 + $2.toUpperCase();
        });
        if (true === upperFirst) {
            temp = temp.upperFirst()
        }
        return temp;
    };
}
if (typeof String.prototype.camelToLowerLine != 'function') {
    /**
     * 驼峰式转下横线
     * @param str
     */
    String.prototype.camelToLowerLine = function () {
        var temp = this.replace(/[A-Z]/g, function (match) {
            return "_" + match.toLowerCase();
        });
        if (temp.slice(0, 1) === '_') { //如果首字母是大写，执行replace时会多一个_，这里需要去掉
            temp = temp.slice(1);
        }
        return temp;
    };
}
if (typeof String.prototype.lowerLineToCamel != 'function') {
    /**
     * 下横线转驼峰式
     * @param str
     */
    String.prototype.lowerLineToCamel = function (upperFirst) {
        let temp = this.replace(/([^_])(?:_+([^_]))/g, function ($0, $1, $2) {
            return $1 + $2.toUpperCase();
        });
        if (true === upperFirst) {
            temp = temp.upperFirst();
        }
        return temp;
    }
}

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (prefix) {
        return this.slice(0, prefix.length) === prefix;
    };
}
