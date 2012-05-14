// Visual studio auto-complete reference.
/// <reference path="/wsModels.js">
/// <reference path="/jquery_1.5.min.js">

var wsLoginWindow = {
    onLoad: function () {

        $("#signin").click(function(){
            wsLoginWindow.login();
        });

        $("#password").keypress(function(){
            wsLoginWindow.enterEvent(event);
        });

        $("#email").keypress(function(){
            wsLoginWindow.enterEvent(event);
        });

        /*$("#remember").click(function(){
            //document.getElementById('remember').checked = !document.getElementById('remember').checked;
        });*/

        $("#create-account").click(function(){
            wsLoginWindow.createNewAccount();
        });

        $("#logo").click(function(){
            wsLoginWindow.wordStepsLinkClick();
        });

        $("#email").val(wsPreferencesManager.getStringPreference(wsPreferencesEnum.lastLogin));

        wsEventManager.subscript(wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        this.onIsBusyChanged(wsPluginStateManager.getIsBusy());

        //var state = wsPreferencesManager.getIntPreference(wsPreferencesEnum.pluginState);
        //wsPluginStateManager.setState(state);
    },
    onUnload: function () {
        wsEventManager.unscript(wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
    },
    onIsBusyChanged: function (newValue) {
        $('#busyIndicator').css('display', newValue ? 'block' : 'none');
    },
    createNewAccount: function () {
        window.open("http://wordsteps.com/register/");
    },
    enterEvent: function (e) {
        if (e.keyCode == 13) {
            this.login();
        }
    },
    clearError: function () {
        $('#error').html('');
    },
    setError: function (text) {
        $('#error').html(text);
    },
    wordStepsLinkClick: function () {
        window.open("http://wordsteps.com/");
    },
    login: function () {
        this.clearError();

        var email = $("#email").val().trim();
        if (email == '') {
            this.setError('Please enter your email.');
            return;
        }
        var password = $("#password").val().trim();
        if (password == '') {
            this.setError('Please enter your password.');
            return;
        }
        var remember = document.getElementById("remember").checked;
        if(!chrome.extension.inIncognitoContext) {
            wsPreferencesManager.setStringPreference(wsPreferencesEnum.lastLogin, email);
        }

        wsUserManager.signIn(email, password, remember, function (response) {
            var resp = response.response;
            var error = response.error;
            if (resp) {
                wsOverlay.openMainWindow();
                window.close();
            } else if (error) {
                if (error.error_code == wsAPIErrorsEnum.invalidLoginPassword) {
                    wsLoginWindow.setError('Incorrect email or password.');
                } else {
                    wsLoginWindow.setError('Unable to connect to the server. Please try again.');
                }
            }
        });
    },
};

window.addEventListener("load", function () { wsLoginWindow.onLoad(); }, false);
window.addEventListener("unload", function () { wsLoginWindow.onUnload(); }, false);

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