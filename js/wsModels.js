// Visual studio auto-complete reference.
/// <reference path="/StringFormat.js">
/// <reference path="/wsPreferencesManager.js">

var wsCollectionChangedEnum = {
    reset: 0,
    itemRemoved: 1,
    itemAdded: 2,
    itemUpdated: 3
};

var wsEventManager = {
    subscript: function (event, handler) {
        event.push(handler);
    },
    unscript: function (event, handler) {
        for (i = 0; i < event.length; i++) {
            if (event[i] != handler) continue;
            event.splice(i, 1);
            break;
        }
    },
    call: function (event) {
        if (event.length == 0) return;

        var args = '';
        if (arguments.length >= 1) {
            for (i = 1; i < arguments.length; i++) {
                args += 'arguments[' + i + '],';
            }
            args = args.substr(0, args.length - 1);
        }

        for (i = 0; i < event.length; i++) {
            try {
                eval('event[' + i + '](' + args + ');');
            } catch (e) {
                if (wsPreferencesManager.getBoolPreference(wsPreferencesEnum.alertErrors)) {
                    alert(e);
                } else {
                    throw e;
                }
            }
        }
    }
};

var wsCallbackManager = {
    call: function (callback) {
        if (callback == null) return;

        var args = '';
        if (arguments.length >= 1) {
            for (i = 1; i < arguments.length; i++) {
                args += 'arguments[' + i + '],';
            }
            args = args.substr(0, args.length - 1);
        }

        try {
            eval('callback(' + args + ');');
        } catch (e) {
            if (wsPreferencesManager.getBoolPreference(wsPreferencesEnum.alertErrors)) {
                alert(e);
            } else {
                throw e;
            }
        }
    }
};

var wsAPI = {
    appId: wsAPI.appId,
    secretKey: wsAPI.secretKey,
    apiHost: 'http://api.wordsteps.com',
    requests: {},
    onAPIError: [], // Event, args: 0 - error code, 1 - message

    /**
    * Executes API method. Returns id of the request or result.
    * @method {wsAPIMethodsEnum} template of the method string.
    * @callback {function(responseObject)} callback. If callback equals null, then method will be executed synchronously.
    * @arguments {any type, any count} arguments of the method.
    */
    executeMethod: function (method, abortPrevious, callback) {
        if (arguments.length >= 3) {
            var argsString = "";
            for (i = 3; i < arguments.length; i++) {
                argsString += 'encodeURIComponent(arguments[' + i + ']),';
            }
            argsString = argsString.substr(0, argsString.length - 1);
            eval('method = String.Format(method, ' + argsString + ');');
        }
        var url = this.apiHost + '/' + method;

        var methodName = method.match(/^.+\?/)[0];
        if (abortPrevious) {
            var requests = this.requests[methodName];
            for (var i in requests) {
                var request = requests[i];
                this._abortRequest(request);
            }
        }

        var request = new XMLHttpRequest();
        if (callback == null) {
            request.open("GET", url, false);
            var response = this._exec(request);
            delete request;
            return response;
        } else {
            request.open("GET", url, true);
            return this._execAsync(request, methodName, callback);
        }
    },
    _execAsync: function (request, methodName, callback) {
        if (!this.requests[methodName]) this.requests[methodName] = [];
        var requestNumber = this.requests[methodName].push(request) - 1;

        request.onreadystatechange = function () {
            if (request.readyState != 4) return;
            if (request.closed) return;

            var response = null;
            if (request.aborted) {
                request.closed = true;
                response = {
                    error: {
                        error_code: wsAPIErrorsEnum.aborted
                    }
                };
            } else {
                response = wsAPI._handlerResponse(request);
            }

            delete wsAPI.requests[methodName][requestNumber];
            delete request;
            wsCallbackManager.call(callback, response);
        };
        request.send(null);
        return methodName + requestNumber;
    },
    _exec: function (request) {
        request.send(null);
        return this._handlerResponse(request);
    },
    _handlerResponse: function (request) {
        var response = null;
        if (request.status == 200) {
            response = eval("(" + request.responseText + ")");
        } else {
            response = {
                error: {
                    error_code: wsAPIErrorsEnum.netErrors,
                    error_msg: 'HTTP request returned an error. Code: ' + request.status + '.'
                }
            };
        }

        if (wsPreferencesManager.getBoolPreference(wsPreferencesEnum.alertErrors) && response.error) {
            alert("WSReader API error. " + response.error.error_msg);
        }

        if (response.error) {
            wsEventManager.call(this.onAPIError, response.error.error_code, response.error.error_msg);
        }

        return response;
    },
    abortRequest: function (requestId) {
        var splited = requestId.split('?');
        var methodName = splited[0] + '?';
        var requestNumber = splited[1];

        var requests = this.requests[methodName];
        if (!requests) return;
        var request = requests[requestNumber];
        if (!request) return;

        this._abortRequest(request);
        delete this.requests[methodName][requestNumber];
    },
    _abortRequest: function (request) {
        request.aborted = true;
        request.abort();
    }
};

var wsAPIMethodsEnum = {
    // Params: 0 - user login, 1 - user password.
    authorize: 'oauth/authorize?response_type=password&user={0}&password={1}&app_id=' + wsAPI.appId + '&secret_key=' + wsAPI.secretKey,
    // Params: 0 - old access token.
    updateAccessToken: 'oauth/access_token?access_token={0}',
    // Params: 0 - user id, 1 - learn lang, 2 - access token.
    getDictionaries: 'method/dicts.getCreated?user_id={0}&learn_lang={1}&limit=10000&access_token={2}',
    // Params: 0 - dict name, 1 - learn lang code, 2 - trans lang code, 3 - privacy, 4 - access token.
    dictCreate: 'method/dicts.create?name={0}&learn_lang={1}&trans_lang={2}&privacy={3}&access_token={4}',
    // Params: 0 - dict id, 1 - access token.
    getPhrases: 'method/words.get?dict_id={0}&limit=10000&access_token={1}',
    // Params: 0 - dictionary id, 1 - phrases id, 2 - access token.
    phraseRemove: 'method/words.delete?dict_id={0}&words_ids={1}&access_token={2}',
    // Params: 0 - dictionary id, 1 - phrase, 2 - translate, 3 - access token.
    phraseAdd: 'method/words.add?dict_id={0}&word={1}&trans={2}&source={3}&access_token={4}',
    // Params: 0 - access token.
    getLangs: 'method/words.getTransLangs?lang=en&access_token={0}',
    // Params: 0 - source lang code, 1 - target lang code, 2 - phrase, 3 - access token.
    translate: 'method/words.translate?src_lang={0}&trans_lang={1}&word={2}&access_token={3}'
};

var wsAPIErrorsEnum = {
    aborted: -2,
    paramsValidationErrors: -1,
    netErrors: 0,
    accessErrors: 1,
    invalidLoginPassword: 3,
    invalidDictId: 103,
    invalidWord: 108,
    invalidWordId: 110,
    transServiceNotAvailable: 115
};

var wsPluginStateEnum = {
    LOGGED_OUT: 0,
    ACTIVE: 1,
    DISABLED: 2
};

var wsPluginStateManager = {
    currentState: wsPluginStateEnum.LOGGED_OUT,
    stateChanged: [], // Event, args: newValue - new value of the.
    busyDepth: -1,
    isBusyChanged: [], // Event, args: newValue - new value.

    getState: function () {
        return this.currentState;
    },
    /**
    * Sets plugin state.
    * @param {ws.PluginStateEnum} state New plugin state.
    */
    setState: function (state) {
        if (this.currentState == state) return;
        this.currentState = state;

        if (wsUserManager.user.remember) wsPreferencesManager.setIntPreference(wsPreferencesEnum.pluginState, this.currentState);

        wsEventManager.call(this.stateChanged, state);
    },
    getIsBusy: function () {
        return this.busyDepth >= 0;
    },
    setIsBusy: function (value) {
        var oldValue = this.getIsBusy();
        this.busyDepth += value ? 1 : -1;
        var newValue = this.getIsBusy();
        if (oldValue != newValue) wsEventManager.call(this.isBusyChanged, newValue);
    }
};

function wsLanguage(code, name, image) {
    this.code = code;
    this.name = name;
    this.image = image;
};

var wsLanguageRepository = {
    languages: {},
    languagesCollectionChanged: [], // Event, args: action - wsCollectionChangedEnum, langCode - lang code.

    resolve: function (callback) {
        wsUserManager.getAccessToken(function (token) { 
            wsAPI.executeMethod(wsAPIMethodsEnum.getLangs, true, function (response) {
                var resp = response.response;

                if (resp) {
                    wsLanguageRepository.languages = {};

                    var langs = resp.langs;
                    for (var i in langs) {
                        var lang = langs[i];

                        wsLanguageRepository.languages[lang.code] = new wsLanguage(lang.code, lang.name, lang.pic);
                    }

                    wsEventManager.call(wsLanguageRepository.languagesCollectionChanged, wsCollectionChangedEnum.reset);

                    var sourceLang = wsLanguagePair.getSourceLanguage();
                    if (sourceLang != null) {
                        wsLanguagePair.setSourceLanguage(wsLanguageRepository.getLanguage(sourceLang.code));
                    }
                    var targetLang = wsLanguagePair.getTargetLanguage();
                    if (targetLang != null) {
                        wsLanguagePair.setTargetLanguage(wsLanguageRepository.getLanguage(targetLang.code));
                    }
                }

                wsCallbackManager.call(callback(response));
            }, token);
        });
    },
    getDefault: function () {
        return this.languages['en'] ? this.languages['en'] : this.languages[0];
    },
    getLanguage: function (code) {
        return this.languages[code] ? this.languages[code] : null;
    },
    getLanguages: function () {
        return this.languages;
    }
};

var wsLanguagePair = {
    sourceLanguage: null,
    targetLanguage: null,
    sourceLanguageChanged: [], // Event, args: newValue - new value of the language.
    targetLanguageChanged: [], // Event, args: newValue - new value of the language.

    setSourceLanguage: function (language) {
        if (language == null) language = wsLanguageRepository.getDefault();
        if (this.sourceLanguage != null && this.sourceLanguage.code == language.code) return;

        if(this.targetLanguage!=null && this.targetLanguage.code==language.code)
            return;

        this.sourceLanguage = language;
        if (wsUserManager.user.remember) wsPreferencesManager.setStringPreference(wsPreferencesEnum.sourceLanguage, language.code);
        wsEventManager.call(this.sourceLanguageChanged, this.sourceLanguage);
    },
    setSourceLanguageUsingCode: function (languageCode) {
        var language = wsLanguageRepository.getLanguage(languageCode.toLowerCase());
        this.setSourceLanguage(language);
    },
    getSourceLanguage: function () {
        return this.sourceLanguage;
    },
    setTargetLanguage: function (language) {
        if (language == null) language = wsLanguageRepository.getDefault();
        if (this.targetLanguage != null && this.targetLanguage.code == language.code) return;

        if(this.sourceLanguage!=null && this.sourceLanguage.code==language.code)
            return;

        this.targetLanguage = language;
        if (wsUserManager.user.remember) wsPreferencesManager.setStringPreference(wsPreferencesEnum.targetLanguage, language.code);
        wsEventManager.call(this.targetLanguageChanged, this.targetLanguage);
    },
    setTargetLanguageUsingCode: function (languageCode) {
        var language = wsLanguageRepository.getLanguage(languageCode.toLowerCase());
        this.setTargetLanguage(language);
    },
    getTargetLanguage: function () {
        return this.targetLanguage;
    }
};

function wsDictionary(id, name, learnLangCode, transLangCode, size) {
    this.id = id;
    this.name = name;
    this.learnLangCode = learnLangCode;
    this.transLangCode = transLangCode;
    this.size = size;
};

var wsDictionaryRepository = {
    dictionaries: [],
    dictionariesCollectionChanged: [], // Event, args: action - wsCollectionChangedEnum, dictId - id of the dictionary.
    currentDictionary: null,
    currentDictionaryChanged: [], // Event, args: dict - dictionary. 

    resolve: function (callback) {
        var sourceLangCode = wsLanguagePair.getSourceLanguage().code;
        var targetLangCode = wsLanguagePair.getTargetLanguage().code;
        var userId = wsUserManager.getUser().id;

        wsUserManager.getAccessToken(function (token) { 
            wsAPI.executeMethod(wsAPIMethodsEnum.getDictionaries, true, function (response) {
                var resp = response.response;

                if (resp) {
                    wsDictionaryRepository.dictionaries = [];
                    var dicts = resp.dicts;

                    for (i = 0; i < dicts.length; i++) {
                        var dict = dicts[i];
                        var id = dict.dict_id;
                        if (dict.author_id != userId) continue;
                        if (dict.trans_lang != targetLangCode) continue;

                        wsDictionaryRepository.dictionaries[id] = new wsDictionary(id, dict.name, dict.learn_lang, dict.trans_lang, dict.size);
                    }

                    wsEventManager.call(wsDictionaryRepository.dictionariesCollectionChanged, wsCollectionChangedEnum.reset);

                    var currentDict = wsDictionaryRepository.getCurrentDictionary();
                    if (currentDict != null) {
                        wsDictionaryRepository.setCurrentDictionaryUsingId(currentDict.id);
                    }
                } 

                wsCallbackManager.call(callback, response);
            }, userId, sourceLangCode, token);
        });
    },
    getDictionaries: function () {
        return this.dictionaries;
    },
    setCurrentDictionary: function (dict) {
        if ((this.currentDictionary == null ? 0 : this.currentDictionary.id) == (dict == null ? 0 : dict.id)) return;

        this.currentDictionary = dict;
        if (dict != null) {
            wsPreferencesManager.setIntPreference(wsPreferencesEnum.currentDict, dict.id);
        } else {
            wsPreferencesManager.resetPreference(wsPreferencesEnum.currentDict);
        }
        wsEventManager.call(this.currentDictionaryChanged, dict);
    },
    setCurrentDictionaryUsingId: function (dictId) {
        var dict = this.dictionaries[dictId];
        if (dict) {
            this.setCurrentDictionary(dict);
        } else {
            this.setCurrentDictionary(null);
        }
    },
    getDictionary: function (dictId) {
        return this.dictionaries[dictId];
    },
    getCurrentDictionary: function () {
        return this.currentDictionary;
    },
    createDictionary: function (name, privacy, callBack) {
        name = name.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        if (name == '') {
            wsCallbackManager.call(callBack, { error: { error_code: wsAPIErrorsEnum.paramsValidationErrors, error_msg: 'You must specify not empty the name.'} });
            return;
        }
        var sourceLangCode = wsLanguagePair.getSourceLanguage().code;
        var targetLangCode = wsLanguagePair.getTargetLanguage().code;

        wsUserManager.getAccessToken(function (token) { 
            wsAPI.executeMethod(wsAPIMethodsEnum.dictCreate, false, function (response) {
                var resp = response.response;

                if (resp) {
                    var newDict = new wsDictionary(resp.dict_id, resp.name, resp.learn_lang, resp.trans_lang, resp.size);
                    wsDictionaryRepository.dictionaries[newDict.id] = newDict;
                    wsEventManager.call(wsDictionaryRepository.dictionariesCollectionChanged, wsCollectionChangedEnum.itemAdded, newDict.id);
                }

                wsCallbackManager.call(callBack, response);
            }, name, sourceLangCode, targetLangCode, privacy ? 4 : 1, token);
        });
    }
};

function wsPhrase(id, phrase, translation, transcription, pronunciation, updatedAt, source, canPlay) {
    this.id = id;
    this.phrase = phrase;
    this.translation = translation;
    this.transcription = transcription;
    this.pronunciation = pronunciation;
    this.updatedAt = updatedAt;
    this.source = source;
    this.canPlay = canPlay;
};

var wsPhraseRepository = {
    phrases: [],
    phrasesCollectionChanged: [], // Event, args: action - wsCollectionChangedEnum, phraseId - id of the phrase.

    resolve: function (callback) {
        var dict = wsDictionaryRepository.getCurrentDictionary();
        if (dict == null) {
            this.phrases = [];
            wsEventManager.call(this.phrasesCollectionChanged, wsCollectionChangedEnum.reset);
            wsCallbackManager.call(callback, { response: { words: []} });
            return;
        }

        wsUserManager.getAccessToken(function (token) { 
            wsAPI.executeMethod(wsAPIMethodsEnum.getPhrases, true, function (response) {
                var resp = response.response;
                var error = response.error;

                if (resp) {
                    var phrasesResp = resp.words;
                    var phrases = [];

                    for (i = 0; i < phrasesResp.length; i++) {
                        var phraseResp = phrasesResp[i];
                        var id = phraseResp.word_id;
                        var pronunciation = phraseResp.sound ? phraseResp.sound : null;
                        var canPlay = wsPhraseRepository.phrases[id] ? wsPhraseRepository.phrases[id].canPlay : true;
                        var source = phraseResp.source;

                        phrases[id] = new wsPhrase(id, phraseResp.word, phraseResp.translation, phraseResp.transcription, pronunciation, null, source, canPlay);
                    }

                    wsPhraseRepository.phrases = phrases;
                    wsEventManager.call(wsPhraseRepository.phrasesCollectionChanged, wsCollectionChangedEnum.reset);
                } else if (error) {
                    if (error.error_code == wsAPIErrorsEnum.invalidDictId) {
                        wsPhraseRepository.phrases = [];
                        wsEventManager.call(wsPhraseRepository.phrasesCollectionChanged, wsCollectionChangedEnum.reset);
                    }
                }

                wsCallbackManager.call(callback, response);
            }, dict.id, token);
        });
    },
    getPhrases: function () {
        return this.phrases;
    },
    getPhrase: function (phraseId) {
        var result = this.phrases[phraseId];
        return result ? result : null;
    },
    addPhrase: function (phrase, translate, source, callback) {
        var dict = wsDictionaryRepository.getCurrentDictionary();
        if (dict == null) {
            wsCallbackManager.call(callback, { error: { error_code: wsAPIErrorsEnum.paramsValidationErrors, error_msg: 'Dictionary not selected.'} });
            return;
        }

        wsUserManager.getAccessToken(function (token) { 
            wsAPI.executeMethod(wsAPIMethodsEnum.phraseAdd, false, function (response) {
                var resp = response.response;

                if (resp) {
                    var phrase = resp.word;
                    var id = phrase.word_id;
                    var pronunciation = phrase.sound ? phrase.sound : null;
                    var source = phrase.source;

                    var isExists = wsPhraseRepository.phrases[id] ? true : false;
                    wsPhraseRepository.phrases[id] = new wsPhrase(id, phrase.word, phrase.translation, phrase.transcription, pronunciation, null, source, true);
                    wsEventManager.call(wsPhraseRepository.phrasesCollectionChanged, isExists ? wsCollectionChangedEnum.itemUpdated : wsCollectionChangedEnum.itemAdded, id);
                }

                wsCallbackManager.call(callback, response);
            }, dict.id, phrase, translate, source, token);
        });
    },
    removePhrase: function (phraseId, callback) {
        var dict = wsDictionaryRepository.getCurrentDictionary();
        if (dict == null) {
            wsCallbackManager.call(callback, { error: { error_code: wsAPIErrorsEnum.paramsValidationErrors, error_msg: 'Dictionary not selected.'} });
            return;
        }

        wsUserManager.getAccessToken(function (token) {
            wsAPI.executeMethod(wsAPIMethodsEnum.phraseRemove, false, function (response) {
                var resp = response.response;
                var error = response.error;

                if (resp) {
                    delete wsPhraseRepository.phrases[phraseId];
                    wsEventManager.call(wsPhraseRepository.phrasesCollectionChanged, wsCollectionChangedEnum.itemRemoved, phraseId);
                } else if (error) {
                    if (error.error_code == wsAPIErrorsEnum.invalidWordId) {
                        response = { response: { words: []} };
                        wsEventManager.call(wsPhraseRepository.phrasesCollectionChanged, wsCollectionChangedEnum.itemRemoved, phraseId);
                    }
                }

                wsCallbackManager.call(callback, response);
            }, dict.id, phraseId, token);
        });
    },
    updatePhrase: function (phraseId, callback) {
        var phrase = this.getPhrase(phraseId);
        if (phrase == null) {
            wsCallbackManager.call(callback, { error: { error_code: wsAPIErrorsEnum.paramsValidationErrors, error_msg: 'Phrase not found.'} });
            return;
        }

        var source = phrase.source == null ? '' : phrase.source;
        this.addPhrase(phrase.phrase, phrase.translation, source, function (response) {
            wsCallbackManager.call(callback, response);
        });
    }
};

function wsTranslate(phrase, variantsList, errorCode) {
    this.phrase = phrase;
    this.variantsList = variantsList;
    this.errorCode = errorCode;
};

var wsTranslator = {
    hash: {},
    translateRequestId: null,
    maxPhraseLength: 32,
    phrase: null,
    source: null,
    translate: null,
    phraseChanged: [], // Event, args: phrase - new phrase
    sourceChanged: [], // Event, args: source - new source
    translateChanged: [],  // Event, args: translate - new translate

    setPhrase: function (phrase, source) {
        if (this.phrase == phrase) return;

        this.phrase = phrase;
        this.source = source;
        this.translate = null;
        wsEventManager.call(this.phraseChanged, phrase);
        wsEventManager.call(this.sourceChanged, source);
        wsEventManager.call(this.translateChanged, null);
    },
    getPhrase: function () {
        return this.phrase;
    },
    getSource: function () {
        return this.source;
    },
    getTranslate: function (callback) {
        var sourceLangCode = wsLanguagePair.getSourceLanguage().code;
        var targetLangCode = wsLanguagePair.getTargetLanguage().code;
        var phrase = this.phrase;

        if (sourceLangCode == targetLangCode) {
            wsCallbackManager.call(callback, { error: { error_code: wsAPIErrorsEnum.paramsValidationErrors, error_msg: 'Langs must be different.'} });
            return;
        }

        var translate = this._getTranslateFromHash(sourceLangCode, targetLangCode, phrase);
        if (translate != null) {
            this.translate = translate;
            wsEventManager.call(wsTranslator.translateChanged, translate);
            wsCallbackManager.call(callback, { response: {} });
            return;
        }

        wsUserManager.getAccessToken(function (token) { 
            this.translateRequestId = wsAPI.executeMethod(wsAPIMethodsEnum.translate, true, function (response) {
                var resp = response.response;
                var error = response.error;

                if (resp) {
                    var translations = resp.translations;
                    var variants = [];
                    for (var i in translations) {
                        var translate = translations[i];
                        variants.push(translate.text);
                    }
                    var translate = new wsTranslate(phrase, variants, null);

                    if (!wsTranslator.hash[sourceLangCode]) wsTranslator.hash[sourceLangCode] = {};
                    wsTranslator.hash[sourceLangCode][phrase + targetLangCode] = translate;
                    wsTranslator.translate = translate;

                    wsEventManager.call(wsTranslator.translateChanged, translate);
                } else if (error) {
                    var translate = new wsTranslate(phrase, null, error.error_code);
                    wsTranslator.translate = translate;
                    wsEventManager.call(wsTranslator.translateChanged, translate);
                }

                wsTranslator.translateRequestId = null;
                wsCallbackManager.call(callback, response);
            }, sourceLangCode, targetLangCode, phrase, token);
        });
    },
    abortTranslate: function () {
        if (this.translateRequestId == null) return;
        wsAPI.abortRequest(this.translateRequestId);
    },
    _getTranslateFromHash: function (sourceLangCode, tragetLangCode, phrase) {
        var hash = this.hash[sourceLangCode];
        if (!hash) return null;

        var translate = hash[phrase + tragetLangCode];
        return translate ? translate : null;
    }
};

function wsUser(id, login, email, password, accessToken, remember) {
    this.id = id;
    this.login = login;
    this.email = email;
    this.password = password;
    this.accessToken = accessToken;
    this.remember = remember;
};

var wsUserManager = {
    user: null,
    updateTokenIntervalId: null,

    getUser: function () {
        return this.user;
    },
    setUser: function (user) {
        this.user = user;
        if (this.user != null && this.user.remember) {
            wsPreferencesManager.setStringPreference(wsPreferencesEnum.userEmail, this.user.email);
            wsPreferencesManager.setStringPreference(wsPreferencesEnum.userPassword, this.user.password);
        }
    },
    signIn: function (email, password, remember, callback) {
        wsPluginStateManager.setIsBusy(true);

        var finish = function (finishResponse) {
            wsCallbackManager.call(callback, finishResponse);
            wsPluginStateManager.setIsBusy(false);

            var error = finishResponse.error;
            if (!error) {
                wsEventManager.subscript(wsAPI.onAPIError, wsUserManager._onAPIError);
            }
        };

        wsAPI.executeMethod(wsAPIMethodsEnum.authorize, true, function (authResponse) {
            var authResp = authResponse.response;

            if (authResp) {
                var user = new wsUser(authResp.user_id, authResp.user_name, email, password, authResp.access_token, remember);
                wsUserManager.setUser(user);
                wsUserManager._startTokenUpdateTimer(authResp.expires_in);
                wsPluginStateManager.setState(wsPluginStateEnum.ACTIVE);

                wsLanguageRepository.resolve(function (langsResponse) {
                    var langsResp = langsResponse.response;

                    if (langsResp) {
                        wsLanguagePair.setSourceLanguageUsingCode(wsPreferencesManager.getStringPreference(wsPreferencesEnum.sourceLanguage));
                        wsLanguagePair.setTargetLanguageUsingCode(wsPreferencesManager.getStringPreference(wsPreferencesEnum.targetLanguage));

                        wsDictionaryRepository.resolve(function (dictsResponse) {
                            var dictsResp = dictsResponse.response;

                            if (dictsResp) {
                                wsDictionaryRepository.setCurrentDictionaryUsingId(wsPreferencesManager.getIntPreference(wsPreferencesEnum.currentDict));

                                wsPhraseRepository.resolve(function (phrasesResponse) {
                                    var phrasesResp = phrasesResponse.response;

                                    if (phrasesResp) {
                                        finish(authResponse);
                                    } else {
                                        wsUserManager.signOut();
                                        finish(phrasesResponse);
                                    }
                                });
                            } else {
                                wsUserManager.signOut();
                                finish(dictsResponse);
                            }
                        });
                    } else {
                        wsUserManager.signOut();
                        finish(langsResponse);
                    }
                });
            } else {
                finish(authResponse);
            }
        }, email, password);
    },
    signOut: function () {
        if (this.user.remember) {
            wsPreferencesManager.resetPreference(wsPreferencesEnum.userEmail);
            wsPreferencesManager.resetPreference(wsPreferencesEnum.userPassword);
            wsPreferencesManager.resetPreference(wsPreferencesEnum.pluginState);
            wsPreferencesManager.resetPreference(wsPreferencesEnum.sourceLanguage);
            wsPreferencesManager.resetPreference(wsPreferencesEnum.targetLanguage);
            wsPreferencesManager.resetPreference(wsPreferencesEnum.currentDict);
        }
        wsPluginStateManager.setState(wsPluginStateEnum.LOGGED_OUT);
        this.setUser(null);
        this._stopTokenUpdateTimer();
        wsEventManager.unscript(wsAPI.onAPIError, this._onAPIError);
    },
    getAccessToken: function (callback) {
        if (this.user == null) return wsCallbackManager.call(callback, '');
        if (this.user.accessToken != '') return wsCallbackManager.call(callback, this.user.accessToken);
        else {
            // Token was removed. Get the token again. 
            wsAPI.executeMethod(wsAPIMethodsEnum.authorize, true, function (response) {
                var resp = response.response;
                if (resp) {
                    wsUserManager.user.accessToken = resp.access_token
                    wsUserManager._startTokenUpdateTimer(resp.expires_in);
                }

                wsCallbackManager.call(callback, wsUserManager.user.accessToken);
            }, this.user.email, this.user.password);
        }
    },
    _updateTokenTimerTick: function () {
        var oldToken = this.user.accessToken;
        if (oldToken == '') return;

        var response = wsAPI.executeMethod(wsAPIMethodsEnum.updateAccessToken, false, null, oldToken).response;
        if (response) {
            this.user.accessToken = response.access_token;
        }
    },
    _onAPIError: function (code, msg) {
        if (code == wsAPIErrorsEnum.accessErrors) {
            wsUserManager.user.accessToken = '';
        }
    },
    _startTokenUpdateTimer: function (expiresIn) {
        this._stopTokenUpdateTimer();
        this.updateTokenIntervalId = window.setInterval(function () {
            wsUserManager._updateTokenTimerTick();
        }, expiresIn * 1000 - 60000 * 15);
    },
    _stopTokenUpdateTimer: function () {
        if (this.updateTokenIntervalId == null) return;

        window.clearInterval(this.updateTokenIntervalId);
        this.updateTokenIntervalId = null;
    }
};

/*$(document).ready(function () {
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
});*/

