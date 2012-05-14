// Visual studio auto-complete reference.
/// <reference path="/jquery_1.5.min.js">
/// <reference path="/StringFormat.js">
/// <reference path="/wsModels.js">
/// <reference path="/wsPronunciationManager.js">

var wsMainWindow = {
    isExistsDictionaries: false,

    onLoad: function () {
        if (opener == null) {
            window.close();
            return;
        }

        $('#login').html(opener.wsUserManager.user.login);

        opener.wsEventManager.subscript(opener.wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        opener.wsEventManager.subscript(opener.wsPluginStateManager.stateChanged, this.onPluginStateChanged);
        opener.wsEventManager.subscript(opener.wsLanguageRepository.languagesCollectionChanged, this.onLanguagesCollectionChanged);
        opener.wsEventManager.subscript(opener.wsLanguagePair.sourceLanguageChanged, this.onSourceLanguageChanged);
        opener.wsEventManager.subscript(opener.wsLanguagePair.targetLanguageChanged, this.onTargetLanguageChanged);
        opener.wsEventManager.subscript(opener.wsDictionaryRepository.dictionariesCollectionChanged, this.onDictionaryCollectionChanged);
        opener.wsEventManager.subscript(opener.wsDictionaryRepository.currentDictionaryChanged, this.onCurrentDictionaryChanged);
        opener.wsEventManager.subscript(opener.wsPhraseRepository.phrasesCollectionChanged, this.onPhrasesCollectionChanged);

        this.onIsBusyChanged(opener.wsPluginStateManager.getIsBusy());
        this.onPluginStateChanged(opener.wsPluginStateManager.getState());
        this.onLanguagesCollectionChanged(opener.wsCollectionChangedEnum.reset, 0);
        this.onSourceLanguageChanged(opener.wsLanguagePair.getSourceLanguage());
        this.onTargetLanguageChanged(opener.wsLanguagePair.getTargetLanguage());
        this.onDictionaryCollectionChanged(opener.wsCollectionChangedEnum.reset, 0);
        this.onCurrentDictionaryChanged(opener.wsDictionaryRepository.getCurrentDictionary());
        this.onPhrasesCollectionChanged(opener.wsCollectionChangedEnum.reset, 0);

        opener.wsDictionaryRepository.resolve(null);
        opener.wsPhraseRepository.resolve(null);
    },
    onUnload: function () {
        opener.wsEventManager.unscript(opener.wsPluginStateManager.isBusyChanged, this.onIsBusyChanged);
        opener.wsEventManager.unscript(opener.wsPluginStateManager.stateChanged, this.onPluginStateChanged);
        opener.wsEventManager.unscript(opener.wsLanguageRepository.languagesCollectionChanged, this.onLanguagesCollectionChanged);
        opener.wsEventManager.unscript(opener.wsLanguagePair.sourceLanguageChanged, this.onSourceLanguageChanged);
        opener.wsEventManager.unscript(opener.wsLanguagePair.targetLanguageChanged, this.onTargetLanguageChanged);
        opener.wsEventManager.unscript(opener.wsDictionaryRepository.dictionariesCollectionChanged, this.onDictionaryCollectionChanged);
        opener.wsEventManager.unscript(opener.wsDictionaryRepository.currentDictionaryChanged, this.onCurrentDictionaryChanged);
        opener.wsEventManager.unscript(opener.wsPhraseRepository.phrasesCollectionChanged, this.onPhrasesCollectionChanged);
    },
    onLanguagesCollectionChanged: function (action, langCode) {
        switch (action) {
            case opener.wsCollectionChangedEnum.reset:
                {
                    var languages = opener.wsLanguageRepository.getLanguages();

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
            case opener.wsCollectionChangedEnum.reset:
                {
                    // TODO: fill phrases tab instead of '#phrases .phrasesContent'
                    var phrases = opener.wsPhraseRepository.getPhrases();

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
            case opener.wsCollectionChangedEnum.itemAdded:
                {
                    // TODO: fill phrases tab instead of '#phrases .phrasesContent'
                    var phrase = opener.wsPhraseRepository.getPhrase(phraseId);

                    var html = $('#phrases .phrasesContent').html() + wsMainWindow.createPhraseHtml(phrase);
                    $('#phrases .phrasesContent').html(html);
                } break;
            case opener.wsCollectionChangedEnum.itemRemoved:
                {
                    $('#phrase_' + phraseId).remove();
                } break;
            case opener.wsCollectionChangedEnum.itemUpdated:
                {
                    var phrase = opener.wsPhraseRepository.getPhrase(phraseId);

                    var html = wsMainWindow.createPhraseInnerHtml(phrase);
                    $('#phrase_' + phraseId).html(html);
                } break;
        }
    },
    onDictionaryCollectionChanged: function (action, dictId) {
        switch (action) {
            case opener.wsCollectionChangedEnum.reset:
                {
                    var dictionaries = opener.wsDictionaryRepository.getDictionaries();

                    if (dictionaries.length > 0) {
                        var template = wsMainWindow.getTemplate('dictionarySelectorItemTemplate');
                        var html = "";
                        for (var i in dictionaries) {
                            var dictionary = dictionaries[i];
                            html += String.Format(template, dictionary.id, dictionary.name);
                        }
                        $('#dictionarySelectorList').html(html);

                        var currentDict = opener.wsDictionaryRepository.getCurrentDictionary();
                        if (currentDict != null) {
                            $('#dictionarySelectorItem_' + currentDict.id).css('display', 'none');
                        }
                        wsMainWindow.isExistsDictionaries = true;
                    } else {
                        var html = wsMainWindow.getTemplate('emptyDictSelectorTemplate');
                        $('#dictionarySelectorList').html(html);
                        wsMainWindow.isExistsDictionaries = false;
                    }
                } break;
            case opener.wsCollectionChangedEnum.itemAdded:
                {
                    if (!wsMainWindow.isExistsDictionaries) {
                        $('#dictionarySelectorList').html('');
                        wsMainWindow.isExistsDictionaries = true;
                    }

                    var dict = opener.wsDictionaryRepository.getDictionary(dictId);
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
            case opener.wsPluginStateEnum.ACTIVE:
                {
                    $('#pluginStateSelectorItem_ACTIVE').css('display', 'none');
                    document.getElementById('pluginState').className = 'pluginStateEnable';
                } break;
            case opener.wsPluginStateEnum.LOGGED_OUT:
                {
                    window.close();
                } break;
            case opener.wsPluginStateEnum.DISABLED:
                {
                    $('#pluginStateSelectorItem_DISABLED').css('display', 'none');
                    document.getElementById('pluginState').className = 'pluginStateDisable';
                } break;
        }
        wsMainWindow.closeSelectors();
    },
    openTranslationEditor: function (phraseId) {
        var phrase = opener.wsPhraseRepository.getPhrase(phraseId);
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
        var phrase = opener.wsPhraseRepository.getPhrase(phraseId);
        if (phrase == null) return;

        var translation = $('#translationEditor').val().trim();
        translation = translation.replace(/\s{2,}/, ' ');

        $('#phrase_' + phraseId + ' .text').html(phrase.translation);

        if (translation == '') return;
        if (phrase.translation == translation) return;
        phrase.translation = translation;

        wsMainWindow.onPhraseMouseOut(phraseId);

        opener.wsPluginStateManager.setIsBusy(true);
        opener.wsPhraseRepository.updatePhrase(phraseId, function (response) {
            var error = response.error;

            if (error) {
                // TODO: display errors
            }

            opener.wsPluginStateManager.setIsBusy(false);
        });
    },
    setPluginState: function (newState) {
        switch (newState) {
            case opener.wsPluginStateEnum.ACTIVE:
                {
                    opener.wsPluginStateManager.setState(opener.wsPluginStateEnum.ACTIVE);
                } break;
            case opener.wsPluginStateEnum.LOGGED_OUT:
                {
                    opener.wsUserManager.signOut();
                } break;
            case opener.wsPluginStateEnum.DISABLED:
                {
                    opener.wsPluginStateManager.setState(opener.wsPluginStateEnum.DISABLED);
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
        opener.wsDictionaryRepository.setCurrentDictionaryUsingId(dictId);
        opener.wsPluginStateManager.setIsBusy(true);
        opener.wsPhraseRepository.resolve(function (response) {
            opener.wsPluginStateManager.setIsBusy(false);
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
        opener.wsLanguagePair.setSourceLanguageUsingCode(langCode);
        opener.wsPluginStateManager.setIsBusy(true);
        opener.wsDictionaryRepository.resolve(function (dictResponse) {
            if (dictResponse.response) {
                opener.wsPhraseRepository.resolve(function (phrasesResponse) {
                    opener.wsPluginStateManager.setIsBusy(false);
                });
            } else {
                opener.wsPluginStateManager.setIsBusy(false);
            }
        });
        this.closeSelectors();
    },
    selectTargetLang: function (langCode) {
        opener.wsLanguagePair.setTargetLanguageUsingCode(langCode);
        opener.wsPluginStateManager.setIsBusy(true);
        opener.wsDictionaryRepository.resolve(function (dictResponse) {
            if (dictResponse.response) {
                opener.wsPhraseRepository.resolve(function (phrasesResponse) {
                    opener.wsPluginStateManager.setIsBusy(false);
                });
            } else {
                opener.wsPluginStateManager.setIsBusy(false);
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
            var sourceLangCode = opener.wsLanguagePair.getSourceLanguage().code;
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
        var sourceLangCode = opener.wsLanguagePair.getSourceLanguage().code;
        var tragetLangCode = opener.wsLanguagePair.getTargetLanguage().code;
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

        opener.wsPluginStateManager.setIsBusy(true);
        opener.wsDictionaryRepository.createDictionary(name, privacy, function (response) {
            var resp = response.response;
            var error = response.error;

            if (resp) {
                wsMainWindow.selectDictionary(resp.dict_id);
            } else if (error) {
                // TODO: alert error
            }

            opener.wsPluginStateManager.setIsBusy(false);
        });
    },
    removePhrase: function (phraseId) {
        opener.wsPluginStateManager.setIsBusy(true);
        opener.wsPhraseRepository.removePhrase(phraseId, function (response) {
            opener.wsPluginStateManager.setIsBusy(false);
        });
    },
    wordStepsLinkClick: function () {
        opener.gBrowser.selectedTab = opener.gBrowser.addTab("http://www.wordsteps.com/");
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
        opener.wsPronunciationManager.pronuance(phraseId);
    }
};

window.addEventListener("load", function () { wsMainWindow.onLoad(); }, false);
window.addEventListener("unload", function () { wsMainWindow.onUnload(); }, false);