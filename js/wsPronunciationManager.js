// Visual studio auto-complete reference.
/// <reference path="/jquery_1.5.min.js">
/// <reference path="/StringFormat.js">
/// <reference path="/wsModels.js">

var wsPronunciationManager = {
    pronuance: function (phraseId) {
        var phrase = wsPhraseRepository.getPhrase(phraseId);
        if (phrase == null) return;

        var sourceLangCode = wsLanguagePair.getSourceLanguage().code;
        var url = phrase.pronunciation;
        if (url == null) url = this._getGooglePronunciationUrl(sourceLangCode, phrase.phrase);

        this._pronuance(url);
    },
    pronuancePhrase: function (phrase) {
        var sourceLangCode = wsLanguagePair.getSourceLanguage().code;
        var url = this._getGooglePronunciationUrl(sourceLangCode, phrase);

        this._pronuance(url);
    },
    _pronuance: function (url) {
        var player = document.getElementById('wsPronunciationPlayer');
        player.src = url;
        player.play();
    },
    _getGooglePronunciationUrl: function (langCode, phrase) {
        return String.Format('http://translate.google.com/translate_tts?tl={0}&q={1}', encodeURIComponent(langCode), encodeURIComponent(phrase));
    }
};