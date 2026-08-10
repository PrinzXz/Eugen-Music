const {
    ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle,
    ContainerBuilder, TextDisplayBuilder, MessageFlags,
} = require('discord.js');
const {
    SectionBuilder, ThumbnailBuilder, SeparatorBuilder,
    MediaGalleryBuilder, MediaGalleryItemBuilder,
} = require('@discordjs/builders');

const StatsManager = require('./StatsManager');
const SettingsManager = require('./SettingsManager');
const VolumeManager = require('./VolumeManager');
const SessionManager = require('./SessionManager');
const { setVoiceStatus, sendContainer } = require('./Utils');
const { generateProgressBar } = require('./ProgressBarGenerator');
const { resolveAutoplayTrack } = require('./AutoplayManager');
const LocaleManager = require('./LocaleManager');

class Dispatcher {
    constructor(client, guildId, textChannelId, player) {
        this.client = client;
        this.guildId = guildId;
        this.textChannelId = textChannelId;
        this.player = player;

        this.queue = [];
        this.current = null;
        this.previous = null;
        this.history = [];
        this.previousTracks = [];

        this.loop = 'none'; // 'none' | 'track' | 'queue'
        this.autoplay = false;
        this.twentyFourSeven = false;
        this.stopped = false;

        this.summonerId = null;
        this.trustedUsers = new Set();
        this.skipVotes = new Set();

        this.idleTimeout = null;
        this.isTransitioning = false;
        this.isUpdatingMessage = false;
        this.isFetchingAutoplay = false;

        this.isPlayingTTS = false;
        this.ttsOriginalTrack = null;
        this.ttsOriginalPosition = 0;
        this.ttsEnabled = false;
        this.isShuffled = false;

        this._registerPlayerEvents();
    }

    _registerPlayerEvents() {
        this.player.on('start', () => this._onTrackStart());
        this.player.on('end', (data) => this._onTrackEnd(data));
        this.player.on('closed', (data) => this._onPlayerClosed(data));
        this.player.on('error', (err) => this._onPlayerError(err));
        this.player.on('exception', (data) => this._onPlayerException(data));
    }

    async _onTrackStart() {
        this.saveSession();

        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }

        if (!this.current) return;

        const channel = this.client.channels.cache.get(this.textChannelId);
        const voiceChannel = channel?.guild?.members?.me?.voice?.channel;

        this._updateVoiceStatus(voiceChannel);

        if (channel && this.current) {
            if (this.progressInterval) clearInterval(this.progressInterval);

            if (this.startMessageTimeout) clearTimeout(this.startMessageTimeout);
            this.startMessageTimeout = setTimeout(() => this.updateMessage(true), 1000);

            this.progressInterval = setInterval(() => {
                if (this.player && !this.player.paused && this.current) {
                    this.updateMessage(false);
                }
            }, 15000);
        }
    }

    _updateVoiceStatus(voiceChannel) {
        if (!voiceChannel || !this.current) return;

        const requesterId = this.current.info.requester?.id || this.client.user.id;
        const template = SettingsManager.getStatusTemplate(requesterId);
        if (!template || template === 'off') return;

        const statusText = template
            .replace(/{judul}/gi, this.current.info.title || 'Unknown Title')
            .replace(/{author}/gi, this.current.info.author || 'Unknown Author')
            .replace(/{durasi}/gi, this.formatTime(this.current.info.length))
            .substring(0, 500);

        setVoiceStatus(voiceChannel.id, statusText).catch(err => {
            if (!err.message.includes('503')) {
                console.error('Failed to set VC status:', err.message);
            }
        });
    }

    _onTrackEnd(data) {
        if (this.startMessageTimeout) clearTimeout(this.startMessageTimeout);
        if (this.progressInterval) clearInterval(this.progressInterval);

        this._recordPlayStats();

        if (data?.reason === 'REPLACED') return;

        if (this.isPlayingTTS) {
            this._resumeAfterTTS();
            return;
        }

        if (data?.reason === 'loadFailed') {
            console.error(`[Lavalink] Load failed: ${this.current?.info?.title || 'Unknown'}`);
        }

        if (!this.stopped) {
            this.playNext(data?.reason === 'loadFailed');
        }
    }

    _recordPlayStats() {
        if (!this.current || !this.trackStartTime || this.isPlayingTTS) return;

        const durationMs = Date.now() - this.trackStartTime;
        if (durationMs < 5000) return;

        const channel = this.client.channels.cache.get(this.textChannelId);
        const voiceChannel = channel?.guild?.members?.me?.voice?.channel;
        const listeners = [];

        if (voiceChannel) {
            voiceChannel.members.forEach(member => {
                if (!member.user.bot) {
                    listeners.push({ id: member.user.id, username: member.user.username });
                }
            });
        }

        if (listeners.length > 0) {
            const guildName = channel?.guild?.name || 'Unknown';
            StatsManager.addPlay(this.guildId, guildName, this.current.info.title, durationMs, listeners);
        }
    }

    _resumeAfterTTS() {
        this.isPlayingTTS = false;
        if (!this.ttsOriginalTrack) return;

        this.current = this.ttsOriginalTrack;
        this.player.playTrack({
            track: { encoded: this.ttsOriginalTrack.encoded },
            position: this.ttsOriginalPosition,
        });
        this.ttsOriginalTrack = null;
        this.ttsOriginalPosition = 0;
    }

    _onPlayerClosed(data) {
        if (this.progressInterval) clearInterval(this.progressInterval);
        if (this.stopped) return;

        // 4014 = Disconnected (kicked from VC), 4006 = Session no longer valid
        if (data?.code === 4014 || data?.code === 4006) {
            return this.destroy();
        }

        if (data?.code === 1000 && data?.byRemote === false) return;

        console.log('[Dispatcher] Player closed abnormally, attempting reconnect...', data);
        const channel = this.client.channels.cache.get(this.textChannelId);
        const voiceChannel = channel?.guild?.members?.me?.voice?.channel;

        if (voiceChannel) {
            setTimeout(async () => {
                if (!this.exists || this.stopped) return;
                try {
                    await this.client.shoukaku.joinVoiceChannel({
                        guildId: this.guildId,
                        channelId: voiceChannel.id,
                        shardId: channel.guild.shardId,
                        deaf: true,
                    });
                    if (channel.guild.members.me.voice.channel) {
                        channel.guild.members.me.voice.setDeaf(true).catch(() => {});
                    }
                } catch (err) {
                    console.error('[Dispatcher] Auto-reconnect failed:', err);
                }
            }, 1000);
        }
    }

    _onPlayerError(err) {
        if (this.progressInterval) clearInterval(this.progressInterval);
        console.error('[Dispatcher] Player error:', err);
    }

    _onPlayerException(data) {
        if (this.progressInterval) clearInterval(this.progressInterval);
        console.error(`[Dispatcher] Exception on "${this.current?.info?.title || 'Unknown'}":`, data);

        // Safety net: force skip if Lavalink doesn't fire 'end' event
        setTimeout(() => {
            if (this.current && !this.isTransitioning) this.playNext(true);
        }, 2000);
    }

    get exists() {
        return this.client.queues.has(this.guildId);
    }

    saveSession() {
        if (this.exists) SessionManager.saveSession(this);
    }

    isAuthorized(userId) {
        if (userId === this.summonerId || this.trustedUsers.has(userId)) return true;

        const channel = this.client.channels.cache.get(this.textChannelId);
        const voiceChannel = channel?.guild?.members?.me?.voice?.channel;
        if (!voiceChannel) return true;

        return !voiceChannel.members.has(this.summonerId);
    }

    async updateMessage(isNew = false) {
        if (!this.current) return;
        const channel = this.client.channels.cache.get(this.textChannelId);
        if (!channel) return;
        if (!isNew && (!this.nowPlayingMessage || !this.nowPlayingMessage.editable)) return;
        if (this.isUpdatingMessage) return;

        this.isUpdatingMessage = true;
        try {
            const msgPayload = await this._buildNowPlayingPayload();

            if (isNew) {
                if (this.nowPlayingCollector) {
                    this.nowPlayingCollector.stop('newTrack');
                    this.nowPlayingCollector = null;
                }

                const trackWhenStarted = this.current;
                const msg = await channel.send(msgPayload).catch(err => {
                    if (err.status !== 503 && err.status !== 500) console.error('[Dispatcher] Send error:', err.message || err);
                });

                if (msg) {
                    if (this.current !== trackWhenStarted) {
                        msg.delete().catch(() => {});
                    } else {
                        this.nowPlayingMessage = msg;
                        this._attachNowPlayingCollector(msg);
                    }
                }
            } else {
                await this.nowPlayingMessage.edit(msgPayload).catch(err => {
                    if (err.status !== 503 && err.status !== 500) console.error('[Dispatcher] Edit error:', err.message || err);
                });
            }
        } catch (error) {
            if (error.status !== 503 && error.status !== 500) console.error('[Dispatcher] updateMessage error:', error.message || error);
        } finally {
            this.isUpdatingMessage = false;
            if (!isNew && !this.stopped && this.current) this.saveSession();
        }
    }

    async _buildNowPlayingPayload() {
        const e = this.client.config.emojis;
        const requesterId = this.current.info.requester?.id || this.client.user.id;
        const currentVol = VolumeManager.getVolume(this.summonerId);
        const loopEmoji = this.loop === 'track' ? e.loop_track : (this.loop === 'queue' ? e.loop_queue : e.loop_none);
        const nextTrack = this.queue[0];

        const lang = SettingsManager.getLanguage(this.summonerId);
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e.music} **${LocaleManager.t(lang, 'np.now_playing')}**`));
        container.addSeparatorComponents(new SeparatorBuilder());

        let desc = `**[${this.current.info.title}](${this.current.info.uri || ''})**\n`;
        desc += `${e.mic} ${this.current.info.author}\n\n`;
        desc += `${e.user} <@${requesterId}>  ${e.volume} ${currentVol}%  ${e.list} ${this.queue.length} ${LocaleManager.t(lang, 'np.in_queue')}\n`;
        desc += `${loopEmoji}  ${this.autoplay ? e.autoplay : ''}`;
        if (nextTrack) desc += `\n${e.next} **${LocaleManager.t(lang, 'np.up_next')}:** ${nextTrack.info.title}`;

        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(desc));

        const artworkUrl = this._resolveArtworkUrl();
        if (artworkUrl) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(artworkUrl));
        container.addSectionComponents(section);

        const buffer = await generateProgressBar(this.player.position, this.current.info.length, this.current.info.isStream);
        const attachment = new AttachmentBuilder(buffer, { name: 'progress.png' });
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL('attachment://progress.png'))
        );

        const buttonsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('np_pause_resume').setEmoji(this.player.paused ? e.play : e.pause).setStyle(this.player.paused ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('np_skip').setEmoji(e.skip).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('np_stop').setEmoji(e.stop).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('np_loop').setEmoji(loopEmoji).setStyle(this.loop === 'none' ? ButtonStyle.Secondary : ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('np_shuffle').setEmoji(e.shuffle).setStyle(ButtonStyle.Secondary),
        );
        container.addActionRowComponents(buttonsRow);

        return {
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
            files: [attachment],
        };
    }

    _resolveArtworkUrl() {
        if (this.current.info.artworkUrl) return this.current.info.artworkUrl;
        if (this.current.info.uri?.includes('youtube.com')) {
            const videoId = this.current.info.uri.split('v=')[1]?.split('&')[0];
            if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
        return null;
    }

    _attachNowPlayingCollector(msg) {
        const e = this.client.config.emojis;
        const collector = msg.createMessageComponentCollector({ time: 6 * 60 * 60 * 1000 });
        this.nowPlayingCollector = collector;

        collector.on('collect', async interaction => {
            const memberChannelId = interaction.member?.voice?.channelId;
            const botChannelId = interaction.guild?.members?.me?.voice?.channelId;
            const lang = SettingsManager.getLanguage(interaction.user.id);

            if (!memberChannelId || memberChannelId !== botChannelId) {
                return interaction.reply({ content: `${e.error} ${LocaleManager.t(lang, 'dispatcher.not_in_vc')}`, flags: 64 });
            }

            const id = interaction.customId;
            const isAuth = this.isAuthorized(interaction.user.id);

            if (!isAuth && id !== 'np_skip') {
                return interaction.reply({ content: `${e.error} ${LocaleManager.t(lang, 'dispatcher.not_authorized')}`, flags: 64 });
            }

            try {
                await this._handleNowPlayingButton(interaction, id, isAuth, e, lang);
            } catch (err) {
                console.error('[Dispatcher] Button error:', err);
                interaction.reply({ content: `${e.error} ${LocaleManager.t(lang, 'dispatcher.error')}`, flags: 64 }).catch(() => {});
            }
        });

        collector.on('end', () => {
            if (this.nowPlayingCollector === collector) this.nowPlayingCollector = null;
        });
    }

    async _handleNowPlayingButton(interaction, id, isAuth, e, lang) {
        switch (id) {
            case 'np_pause_resume': {
                this.player.setPaused(!this.player.paused);
                const key = this.player.paused ? 'dispatcher.paused' : 'dispatcher.resumed';
                const pauseEmoji = this.player.paused ? e.pause : e.play;
                await interaction.reply({ content: `${pauseEmoji} ${LocaleManager.t(lang, key)}`, flags: 64 });
                this.updateMessage();
                break;
            }
            case 'np_skip': {
                if (!isAuth) {
                    const vc = interaction.guild.members.me.voice.channel;
                    const memberCount = vc ? vc.members.filter(m => !m.user.bot && !m.voice.deaf).size : 1;
                    const required = Math.ceil(memberCount / 2);
                    this.skipVotes.add(interaction.user.id);
                    if (this.skipVotes.size >= required) {
                        await interaction.deferUpdate().catch(() => {});
                        this.skip();
                    } else {
                        await interaction.reply({ content: `${e.success} ${LocaleManager.t(lang, 'dispatcher.vote_skip', { current: this.skipVotes.size, required })}`, flags: 64 });
                    }
                } else {
                    await interaction.deferUpdate().catch(() => {});
                    this.skip();
                }
                break;
            }
            case 'np_stop':
                this.destroy();
                await interaction.reply({ content: `${e.stop} ${LocaleManager.t(lang, 'dispatcher.stopped')}`, flags: 64 });
                break;
            case 'np_loop':
                await interaction.deferUpdate();
                this.loop = this.loop === 'none' ? 'track' : (this.loop === 'track' ? 'queue' : 'none');
                SettingsManager.setLoop(interaction.user.id, this.loop);
                this.updateMessage();
                break;
            case 'np_shuffle':
                if (this.queue.length === 0) {
                    await interaction.reply({ content: `${e.error} ${LocaleManager.t(lang, 'error.queue_empty')}`, flags: 64 });
                } else {
                    this.shuffle();
                    await interaction.reply({ content: `${e.shuffle} ${LocaleManager.t(lang, 'dispatcher.shuffled')}`, flags: 64 });
                }
                break;
        }
    }

    async play() {
        if (!this.exists) return this.destroy();
        if (this.isFetchingAutoplay) return;

        if (!this.queue.length) {
            if (this.autoplay && this.previous) {
                this.isFetchingAutoplay = true;
                try {
                    const track = await resolveAutoplayTrack(this);
                    if (track) this.queue.push(track);
                } catch (err) {
                    console.error('[Dispatcher] Autoplay error:', err);
                } finally {
                    this.isFetchingAutoplay = false;
                }
            }

            if (!this.queue.length) {
                if (this.twentyFourSeven) return;
                this._startIdleTimeout();
                return;
            }
        }

        this.current = this.queue.shift();
        this.trackStartTime = Date.now();
        this.player.playTrack({ track: { encoded: this.current.encoded } });
    }

    _startIdleTimeout() {
        this.idleTimeout = setTimeout(async () => {
            const channel = this.client.channels.cache.get(this.textChannelId);
            const e = this.client.config.emojis;
            if (channel) {
                const lang = SettingsManager.getLanguage(this.summonerId);
                await sendContainer({ channel }, `${e.loading} ${LocaleManager.t(lang, 'dispatcher.idle')}`, false);
            }
            this.destroy();
        }, 3 * 60 * 1000);
    }

    playNext(wasError = false) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        try {
            this._editNowPlayingEnd(wasError);

            if (this.current) {
                if (this.loop === 'track') {
                    this.queue.unshift(this.current);
                } else if (this.loop === 'queue') {
                    this.queue.push(this.current);
                }

                if (this.current.info.identifier) {
                    this.history.push(this.current.info.identifier);
                    if (this.history.length > 20) this.history.shift();
                }

                this.previousTracks.push(this.current);
                if (this.previousTracks.length > 10) this.previousTracks.shift();
            }

            this.previous = this.current;
            this.current = null;
            this.skipVotes.clear();
            this.play();
        } finally {
            setTimeout(() => {
                if (this.exists) this.isTransitioning = false;
            }, 500);
        }
    }

    _editNowPlayingEnd(wasError) {
        if (!this.nowPlayingMessage?.editable) return;

        const e = this.client.config.emojis;
        const lang = SettingsManager.getLanguage(this.summonerId);
        const titleLink = this.current
            ? `[${this.current.info.title}](${this.current.info.uri || ''})`
            : this.current?.info?.title || '?';

        const key = wasError ? 'dispatcher.play_failed' : 'dispatcher.done_playing';
        const text = `${wasError ? e.error : e.success} ${LocaleManager.t(lang, key, { title: titleLink })}`;

        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

        this.nowPlayingMessage.edit({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
        }).catch(() => {});
    }

    skip() {
        this.player.stopTrack();
    }

    playPrevious() {
        if (!this.previousTracks.length) return;
        if (this.current) this.queue.unshift(this.current);

        const prevTrack = this.previousTracks.pop();
        if (this.history.length > 0) this.history.pop();
        this.queue.unshift(prevTrack);
        this.skip();
    }

    shuffle() {
        this.isShuffled = true;
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }

    destroy() {
        if (this.nowPlayingMessage?.editable) {
            this.nowPlayingMessage.delete().catch(() => {});
        }

        this.stopped = true;
        this.current = null;
        this.queue.length = 0;
        this.history = [];
        this.previousTracks = [];

        if (this.progressInterval) clearInterval(this.progressInterval);
        if (this.idleTimeout) clearTimeout(this.idleTimeout);

        SessionManager.deleteSession(this.guildId);
        this.player.destroy();
        this.client.queues.delete(this.guildId);

        const channel = this.client.channels.cache.get(this.textChannelId);
        const voiceChannel = channel?.guild?.members?.me?.voice?.channel;
        if (voiceChannel) setVoiceStatus(voiceChannel.id, '').catch(() => {});

        this.client.shoukaku.leaveVoiceChannel(this.guildId);
    }

    async playTTS(text) {
        if (this.current && !this.ttsOriginalTrack) {
            this.ttsOriginalTrack = this.current;
            this.ttsOriginalPosition = this.player.position;
        }
        if (this.progressInterval) clearInterval(this.progressInterval);

        const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=id&q=${encodeURIComponent(text)}`;
        const node = this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes);

        try {
            const result = await node.rest.resolve(url);
            if (result?.data) {
                this.isPlayingTTS = true;
                this.player.playTrack({ track: { encoded: result.data.encoded } });
            }
        } catch (err) {
            console.error('[Dispatcher] TTS playback failed:', err);
        }
    }

    formatTime(ms) {
        if (!ms) return '0:00';
        const pad = n => String(n).padStart(2, '0');
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 60000) % 60);
        const hours = Math.floor(ms / 3600000);
        return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
    }
}

module.exports = Dispatcher;
