// Visual studio auto-complete reference.
/// <reference path="/jquery_1.5.min.js">
/// <reference path="/StringFormat.js">
/// <reference path="/wsModels.js">

var wsOverlay = {
    initialize: function () {
        chrome.browserAction.onClicked.addListener(this.stateButtonClick);

        wsEventManager.subscript(wsPluginStateManager.stateChanged, this.onStateChanged);
        wsEventManager.subscript(wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        wsEventManager.subscript(wsSelectionDetector.selectionDetected, this.onSelectionDetected);
        wsEventManager.subscript(wsSelectionDetector.cancelSelectionDetected, this.onCancelSelectionDetected);
        this.onStateChanged(wsPluginStateManager.getState());
        this.onIsBusyChanged(wsPluginStateManager.getIsBusy());
    },
    initializeTabs: function () {
        chrome.windows.getAll({ populate: true }, function (windows) {
            for (var i in windows) {
                var window = windows[i];
                for (var j in window.tabs) {
                    var tab = window.tabs[j];

                    var request = "wsSelectionDetector.initialize(); wsTranslationPopup.initialize();";
                    chrome.tabs.sendRequest(tab.id, request);
                }
            }
        });
    },
    onStateChanged: function (newValue) {
        wsStatusButton.setImage(wsOverlay.getStateButtonImage(newValue));

        if (newValue == wsPluginStateEnum.ACTIVE && !wsPluginStateManager.getIsBusy()) {
            wsSelectionDetector.start();
        } else {
            wsSelectionDetector.stop();
        }
    },
    onIsBusyChanged: function (newValue) {
        wsStatusButton.setIsBusy(newValue);

        if (wsPluginStateManager.getState() == wsPluginStateEnum.ACTIVE && !newValue) {
            wsSelectionDetector.start();
        } else {
            wsSelectionDetector.stop();
        }
    },
    onSelectionDetected: function (text, x, y, source, tabId) {
        wsTranslationPopup.open(text, x, y, tabId);

        wsTranslator.setPhrase(text, source);
        wsPluginStateManager.setIsBusy(true);
        wsTranslator.getTranslate(function (response) {
            wsPluginStateManager.setIsBusy(false);
        });
    },
    onCancelSelectionDetected: function () {
        wsTranslationPopup.close();
    },
    getStateButtonImage: function (state) {
        switch (state) {
            case wsPluginStateEnum.ACTIVE: return "stateActiveImg";
            case wsPluginStateEnum.LOGGED_OUT: return "stateLoggedOutImg";
            case wsPluginStateEnum.DISABLED: return "stateDisabledImg";
            default: return "stateLoggedOutImg";
        }
    },
    stateButtonClick: function () {
        if (wsPluginStateManager.getIsBusy()) return;

        switch (wsPluginStateManager.getState()) {
            case wsPluginStateEnum.ACTIVE:
                wsOverlay.openMainWindow();
                break;

            case wsPluginStateEnum.LOGGED_OUT:
                wsOverlay.openLoginWindow();
                break;

            case wsPluginStateEnum.DISABLED:
                wsOverlay.openMainWindow();
                break;
        }
    },
    openMainWindow: function () {
        this.openWindow("html/wsMainWindow.html");
    },
    openLoginWindow: function () {
        this.openWindow("html/wsLoginWindow.html");
    },
    openWindow: function (url) {
        chrome.windows.getAll({ populate: true }, function (windows) {
            var findWindowTab = function () {
                var fullUrl = location.protocol + '//' + location.host + '/' + url;
                for (var i in windows) {
                    var window = windows[i];
                    for (var j in window.tabs) {
                        var tab = window.tabs[j];
                        if (tab.url.indexOf(fullUrl, 0) != -1) return tab;
                    }
                }
                return null;
            };
            var windowTab = findWindowTab();

            if (windowTab != null) {
                chrome.windows.update(windowTab.windowId, { focused: true });
                chrome.tabs.update(windowTab.id, { selected: true });
            } else {
                window.open(url);
            }
        });
    }
};

function Point(x, y) {
    this.x = x;
    this.y = y;
    this.squareLength = function () {
        return this.x * this.x + this.y * this.y;
    };
    this.toVector = function (endPoint) {
        return new Point(endPoint.x - this.x, endPoint.y - this.y);
    };
    this.toString = function () {
        return '{' + this.x + ' / ' + this.y + '}';
    };
};

var wsSelectionDetector = {
    isStarted: false,
    selectionDetected: [], // Event, args: 0 - text, 1 - x, 2 - y, 3 - tab id.
    cancelSelectionDetected: [], // Event, args: 0 - text, 1 - selection start point

    start: function () {
        this.isStarted = true;
    },
    stop: function () {
        this.isStarted = false;
    },
    onSelectionDetected: function (text, x, y, source, tabId) {
        if (!this.isStarted) return;

        wsEventManager.call(this.selectionDetected, text, x, y, source, tabId);
    },
    onCancelSelectionDetected: function () {
        wsEventManager.call(this.cancelSelectionDetected);
    }
};

var wsTranslationPopup = {
    openedInTab: null,

    open: function (phrase, x, y, tabId) {
        this.close();

        // configure translation popup template
        var popupTemplate = $('#wsTranslationPopup').html().trim();
        var sourceLangCode = encodeURIComponent(wsLanguagePair.getSourceLanguage().code);
        phrase = encodeURIComponent(phrase);
        popupTemplate = String.Format(popupTemplate, location.host, sourceLangCode, phrase);

        this.openedInTab = tabId;
        this.onOpened(x, y, popupTemplate);
    },
    close: function () {
        if (!this.isOpened()) return;

        wsTranslator.abortTranslate();

        this.onClosed();
        this.openedInTab = null;
    },
    onOpened: function (x, y, template) {
        var request = String.Format("wsTranslationPopup.onOpened({0}, {1}, {2});", x, y, JSON.stringify(template));
        chrome.tabs.sendRequest(this.openedInTab, request, function (response) {
            wsTranslationPopup.subscriptToEvents();
        });
    },
    onClosed: function () {
        var request = "wsTranslationPopup.onClosed();";
        chrome.tabs.sendRequest(this.openedInTab, request);

        this.unscriptToEvents();
    },
    subscriptToEvents: function () {
        wsEventManager.subscript(wsDictionaryRepository.currentDictionaryChanged, this.onCurrentDictionaryChanged);
        wsEventManager.subscript(wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        wsEventManager.subscript(wsTranslator.phraseChanged, this.onPhraseChanged);
        wsEventManager.subscript(wsTranslator.translateChanged, this.onTranslateChanged);
        wsEventManager.subscript(wsLanguagePair.sourceLanguageChanged, this.onSourceLanguageChanged);
        wsEventManager.subscript(wsLanguagePair.targetLanguageChanged, this.onTargetLanguageChanged);

        this.onCurrentDictionaryChanged(wsDictionaryRepository.getCurrentDictionary());
        this.onIsBusyChanged(wsPluginStateManager.getIsBusy());
        this.onPhraseChanged(wsTranslator.getPhrase());
        this.onTranslateChanged(wsTranslator.translate);
    },
    unscriptToEvents: function () {
        wsEventManager.unscript(wsDictionaryRepository.currentDictionaryChanged, this.onCurrentDictionaryChanged);
        wsEventManager.unscript(wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        wsEventManager.unscript(wsTranslator.phraseChanged, this.onPhraseChanged);
        wsEventManager.unscript(wsTranslator.translateChanged, this.onTranslateChanged);
        wsEventManager.unscript(wsLanguagePair.sourceLanguageChanged, this.onSourceLanguageChanged);
        wsEventManager.unscript(wsLanguagePair.targetLanguageChanged, this.onTargetLanguageChanged);
    },
    onCurrentDictionaryChanged: function (dict) {
        var request = String.Format("wsTranslationPopup.onCurrentDictionaryChanged({0});", JSON.stringify(dict));
        chrome.tabs.sendRequest(wsTranslationPopup.openedInTab, request);
    },
    onIsBusyChanged: function (newValue) {
        var request = String.Format("wsTranslationPopup.onIsBusyChanged({0});", newValue);
        chrome.tabs.sendRequest(wsTranslationPopup.openedInTab, request);
    },
    onPhraseChanged: function (phrase) {
        var request = String.Format("wsTranslationPopup.onPhraseChanged({0});", JSON.stringify(phrase));
        chrome.tabs.sendRequest(wsTranslationPopup.openedInTab, request);
    },
    onTranslateChanged: function (translate) {
        var request = String.Format("wsTranslationPopup.onTranslateChanged({0});", JSON.stringify(translate));
        chrome.tabs.sendRequest(wsTranslationPopup.openedInTab, request);
    },
    onSourceLanguageChanged: function (newValue) {
        wsPluginStateManager.setIsBusy(true);
        wsTranslator.getTranslate(function (response) {
            wsPluginStateManager.setIsBusy(false);
        });
    },
    onTargetLanguageChanged: function (newValue) {
        wsPluginStateManager.setIsBusy(true);
        wsTranslator.getTranslate(function (response) {
            wsPluginStateManager.setIsBusy(false);
        });
    },
    isOpened: function () {
        return this.openedInTab != null;
    },
    confirmPhrase: function (translate) {
        this.close();
        wsPhraseRepository.addPhrase(wsTranslator.getPhrase(), translate, wsTranslator.getSource(), function (response) {
            var error = response.error;

            if (error) {
                // TODO: view error msg
            }
        });
    }
};

var wsStatusButton = {
    width: 19,
    height: 19,
    currentImage: null,
    busyInterval: null,
    busyIndicatorsOffset: null,

    setImage: function (imgId) {
        this.currentImage = imgId;
        chrome.browserAction.setIcon({ imageData: this.getImageData() });
    },
    setIsBusy: function (value) {
        if (value) {
            this.busyIndicatorsOffset = 0;
            chrome.browserAction.setIcon({ imageData: this.getImageData() });
            this.busyInterval = window.setInterval(function () {
                chrome.browserAction.setIcon({ imageData: wsStatusButton.getImageData() });
            }, 100);
        } else {
            this.busyIndicatorsOffset = null;
            window.clearInterval(this.busyInterval);
            chrome.browserAction.setIcon({ imageData: this.getImageData() });
        }
    },
    getImageData: function () {
        var canvas = document.getElementById('stateButtonCanvas');
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (this.currentImage != null) {
            var img = document.getElementById(this.currentImage);
            if (img != null) {
                var y = this.busyIndicatorsOffset != null ? 0 : 1.5;
                context.drawImage(img, 0, 0, img.width, img.height, 1.5, y, img.width, img.height);
            }
        }

        if (this.busyIndicatorsOffset != null) {
            var offset = this.busyIndicatorsOffset;
            this.busyIndicatorsOffset++;
            if (this.busyIndicatorsOffset == 10) this.busyIndicatorsOffset = 0;

            var busyWidth = this.width * offset / 10;
            var busyHeight = 3;

            context.fillStyle = 'Green';
            context.fillRect(0, this.height - busyHeight, busyWidth, busyHeight)
        }

        return context.getImageData(0, 0, 19, 19);
    }
};

window.addEventListener("load", function () { wsOverlay.initialize(); wsOverlay.initializeTabs(); }, false);
chrome.extension.onRequest.addListener(function (request, sender, callback) {
    if (sender.id != location.host) return;
    var manualCallback = false;
    eval(request);
    if (!manualCallback) callback(null);
});