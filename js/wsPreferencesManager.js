var wsPreferencesEnum = {
    userEmail: { key: 'email', defValue: '' },
    userPassword: { key: 'password', defValue: '' },
    pluginState: { key: 'pluginState', defValue: 0 },
    sourceLanguage: { key: 'sourceLanguage', defValue: 'en' },
    targetLanguage: { key: 'targetLanguage', defValue: 'ru' },
    currentDict: { key: 'currentDict', defValue: 0 },
    alertErrors: { key: 'alertErrors', defValue: false },
    lastLogin: { key: 'lastLogin', defValue: '' }
};

wsPreferencesManager = {
    setStringPreference: function (preference, value) {
        localStorage[preference.key] = value;
    },
    getStringPreference: function (preference) {
        var result = localStorage[preference.key];
        return result == undefined ? preference.defValue : result;
    },
    setBoolPreference: function (preference, value) {
        localStorage[preference.key] = value;
    },
    getBoolPreference: function (preference) {
        var result = localStorage[preference.key];
        if (result != undefined && result.constructor == String) {
            result = result.toLowerCase();
            result = result == "true" || result == "1"; // string to bool convertion
        }
        return result == undefined ? preference.defValue : result;
    },
    setIntPreference: function (preference, value) {
        localStorage[preference.key] = value;
    },
    getIntPreference: function (preference) {
        var result = localStorage[preference.key];
        if (result != undefined && result.constructor == String) {
            result = parseInt(result);
        }
        return result == undefined ? preference.defValue : result;
    },
    resetPreference: function (preference) {
        delete localStorage[preference.key];
    }
};