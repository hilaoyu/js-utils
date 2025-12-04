import Utils from "./utils";

export const Display = {
    widths: {
        "xs": 0,
        "sm": 768,
        "md": 992,
        "lg": 1200,
        "xl": 1920
    },
    typeWidth: function (type) {
        return Utils.valueGet(this.widths, type, 0)
    },
    windowWidth: function () {
        return window.innerWidth;
    },
    prevType: function (type) {
        var types = keys(this.widths);
        for (var i = 0; i < types.length; i++) {
            if (type == types[i]) {
                return Utils.valueGet(types, i - 1);
            }
        }
        return null;
    },
    nextType: function (type) {
        var types = keys(this.widths);
        for (var i = 0; i < types.length; i++) {
            if (type == types[i]) {
                return Utils.valueGet(types, i + 1);
            }
        }
        return null;
    },
    is: function (type) {
        if (type) {
            var flag = this.gt(type);
            var nextType = this.nextType(type)
            if (nextType) {
                flag = this.lt(nextType);
            }
            return flag;
        }

        for (var wt in this.widths) {
            if (this.lt(wt)) {
                break;
            }
            if (this.gt(wt)) {
                type = wt;
            }
        }
        return type;
    },
    lt: function (type) {
        return this.windowWidth() < this.typeWidth(type)
    },
    gt: function (type) {
        return this.windowWidth() >= this.typeWidth(type)
    }
}

export default Display