const SessionManager = require('../../structures/SessionManager');
const Dispatcher = require('../../structures/Dispatcher');

module.exports = async (client, name, resumed) => {
    client.logger.lavalink(`Lavalink Node "${name}" connected. Resumed: ${resumed}`);

    setTimeout(async () => {
        const sessions = SessionManager.getSessions();
        const guildIds = Object.keys(sessions);

        if (!guildIds.length) return;
        client.logger.info(`Found ${guildIds.length} saved session(s). Attempting restore...`);

        for (const guildId of guildIds) {
            try {
                const session = sessions[guildId];
                if (!session.voiceChannelId || !session.current) {
                    SessionManager.deleteSession(guildId);
                    continue;
                }

                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;

                const textChannel = guild.channels.cache.get(session.textChannelId);
                const voiceChannel = guild.channels.cache.get(session.voiceChannelId);

                if (!textChannel || !voiceChannel) {
                    SessionManager.deleteSession(guildId);
                    continue;
                }

                if (session.nowPlayingMessageId) {
                    await textChannel.messages.fetch(session.nowPlayingMessageId)
                        .then(msg => { if (msg?.deletable) return msg.delete(); })
                        .catch(() => {});
                }

                const player = await client.shoukaku.joinVoiceChannel({
                    guildId,
                    channelId: session.voiceChannelId,
                    shardId: guild.shardId,
                    deaf: true,
                });

                if (guild.members.me.voice.channel) {
                    guild.members.me.voice.setDeaf(true).catch(() => {});
                }

                const dispatcher = new Dispatcher(client, guildId, session.textChannelId, player);
                client.queues.set(guildId, dispatcher);

                dispatcher.summonerId = session.summonerId;
                dispatcher.loop = session.loop;
                dispatcher.autoplay = session.autoplay;
                dispatcher.twentyFourSeven = session.twentyFourSeven;
                dispatcher.queue = session.queue;
                dispatcher.history = session.history || [];
                dispatcher.previousTracks = session.previousTracks || [];

                dispatcher.queue.unshift(session.current);
                await dispatcher.play();

                const LocaleManager = require('../../structures/LocaleManager');
                const SettingsManager = require('../../structures/SettingsManager');
                const lang = SettingsManager.getLanguage(session.summonerId);
                textChannel.send({
                    content: `${client.config.emojis.success} ${LocaleManager.t(lang, 'play.session_restored')}`,
                }).catch(() => {});

                // Seek to saved position after track starts, with a short delay
                if (session.position > 1000) {
                    setTimeout(() => {
                        if (dispatcher.player) dispatcher.player.seekTo(session.position);
                    }, 2500);
                }

                client.logger.info(`Restored session for guild "${guildId}"`);
            } catch (err) {
                client.logger.error(`Failed to restore session for guild "${guildId}":`, err);
                SessionManager.deleteSession(guildId);
            }
        }
    }, 5000);
};
