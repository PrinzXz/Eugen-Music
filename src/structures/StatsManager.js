const db = require('./Database');

class StatsManager {
    _getUserData(userId) {
        const row = db.prepare('SELECT data FROM user_stats WHERE user_id = ?').get(userId);
        if (row) {
            try { return JSON.parse(row.data); } catch(e) {}
        }
        return {
            totalListenTime: 0,
            servers: {},
            tracks: {},
            friends: {}
        };
    }

    _saveUserData(userId, data) {
        const str = JSON.stringify(data);
        const row = db.prepare('SELECT user_id FROM user_stats WHERE user_id = ?').get(userId);
        if (!row) {
            db.prepare('INSERT INTO user_stats (user_id, data) VALUES (?, ?)').run(userId, str);
        } else {
            db.prepare('UPDATE user_stats SET data = ? WHERE user_id = ?').run(str, userId);
        }
    }

    /**
     * @param {string} guildId 
     * @param {string} guildName 
     * @param {string} trackTitle 
     * @param {number} durationMs 
     * @param {Array<{id: string, username: string}>} listeners
     */
    addPlay(guildId, guildName, trackTitle, durationMs, listeners) {
        if (!listeners || listeners.length === 0) return;

        for (const listener of listeners) {
            const userId = listener.id;
            const userStats = this._getUserData(userId);

            if (!userStats.friends) userStats.friends = {}; // Migration

            userStats.totalListenTime += durationMs;

            // Server stats
            if (!userStats.servers[guildId]) {
                userStats.servers[guildId] = { name: guildName, listenTime: 0 };
            } else {
                userStats.servers[guildId].name = guildName;
            }
            userStats.servers[guildId].listenTime += durationMs;

            // Track stats
            if (!userStats.tracks[trackTitle]) {
                userStats.tracks[trackTitle] = 0;
            }
            userStats.tracks[trackTitle] += durationMs;

            // Friend stats
            for (const other of listeners) {
                if (other.id === userId) continue;
                if (!userStats.friends[other.id]) {
                    userStats.friends[other.id] = { username: other.username, listenTime: 0 };
                } else {
                    userStats.friends[other.id].username = other.username;
                }
                userStats.friends[other.id].listenTime += durationMs;
            }

            this._saveUserData(userId, userStats);
        }
    }

    getStats(userId) {
        const row = db.prepare('SELECT data FROM user_stats WHERE user_id = ?').get(userId);
        if (!row) return null;
        
        let userStats;
        try {
            userStats = JSON.parse(row.data);
        } catch(e) {
            return null;
        }
        
        // Sort servers by listen time
        const topServers = Object.values(userStats.servers)
            .sort((a, b) => b.listenTime - a.listenTime)
            .slice(0, 3);

        // Sort tracks by listen time
        const topTracks = Object.entries(userStats.tracks)
            .map(([title, listenTime]) => ({ title, listenTime }))
            .sort((a, b) => b.listenTime - a.listenTime)
            .slice(0, 3);

        // Sort friends by listen time
        const topFriends = Object.values(userStats.friends || {})
            .sort((a, b) => b.listenTime - a.listenTime)
            .slice(0, 3);

        return {
            totalListenTime: userStats.totalListenTime,
            topServers,
            topTracks,
            topFriends
        };
    }
}

module.exports = new StatsManager();
