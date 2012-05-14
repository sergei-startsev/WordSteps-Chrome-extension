$(document).ready(function () {
    var email = wsPreferencesManager.getStringPreference(wsPreferencesEnum.userEmail);
    var password = wsPreferencesManager.getStringPreference(wsPreferencesEnum.userPassword);
    var state = wsPreferencesManager.getIntPreference(wsPreferencesEnum.pluginState);

    if (state != wsPluginStateEnum.LOGGED_OUT && email != "" && password != "") {
        wsUserManager.signIn(email, password, true, function (response) {
            if (response.response) {
                wsPluginStateManager.setState(state);
            }
        });
    }
});