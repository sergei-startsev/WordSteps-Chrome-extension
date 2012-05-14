// Visual studio auto-complete reference.
/// <reference path="/jquery_1.5.min.js">
/// <reference path="/StringFormat.js">

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
    isSelectionDetected: false,
    lastMouseDownPoint: null,
    lastMouseDownTime: null,
    doubleClickTime: 500,
    maxPhraseLength: 32,

    initialize: function () {
        this.isSelectionDetected = false;
        this.lastMouseDownPoint = null;
        this.lastMouseDownTime = null;

        this.addMouseEventListener();
    },
    addMouseEventListener: function () {
        this.removeMouseEventListener();
        window.addEventListener("mousedown", this.onPageMouseDown, false);
        window.addEventListener("mouseup", this.onPageMouseUp, false);
    },
    removeMouseEventListener: function () {
        window.removeEventListener("mousedown", this.onPageMouseDown, false);
        window.removeEventListener("mouseup", this.onPageMouseUp, false);
    },
    onPageMouseDown: function (event) {
        wsSelectionDetector.lastMouseDownPoint = new Point(event.clientX, event.clientY);

        wsSelectionDetector.onCancelSelectionDetected(wsSelectionDetector.lastMouseDownPoint);
    },
    onPageMouseUp: function (event) {
        var point = new Point(event.clientX, event.clientY);

        wsSelectionDetector.onSelectionDetected(wsSelectionDetector.lastMouseDownPoint, point);
        wsSelectionDetector.onDoubleClickSelectionDetected(wsSelectionDetector.lastMouseDownPoint, wsSelectionDetector.lastMouseDownTime, event.timeStamp, point);

        wsSelectionDetector.lastMouseDownTime = event.timeStamp;
    },
    onSelectionDetected: function (downPoint, upPoint) {
        if (downPoint.toVector(upPoint).squareLength() < 25) return;
        if (wsTranslationPopup.isPointInPopup(downPoint.x, downPoint.y)) return;

        var selectedText = this.getSelectedText();
        if (selectedText == null) return;

        this.isSelectionDetected = true;
        var request = String.Format("wsSelectionDetector.onSelectionDetected({0}, {1}, {2}, {3}, sender.tab.id);", JSON.stringify(selectedText.text), selectedText.x, selectedText.y, JSON.stringify(location.host));
        chrome.extension.sendRequest(request);
    },
    onDoubleClickSelectionDetected: function (downPoint, lastTimeStamp, timeStamp, point) {
        if (lastTimeStamp == null) return;
        if (timeStamp - lastTimeStamp > this.doubleClickTime) return;
        if (wsTranslationPopup.isPointInPopup(downPoint.x, downPoint.y)) return;

        var selectedText = this.getSelectedText();
        if (selectedText == null) return;

        this.isSelectionDetected = true;
        var request = String.Format("wsSelectionDetector.onSelectionDetected({0}, {1}, {2}, {3}, sender.tab.id);", JSON.stringify(selectedText.text), selectedText.x, selectedText.y, JSON.stringify(location.host));
        chrome.extension.sendRequest(request);
    },
    onCancelSelectionDetected: function (downPoint) {
        if (!this.isSelectionDetected) return;
        if (wsTranslationPopup.isPointInPopup(downPoint.x, downPoint.y)) return;

        this.isSelectionDetected = false;
        var request = "wsSelectionDetector.onCancelSelectionDetected();";
        chrome.extension.sendRequest(request);
    },
    getSelectedText: function () {
        var range = this.getRange();
        if (range == null) return null;

        var text = range.toString().trim();
        text = text.replace(/\s{2,}/, ' ');
        if (text.length == 0) return;

        if (text.length > this.maxPhraseLength) {
            var lastChar = text[this.maxPhraseLength - 1];
            var overLastChar = text[this.maxPhraseLength];
            text = text.substr(0, this.maxPhraseLength);
            if (lastChar.match(/\S/) == null || overLastChar.match(/\s/) == null) {
                text = text.replace(/\s+\S*?$/, '');
            }
        }

        var startPoint = this.getRangeStartPoint(range);

        return { text: text, x: startPoint.x, y: startPoint.y };
    },
    getRange: function () {
        var selectedObject = window.getSelection();
        if (selectedObject == null) return null;

        for (var i = 0; i < selectedObject.rangeCount; i++) {
            var range = selectedObject.getRangeAt(i);
            if (range.collapsed) continue;
            return range;
        }

        return null;
    },
    getRangeStartPoint: function (range) {
        var rects = range.getClientRects();
        var rect = rects[0];

        return new Point(rect.left, rect.top);
    }
};

var wsTranslationPopup = {
    templatesHash: {},
    phrase: null,
    phraseX: null,
    phraseY: null,

    initialize: function () {
        this.templatesHash = {};

        this.onClosed();
    },
    onOpened: function (x, y, template) {
        this.phraseX = x;
        this.phraseY = y;

        var popup = document.getElementById('wsTranslationPopup');
        if (popup == null) {
            var popup = document.createElement('div');
            popup.setAttribute('id', 'wsTranslationPopup');
            document.documentElement.appendChild(popup);
        }

        $('#wsTranslationPopup').html(template);
        wsTranslationPopup.placePopup();

        $('#wsTranslationPopup .sound img').click(function (event) {
            var request = String.Format("wsPronunciationManager.pronuancePhrase({0});", JSON.stringify(wsTranslationPopup.phrase));
            chrome.extension.sendRequest(request);
        });
        $('#wsTranslationPopup .popup_close img').click(function (event) {
            wsTranslationPopup.close();
        });
        $('#wsTranslationPopup .popup_textbox').focus(function (event) {
            wsTranslationPopup.onTextboxFocus(event);
        });
        $('#wsTranslationPopup .popup_textbox').focusout(function (event) {
            wsTranslationPopup.onTextboxUnfocus(event);
        });
        $('#wsTranslationPopup .popup_textbox').keypress(function (event) {
            wsTranslationPopup.onTextboxEnter(event);
        });
        $('#wsTranslationPopup .open_window_link').click(function (event) {
            var request = "wsOverlay.openMainWindow();";
            chrome.extension.sendRequest(request);
        });
    },
    onClosed: function () {
        this.phrase = null;
        this.phraseX = null;
        this.phraseY = null;

        var popup = document.getElementById('wsTranslationPopup');
        if (popup != null) {
            popup.parentNode.removeChild(popup);
        }
    },
    onCurrentDictionaryChanged: function (dict) {
        $('#wsTranslationPopup .not_selected_dict_error').css('display', dict == null ? 'block !important' : 'none !important');
    },
    onIsBusyChanged: function (newValue) {
        $('#wsTranslationPopup .main_popup_load').css('display', newValue ? 'block !important' : 'none !important');
    },
    onPhraseChanged: function (phrase) {
        this.phrase = phrase;
        $('#wsTranslationPopup .phrase').html(phrase);
    },
    onTranslateChanged: function (translate) {
        $('#wsTranslationPopup .translate_service_disabled_error').css('display', 'none !important');
        if (translate == null) return;

        this.getTemplate('translationVariant', function (template) {
            if (translate.variantsList != null) {
                var html = '';
                for (var i in translate.variantsList) {
                    var variant = translate.variantsList[i];
                    html += String.Format(template, variant);
                }
                $('#wsTranslationPopup .translate_container').html(html);

                $('#wsTranslationPopup .translateVariant').click(function (event) {
                    wsTranslationPopup.confirmPhrase(this.textContent);
                });
            } else if (translate.errorCode != null) {
                wsTranslationPopup.getModel("wsAPIErrorsEnum", function (wsAPIErrorsEnum) {
                    switch (translate.errorCode) {
                        case wsAPIErrorsEnum.transServiceNotAvailable:
                            {
                                $('#wsTranslationPopup .translate_service_disabled_error').css('display', 'block !important');
                            } break;
                    }
                });
            }
        });
    },
    onTextboxFocus: function (event) {
        var textbox = $('#wsTranslationPopup .popup_textbox');
        if (!textbox.hasClass('popup_textbox_empty')) return;

        textbox.removeClass('popup_textbox_empty');
        textbox.val('');
    },
    onTextboxUnfocus: function (event) {
        var textbox = $('#wsTranslationPopup .popup_textbox');
        if (textbox.val().trim() != '') return;

        textbox.addClass('popup_textbox_empty');
        textbox.val('Or specify your translation and press enter');
    },
    onTextboxEnter: function (event) {
        if (event.keyCode != 13) return;

        var translate = $('#wsTranslationPopup .popup_textbox').val().trim();
        if (translate == '') return;

        this.confirmPhrase(translate);
    },
    placePopup: function () {
        var popup = document.getElementById('wsTranslationPopup');
        var popupRect = popup.getBoundingClientRect();
        var pageWidth = document.documentElement.clientWidth;

        var newX = this.phraseX - 10;
        if (newX < 0) newX = 10;
        else if (newX + popupRect.width > pageWidth) newX = pageWidth - popupRect.width - 10;

        var newY = this.phraseY - 10 - popupRect.height;
        if (newY < 0) newY = this.phraseY + 20;

        $('#wsTranslationPopup').css('left', newX);
        $('#wsTranslationPopup').css('top', newY);
    },
    confirmPhrase: function (translate) {
        var request = String.Format("wsTranslationPopup.confirmPhrase({0});", JSON.stringify(translate));
        chrome.extension.sendRequest(request);
    },
    close: function () {
        var request = "wsTranslationPopup.close();";
        chrome.extension.sendRequest(request);
    },
    getTemplate: function (templateId, callback) {
        if (this.templatesHash[templateId] != undefined) {
            callback(this.templatesHash[templateId]);
            return;
        }

        var request = String.Format("manualCallback = true; var template = $('#{0}').html().trim(); callback(template);", templateId);
        chrome.extension.sendRequest(request, function (template) {
            wsTranslationPopup.templatesHash[templateId] = template;
            callback(template);
        });
    },
    getModel: function (modelName, callback) {
        var request = String.Format("manualCallback = true; callback({0});", modelName);
        chrome.extension.sendRequest(request, function (model) {
            callback(model);
        });
    },
    isPointInPopup: function (x, y) {
        var popup = document.getElementById('wsTranslationPopup');
        if (popup == null) return false;

        var rect = popup.getBoundingClientRect();
        if (x < rect.left) return false;
        if (x > rect.right) return false;
        if (y < rect.top) return false;
        if (y > rect.bottom) return false;
        return true;
    }
};

wsSelectionDetector.initialize();
wsTranslationPopup.initialize();
window.addEventListener("unload", function () { wsTranslationPopup.close(); }, false);
chrome.extension.onRequest.addListener(function (request, sender, callback) {
    var manualCallback = false;
    eval(request);
    if (!manualCallback) callback(null);
});