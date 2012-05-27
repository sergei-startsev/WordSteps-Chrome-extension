// Visual studio auto-complete reference.
/// <reference path="/jquery_1.5.min.js">
/// <reference path="/StringFormat.js">
/// <reference path="/wsModels.js">
/// <reference path="/wsPronunciationManager.js">

var bg = chrome.extension.getBackgroundPage();

var wsMainWindow = {
    isExistsDictionaries: false,

    onLoad: function () {
        if (bg == null) {
            window.close();
            return;
        }

        var state = bg.wsPreferencesManager.getIntPreference(bg.wsPreferencesEnum.pluginState);

        if (state == bg.wsPluginStateEnum.LOGGED_OUT) {
            $("#root").html(chrome.i18n.getMessage("youMustLogin"));
            return;   
        }

        $('#login').html(bg.wsUserManager.user.login);

        bg.wsEventManager.subscript(bg.wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        bg.wsEventManager.subscript(bg.wsPluginStateManager.stateChanged, this.onPluginStateChanged);
        bg.wsEventManager.subscript(bg.wsLanguageRepository.languagesCollectionChanged, this.onLanguagesCollectionChanged);
        bg.wsEventManager.subscript(bg.wsLanguagePair.sourceLanguageChanged, this.onSourceLanguageChanged);
        bg.wsEventManager.subscript(bg.wsLanguagePair.targetLanguageChanged, this.onTargetLanguageChanged);
        bg.wsEventManager.subscript(bg.wsDictionaryRepository.dictionariesCollectionChanged, this.onDictionaryCollectionChanged);
        bg.wsEventManager.subscript(bg.wsDictionaryRepository.currentDictionaryChanged, this.onCurrentDictionaryChanged);
        bg.wsEventManager.subscript(bg.wsPhraseRepository.phrasesCollectionChanged, this.onPhrasesCollectionChanged);

        this.onIsBusyChanged(bg.wsPluginStateManager.getIsBusy());
        this.onPluginStateChanged(bg.wsPluginStateManager.getState());
        this.onLanguagesCollectionChanged(bg.wsCollectionChangedEnum.reset, 0);
        this.onSourceLanguageChanged(bg.wsLanguagePair.getSourceLanguage());
        this.onTargetLanguageChanged(bg.wsLanguagePair.getTargetLanguage());
        this.onDictionaryCollectionChanged(bg.wsCollectionChangedEnum.reset, 0);
        this.onCurrentDictionaryChanged(bg.wsDictionaryRepository.getCurrentDictionary());
        this.onPhrasesCollectionChanged(bg.wsCollectionChangedEnum.reset, 0);

        bg.wsDictionaryRepository.resolve(null);
        bg.wsPhraseRepository.resolve(null);
    },
    onUnload: function () {
        bg.wsEventManager.unscript(bg.wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        bg.wsEventManager.unscript(bg.wsPluginStateManager.stateChanged, this.onPluginStateChanged);
        bg.wsEventManager.unscript(bg.wsLanguageRepository.languagesCollectionChanged, this.onLanguagesCollectionChanged);
        bg.wsEventManager.unscript(bg.wsLanguagePair.sourceLanguageChanged, this.onSourceLanguageChanged);
        bg.wsEventManager.unscript(bg.wsLanguagePair.targetLanguageChanged, this.onTargetLanguageChanged);
        bg.wsEventManager.unscript(bg.wsDictionaryRepository.dictionariesCollectionChanged, this.onDictionaryCollectionChanged);
        bg.wsEventManager.unscript(bg.wsDictionaryRepository.currentDictionaryChanged, this.onCurrentDictionaryChanged);
        bg.wsEventManager.unscript(bg.wsPhraseRepository.phrasesCollectionChanged, this.onPhrasesCollectionChanged);
    },
    onLanguagesCollectionChanged: function (action, langCode) {
        switch (action) {
            case bg.wsCollectionChangedEnum.reset:
                {
                    var languages = bg.wsLanguageRepository.getLanguages();

                    var template = this.getTemplate('langSelectorItemTemplate');
                    var sourceHtml = "", targetHtml = "";
                    for (var i in languages) {
                        language = languages[i];
                        var code = language.code.toUpperCase();
                        sourceHtml += String.Format(template, "Source", code, language.image, language.name);
                        targetHtml += String.Format(template, "Target", code, language.image, language.name);
                    }

                    $('#sourceLangSelectorList').html(sourceHtml);
                    $('#targetLangSelectorList').html(targetHtml);
                } break;
            default:
                {
                    throw 'Not implemented';
                } break;
        }
    },
    onSourceLanguageChanged: function (newValue) {
        document.getElementById("sourceLanguageImg").setAttribute("src", newValue.image);
        $('#sourceLanguageLabel').html(newValue.code.toUpperCase());
    },
    onTargetLanguageChanged: function (newValue) {
        document.getElementById("targetLanguageImg").setAttribute("src", newValue.image);
        $('#targetLanguageLabel').html(newValue.code.toUpperCase());
    },
    onPhrasesCollectionChanged: function (action, phraseId) {
        switch (action) {
            case bg.wsCollectionChangedEnum.reset:
                {
                    // TODO: fill phrases tab instead of '#phrases .phrasesContent'
                    var phrases = bg.wsPhraseRepository.getPhrases();

                    var transEditorPhraseId = null, transEditorValue = null;
                    if ($('#translationEditor') != null) {
                        transEditorPhraseId = $('#translationEditor').attr('phraseId');
                        transEditorValue = $('#translationEditor').val();
                    }

                    var html = "";
                    for (var i in phrases) {
                        var phrase = phrases[i];
                        html += wsMainWindow.createPhraseHtml(phrase);
                    }
                    $('#phrases .phrasesContent').html(html);

                    if (transEditorPhraseId != null) {
                        wsMainWindow.openTranslationEditor(transEditorPhraseId);
                        $('#translationEditor').val(transEditorValue);
                    }
                } break;
            case bg.wsCollectionChangedEnum.itemAdded:
                {
                    // TODO: fill phrases tab instead of '#phrases .phrasesContent'
                    var phrase = bg.wsPhraseRepository.getPhrase(phraseId);

                    var html = $('#phrases .phrasesContent').html() + wsMainWindow.createPhraseHtml(phrase);
                    $('#phrases .phrasesContent').html(html);
                } break;
            case bg.wsCollectionChangedEnum.itemRemoved:
                {
                    $('#phrase_' + phraseId).remove();
                } break;
            case bg.wsCollectionChangedEnum.itemUpdated:
                {
                    var phrase = bg.wsPhraseRepository.getPhrase(phraseId);

                    var html = wsMainWindow.createPhraseInnerHtml(phrase);
                    $('#phrase_' + phraseId).html(html);
                } break;
        }
    },
    onDictionaryCollectionChanged: function (action, dictId) {
        switch (action) {
            case bg.wsCollectionChangedEnum.reset:
                {
                    var dictionaries = bg.wsDictionaryRepository.getDictionaries();

                    if (dictionaries.length > 0) {
                        var template = wsMainWindow.getTemplate('dictionarySelectorItemTemplate');
                        var html = "";
                        for (var i in dictionaries) {
                            var dictionary = dictionaries[i];
                            html += String.Format(template, dictionary.id, dictionary.name);
                        }
                        $('#dictionarySelectorList').html(html);

                        var currentDict = bg.wsDictionaryRepository.getCurrentDictionary();
                        if (currentDict != null) {
                            $('#dictionarySelectorItem_' + currentDict.id).css('display', 'none');
                        }
                        wsMainWindow.isExistsDictionaries = true;
                    } else {
                        var html = wsMainWindow.getTemplate('emptyDictSelectorTemplate');
                        html=String.Format(html, chrome.i18n.getMessage("noDict4CurrLang"));
                        $('#dictionarySelectorList').html(html);
                        wsMainWindow.isExistsDictionaries = false;
                    }
                } break;
            case bg.wsCollectionChangedEnum.itemAdded:
                {
                    if (!wsMainWindow.isExistsDictionaries) {
                        $('#dictionarySelectorList').html('');
                        wsMainWindow.isExistsDictionaries = true;
                    }

                    var dict = bg.wsDictionaryRepository.getDictionary(dictId);
                    var html = String.Format(wsMainWindow.getTemplate('dictionarySelectorItemTemplate'), dict.id, dict.name);
                    $('#dictionarySelectorList').html($('#dictionarySelectorList').html() + html);
                } break;
            default:
                {
                    throw 'Not implemented';
                } break;
        }
    },
    onCurrentDictionaryChanged: function (dict) {
        $('.dictionarySelectorItem').css('display', 'block');
        if (dict != null) {
            $('#currentDictionaryLabel').html(dict.name);
            $('#dictionarySelectorItem_' + dict.id).css('display', 'none');

            $('#phrases .phrasesContent').css('display', 'block');
            $('#phrases .notSelectedMessage').css('display', 'none');
            $('#phrases').removeClass('phrasesEmpty');
        } else {
            $('#currentDictionaryLabel').html('');

            $('#phrases .phrasesContent').css('display', 'none');
            $('#phrases .notSelectedMessage').css('display', 'table-cell');
            $('#phrases').addClass('phrasesEmpty');
        }
    },
    onIsBusyChanged: function (value) {
        $('#windowEnabler').css('display', value ? 'block' : 'none');
    },
    onPluginStateChanged: function (newState) {
        $('.pluginStateSelectorItem').css('display', 'block');
        switch (newState) {
            case bg.wsPluginStateEnum.ACTIVE:
                {
                    $('#pluginStateSelectorItem_ACTIVE').css('display', 'none');
                    document.getElementById('pluginState').className = 'pluginStateEnable';
                } break;
            case bg.wsPluginStateEnum.LOGGED_OUT:
                {
                    window.close();
                } break;
            case bg.wsPluginStateEnum.DISABLED:
                {
                    $('#pluginStateSelectorItem_DISABLED').css('display', 'none');
                    document.getElementById('pluginState').className = 'pluginStateDisable';
                } break;
        }
        wsMainWindow.closeSelectors();
    },
    openTranslationEditor: function (phraseId) {
        var phrase = bg.wsPhraseRepository.getPhrase(phraseId);
        if (phrase == null) return;

        var editorTemplate = this.getTemplate('translationEditorTemplate');
        var editorHtml = String.Format(editorTemplate, phrase.translation);

        $('#phrase_' + phraseId + ' .text').html(editorHtml);
        $('#translationEditor').attr('phraseId', phraseId);
        $('#translationEditor').focus();
        $('#translationEditor').focusout(function (event) { wsMainWindow.onTranslationEditorUnfocused(phraseId); });
        $('#translationEditor').keypress(function (event) {
            if (event.keyCode == 13) {
                $('#translationEditor').focusout();
            }
        });
    },
    onTranslationEditorUnfocused: function (phraseId) {
        var phrase = bg.wsPhraseRepository.getPhrase(phraseId);
        if (phrase == null) return;

        var translation = $('#translationEditor').val().trim();
        translation = translation.replace(/\s{2,}/, ' ');

        $('#phrase_' + phraseId + ' .text').html(phrase.translation);

        if (translation == '') return;
        if (phrase.translation == translation) return;
        phrase.translation = translation;

        wsMainWindow.onPhraseMouseOut(phraseId);

        bg.wsPluginStateManager.setIsBusy(true);
        bg.wsPhraseRepository.updatePhrase(phraseId, function (response) {
            var error = response.error;

            if (error) {
                // TODO: display errors
            }

            bg.wsPluginStateManager.setIsBusy(false);
        });
    },
    setPluginState: function (newState) {
        switch (newState) {
            case bg.wsPluginStateEnum.ACTIVE:
                {
                    bg.wsPluginStateManager.setState(bg.wsPluginStateEnum.ACTIVE);
                } break;
            case bg.wsPluginStateEnum.LOGGED_OUT:
                {
                    bg.wsUserManager.signOut();
                } break;
            case bg.wsPluginStateEnum.DISABLED:
                {
                    bg.wsPluginStateManager.setState(bg.wsPluginStateEnum.DISABLED);
                } break;
        }
    },
    selectTab: function (tabName) {
        $('.tab').removeClass('activtab');
        $('.phrasesContent li').removeClass('activli');

        $('#tab_' + tabName).addClass('activtab');
        $('#tabHeader_' + tabName).addClass('activli');
    },
    selectDictionary: function (dictId) {
        bg.wsDictionaryRepository.setCurrentDictionaryUsingId(dictId);
        bg.wsPluginStateManager.setIsBusy(true);
        bg.wsPhraseRepository.resolve(function (response) {
            bg.wsPluginStateManager.setIsBusy(false);
        });

        this.closeSelectors();
    },
    closeSelectors: function () {
        $('.drop_down').css('display', 'none');
    },
    closeCreateNewDict: function () {
        $('#createDictionaryPopup').css('display', 'none');
    },
    toggleSelector: function (name) {
        var needToggle = $('#' + name).css('display') == 'none';
        this.closeSelectors();
        if (needToggle) {
            $('#' + name).css('display', 'block');
        }
    },
    selectSourceLang: function (langCode) {
        bg.wsLanguagePair.setSourceLanguageUsingCode(langCode);
        bg.wsPluginStateManager.setIsBusy(true);
        bg.wsDictionaryRepository.resolve(function (dictResponse) {
            if (dictResponse.response) {
                bg.wsPhraseRepository.resolve(function (phrasesResponse) {
                    bg.wsPluginStateManager.setIsBusy(false);
                });
            } else {
                bg.wsPluginStateManager.setIsBusy(false);
            }
        });
        this.closeSelectors();
    },
    selectTargetLang: function (langCode) {
        bg.wsLanguagePair.setTargetLanguageUsingCode(langCode);
        bg.wsPluginStateManager.setIsBusy(true);
        bg.wsDictionaryRepository.resolve(function (dictResponse) {
            if (dictResponse.response) {
                bg.wsPhraseRepository.resolve(function (phrasesResponse) {
                    bg.wsPluginStateManager.setIsBusy(false);
                });
            } else {
                bg.wsPluginStateManager.setIsBusy(false);
            }
        });
        this.closeSelectors();
    },
    onPhraseMouseOver: function (phraseId) {
        $('#phrase_' + phraseId).css('background-color', '#F0F2E3');
        $('#phrase_' + phraseId).children('.edit').css('display', 'block');
    },
    onPhraseMouseOut: function (phraseId) {
        $('#phrase_' + phraseId).css('background-color', '#FFF');
        $('#phrase_' + phraseId).children('.edit').css('display', 'none');
    },
    createPhraseHtml: function (phrase) {
        var template = this.getTemplate('phraseTemplate');
        return String.Format(template, phrase.id, this.createPhraseInnerHtml(phrase));
    },
    createPhraseInnerHtml: function (phrase) {
        var template = this.getTemplate('phraseInnerTemplate');

        var transcription = phrase.transcription == null ? '[ ]' : phrase.transcription;
        var date = this.dateFormat(phrase.updatedAt);
        var source = phrase.source == null ? '' : phrase.source;
        var pronunciation = phrase.pronunciation;
        if (pronunciation == null) {
            var sourceLangCode = bg.wsLanguagePair.getSourceLanguage().code;
            pronunciation = String.Format('http://translate.google.com/translate_tts?tl={0}&q={1}', encodeURIComponent(sourceLangCode), encodeURIComponent(phrase.phrase));
        }

        return String.Format(
            template,
            phrase.id,
            phrase.phrase,
            transcription,
            date,
            phrase.translation,
            source,
            pronunciation
        );
    },
    onCreateNewDictOpen: function () {
        var sourceLangCode = bg.wsLanguagePair.getSourceLanguage().code;
        var tragetLangCode = bg.wsLanguagePair.getTargetLanguage().code;
        if (sourceLangCode == tragetLangCode) {
            $('#createDictionaryPopup .notSelectedMessage').css('display', 'table-cell');
            $('#createDictionaryContent').css('display', 'none');
        } else {
            $('#createDictionaryPopup .notSelectedMessage').css('display', 'none');
            $('#createDictionaryContent').css('display', 'block');
            $('#newDictionaryName').val('');
            document.getElementById("newDictPrivacy").checked = true;
            $('#newDictionaryName').focus();
        }
    },
    createNewDict: function () {
        var name = $('#newDictionaryName').val();
        var privacy = document.getElementById("newDictPrivacy").checked;

        bg.wsPluginStateManager.setIsBusy(true);
        bg.wsDictionaryRepository.createDictionary(name, privacy, function (response) {
            var resp = response.response;
            var error = response.error;

            if (resp) {
                wsMainWindow.selectDictionary(resp.dict_id);
            } else if (error) {
                // TODO: alert error
            }

            bg.wsPluginStateManager.setIsBusy(false);
        });
    },
    removePhrase: function (phraseId) {
        bg.wsPluginStateManager.setIsBusy(true);
        bg.wsPhraseRepository.removePhrase(phraseId, function (response) {
            bg.wsPluginStateManager.setIsBusy(false);
        });
    },
    wordStepsLinkClick: function () {
        bg.gBrowser.selectedTab = bg.gBrowser.addTab("http://wordsteps.com/");
        window.close();
    },
    dateFormat: function (date) {
        if (date == null) return '';

        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getYear() + 1900;
        return String.Format("{1}/{0}/{2}", day > 9 ? day : '0' + day, month > 9 ? month : '0' + month, year);
    },
    getTemplate: function (id) {
        return $('#' + id).html().trim();
    },
    pronuance: function (phraseId) {
        bg.wsPronunciationManager.pronuance(phraseId);
    }
};

window.addEventListener("load", function () {
    wsMainWindow.onLoad();
    $("#pluginStateSelector").focusout(function () {
        wsMainWindow.closeSelectors();
    });
    $(".selector").focusout(function () {
        wsMainWindow.closeSelectors();
    });
}, false
);

window.addEventListener("unload", function () { wsMainWindow.onUnload(); }, false);