// Visual studio auto-complete reference.
/// <reference path="/wsModels.js">
/// <reference path="/jquery_1.5.min.js">

var bg = chrome.extension.getBackgroundPage();

var wsLoginWindow = {
    onLoad: function () {
        if (bg == null) {
            window.close();
            return;
        }

        $("title").html(chrome.i18n.getMessage("settingTitle"));
        $("#signin").val(chrome.i18n.getMessage("sign"));

        $("#signin").click(function () {
            wsLoginWindow.login();
        });

        $("#password").keypress(function () {
            wsLoginWindow.enterEvent(event);
        });

        $("#email").keypress(function () {
            wsLoginWindow.enterEvent(event);
        });

        /*$("#remember").click(function(){
        //document.getElementById('remember').checked = !document.getElementById('remember').checked;
        });*/

        $("#create-account").click(function () {
            wsLoginWindow.createNewAccount();
        });

        $("#logo").click(function () {
            wsLoginWindow.wordStepsLinkClick();
        });

        $("#email").val(bg.wsPreferencesManager.getStringPreference(bg.wsPreferencesEnum.lastLogin));

        bg.wsEventManager.subscript(bg.wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        this.onIsBusyChanged(bg.wsPluginStateManager.getIsBusy());

    },
    onUnload: function () {
        bg.wsEventManager.unscript(bg.wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
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
            this.setError(chrome.i18n.getMessage("enterEmail"));
            return;
        }
        var password = $("#password").val().trim();
        if (password == '') {
            this.setError(chrome.i18n.getMessage("enterPassword"));
            return;
        }

        var remember = document.getElementById("remember").checked;

        if (!chrome.extension.inIncognitoContext) {
            bg.wsPreferencesManager.setStringPreference(bg.wsPreferencesEnum.lastLogin, email);
        }

        bg.wsUserManager.signIn(email, password, remember, function (response) {
            var resp = response.response;
            var error = response.error;
            if (resp) {
                //bg.wsOverlay.openMainWindow();
                //window.close();
                noty({ text: chrome.i18n.getMessage("success"),
                    theme: 'noty_theme_twitter',
                    type: 'success'
                });
            } else if (error) {
                if (error.error_code == bg.wsAPIErrorsEnum.invalidLoginPassword) {
                    wsLoginWindow.setError(chrome.i18n.getMessage("incorrect"));
                } else {
                    wsLoginWindow.setError(chrome.i18n.getMessage("unable2Connect"));
                }
            }
        });
    }
}

window.addEventListener("load", function () { wsLoginWindow.onLoad(); }, false);
window.addEventListener("unload", function () { wsLoginWindow.onUnload(); }, false);