const path = require('path');

const SUPPORTED = ['id', 'en'];

class LocaleManager {
    constructor() {
        this._locales = {};
        for (const lang of SUPPORTED) {
            this._locales[lang] = require(path.join(__dirname, `../locales/${lang}.json`));
        }
    }

    /**
     * Translate a key for a given language, falling back to 'id' if missing.
     * Supports variable interpolation: t('key', 'en', { title: 'Song' }) → "Added **Song** to the queue!"
     */
    t(lang, key, vars = {}) {
        const locale = this._locales[lang] || this._locales['id'];
        let text = locale[key] ?? this._locales['id'][key] ?? key;
        for (const [k, v] of Object.entries(vars)) {
            text = text.replaceAll(`{${k}}`, v);
        }
        return text;
    }

    isSupported(lang) {
        return SUPPORTED.includes(lang?.toLowerCase());
    }

    getSupported() {
        return SUPPORTED;
    }
}

module.exports = new LocaleManager();
