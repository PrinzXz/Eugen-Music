const db = require('./Database');

class SessionManager {
    getSessions() {
        const rows = db.prepare('SELECT guild_id, data FROM guild_sessions').all();
        const sessions = {};
        for (const row of rows) {
            try {
                sessions[row.guild_id] = JSON.parse(row.data);
            } catch (e) {
                console.error(`Failed to parse session data for guild ${row.guild_id}`, e);
            }
        }
        return sessions;
    }

    saveSession(dispatcher) {
        if (!dispatcher || !dispatcher.guildId) return;

        // Extract relevant state
        const sessionData = {
            guildId: dispatcher.guildId,
            textChannelId: dispatcher.textChannelId,
            nowPlayingMessageId: dispatcher.nowPlayingMessage ? dispatcher.nowPlayingMessage.id : null,
            voiceChannelId: null, // Will fetch from bot's voice state
            summonerId: dispatcher.summonerId,
            loop: dispatcher.loop,
            autoplay: dispatcher.autoplay,
            twentyFourSeven: dispatcher.twentyFourSeven,
            current: dispatcher.current || null,
            queue: dispatcher.queue || [],
            history: dispatcher.history || [],
            previousTracks: dispatcher.previousTracks || [],
            position: dispatcher.player?.position || 0,
            volume: require('./VolumeManager').getVolume(dispatcher.summonerId)
        };

        // Get Voice Channel ID
        const channel = dispatcher.client.channels.cache.get(dispatcher.textChannelId);
        if (channel && channel.guild) {
            const voiceState = channel.guild.members.me?.voice;
            if (voiceState && voiceState.channelId) {
                sessionData.voiceChannelId = voiceState.channelId;
            }
        }

        const strData = JSON.stringify(sessionData);
        const row = db.prepare('SELECT guild_id FROM guild_sessions WHERE guild_id = ?').get(dispatcher.guildId);
        if (!row) {
            db.prepare('INSERT INTO guild_sessions (guild_id, data) VALUES (?, ?)').run(dispatcher.guildId, strData);
        } else {
            db.prepare('UPDATE guild_sessions SET data = ? WHERE guild_id = ?').run(strData, dispatcher.guildId);
        }
    }

    deleteSession(guildId) {
        if (!guildId) return;
        db.prepare('DELETE FROM guild_sessions WHERE guild_id = ?').run(guildId);
    }
}

module.exports = new SessionManager();
