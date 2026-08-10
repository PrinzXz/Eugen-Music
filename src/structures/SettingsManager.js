const db = require('./Database');

class SettingsManager {
    constructor() {
        this.defaultTemplate = `${require('../../config').emojis.music} {judul}`;
    }

    // User Settings (Autoplay, 24/7, Loop, Status Template)
    _ensureUser(userId) {
        const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
        if (!row) {
            db.prepare('INSERT INTO user_settings (user_id, statusTemplate) VALUES (?, ?)').run(userId, this.defaultTemplate);
        }
    }

    _getUserRow(userId) {
        this._ensureUser(userId);
        return db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
    }

    _updateUserRow(userId, field, value) {
        this._ensureUser(userId);
        db.prepare(`UPDATE user_settings SET ${field} = ? WHERE user_id = ?`).run(value, userId);
    }

    getAutoplay(userId) {
        return Boolean(this._getUserRow(userId).autoplay);
    }

    setAutoplay(userId, value) {
        this._updateUserRow(userId, 'autoplay', value ? 1 : 0);
    }

    get247(userId) {
        return Boolean(this._getUserRow(userId).twentyFourSeven);
    }

    set247(userId, value) {
        this._updateUserRow(userId, 'twentyFourSeven', value ? 1 : 0);
    }

    getLoopMode(userId) {
        return this._getUserRow(userId).loop;
    }

    setLoopMode(userId, mode) {
        this._updateUserRow(userId, 'loop', mode);
    }
    
    setLoop(userId, mode) {
        this.setLoopMode(userId, mode);
    }

    getStatusTemplate(userId) {
        return this._getUserRow(userId).statusTemplate || this.defaultTemplate;
    }

    setStatusTemplate(userId, template) {
        this._updateUserRow(userId, 'statusTemplate', template);
    }

    getLanguage(userId) {
        return this._getUserRow(userId).language || 'id';
    }

    setLanguage(userId, lang) {
        this._updateUserRow(userId, 'language', lang);
    }
}

module.exports = new SettingsManager();
