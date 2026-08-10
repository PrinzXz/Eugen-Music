const db = require('./Database');

class VolumeManager {
    setVolume(userId, amount) {
        const row = db.prepare('SELECT * FROM user_volume WHERE user_id = ?').get(userId);
        if (!row) {
            db.prepare('INSERT INTO user_volume (user_id, volume) VALUES (?, ?)').run(userId, amount);
        } else {
            db.prepare('UPDATE user_volume SET volume = ? WHERE user_id = ?').run(amount, userId);
        }
    }

    getVolume(userId) {
        const row = db.prepare('SELECT volume FROM user_volume WHERE user_id = ?').get(userId);
        return row ? row.volume : 100; // Default volume is 100%
    }
}

module.exports = new VolumeManager();
