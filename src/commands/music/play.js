const {
    ApplicationCommandOptionType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ContainerBuilder, TextDisplayBuilder, MessageFlags,
} = require('discord.js');
const { ThumbnailBuilder } = require('@discordjs/builders');
const Dispatcher = require('../../structures/Dispatcher');
const VolumeManager = require('../../structures/VolumeManager');
const SettingsManager = require('../../structures/SettingsManager');

const SEARCH_PROVIDERS = ['ytsearch', 'ytmsearch', 'scsearch', 'amsearch'];
const SPOTIFY_PLAYLIST_PAGE_SIZE = 100;

module.exports = {
    name: 'play',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['p'],
    description: 'Putar lagu dari YouTube, Spotify, SoundCloud, dan lainnya.',
    options: [
        {
            name: 'query',
            description: 'Nama lagu atau URL',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const query = ctx.getString('query', 0);
        if (!query) return ctx.send(`${client.config.emojis.error} ${ctx.t('error.no_voice_channel')}`);
        await handlePlay(client, ctx, query);
    },

    handlePlay,
};

async function handlePlay(client, ctx, query) {
    const { member, guild, channel } = ctx;
    const e = client.config.emojis;

    if (!member?.voice?.channelId) {
        return ctx.sendTemporary(`${e.error} ${ctx.t('error.no_voice_channel')}`);
    }

    const botChannelId = guild.members.me?.voice?.channelId;
    if (botChannelId && member.voice.channelId !== botChannelId) {
        return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
    }

    if (ctx.isInteraction) await ctx.deferReply();

    const node = client.shoukaku.getIdealNode();
    if (!node) {
        return ctx.send(`${e.error} ${ctx.t('error.no_lavalink')}`, true);
    }

    const { result, allSpotifyTracks, spotifyPlaylistData } = await resolveQuery(node, query, client, ctx);
    if (!result) return;

    const dispatcher = await ensureDispatcher(client, ctx, member, guild, channel);
    if (!dispatcher) return;

    const requester = ctx.user || ctx.author;
    await queueResult(ctx, dispatcher, result, allSpotifyTracks, requester);

    if (!dispatcher.current) dispatcher.play();

    if (allSpotifyTracks.length > 0) {
        await handleSpotifyPagination(ctx, dispatcher, node, allSpotifyTracks, spotifyPlaylistData, query, requester);
    }
}

async function resolveQuery(node, query, client, ctx) {
    const e = client.config.emojis;
    let result = null;
    let allSpotifyTracks = [];
    let spotifyPlaylistData = null;

    if (typeof query === 'object' && query !== null && query.encoded) {
        return { result: { loadType: 'track', data: query }, allSpotifyTracks, spotifyPlaylistData };
    }

    const isUrl = /^https?:\/\//.test(query);
    const isSpotify = query.includes('spotify.com');

    result = await resolveWithFallback(node, query, isUrl);

    if (!result || result.loadType === 'empty' || result.loadType === 'error') {
        if (isSpotify) {
            const spotifyResult = await resolveSpotify(node, query, client, ctx, e);
            if (!spotifyResult) return { result: null, allSpotifyTracks, spotifyPlaylistData };
            result = spotifyResult.result;
            allSpotifyTracks = spotifyResult.allSpotifyTracks || [];
            spotifyPlaylistData = spotifyResult.spotifyPlaylistData;
        } else {
            await ctx.send(`${e.error} ${ctx.t('play.not_found')}`, true);
            return { result: null, allSpotifyTracks, spotifyPlaylistData };
        }
    }

    return { result, allSpotifyTracks, spotifyPlaylistData };
}

async function resolveWithFallback(node, query, isUrl) {
    if (isUrl) {
        try {
            return await node.rest.resolve(query);
        } catch {
            return null;
        }
    }

    for (const provider of SEARCH_PROVIDERS) {
        try {
            const result = await node.rest.resolve(`${provider}:${query}`);
            if (result && result.loadType !== 'empty' && result.loadType !== 'error') {
                return result;
            }
        } catch {
            // Lanjut ke provider berikutnya jika terjadi error
            continue;
        }
    }
    return null;
}

async function resolveSpotify(node, query, client, ctx, e) {
    try {
        const config = require('../../../config');
        const { getData, getTracks } = require('spotify-url-info')(fetch);
        let data = await getData(query).catch(() => null);
        let tracks;

        if (query.includes('/playlist/') && config.spotifyApiKey) {
            const match = query.match(/playlist\/([a-zA-Z0-9]+)/);
            if (match?.[1]) {
                try {
                    const res = await fetch('https://anabot.my.id/api/spotify/playlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: match[1], apikey: config.spotifyApiKey }),
                    });
                    const apiData = await res.json();
                    if (apiData?.success && apiData.result) {
                        data = { ...data, type: 'playlist', name: apiData.result.name, owner: apiData.result.owner };
                        tracks = apiData.result.tracks;
                    }
                } catch {
                    // Fall through to spotify-url-info
                }
            }
        }

        if (!tracks && data && (data.type === 'playlist' || data.type === 'album')) {
            tracks = await getTracks(query);
        }

        if (!data) {
            await ctx.send(`${e.error} ${ctx.t('play.spotify_metadata_failed')}`, true);
            return null;
        }

        if (data.type === 'track') {
            const artist = data.artists?.[0]?.name || data.artist || '';
            const result = await node.rest.resolve(`ytsearch:${data.name} ${artist}`);
            if (result?.data) {
                const trk = Array.isArray(result.data) ? result.data[0] : result.data;
                if (trk?.info) { trk.info.title = data.name; trk.info.author = artist; }
            }
            return { result, allSpotifyTracks: [], spotifyPlaylistData: null };
        }

        if (data.type === 'playlist' || data.type === 'album') {
            if (!tracks?.length) {
                await ctx.send(`${e.error} ${ctx.t('play.spotify_empty')}`, true);
                return null;
            }

            const firstTrack = tracks[0];
            const artist = firstTrack.artists?.[0]?.name || firstTrack.artist || '';
            let result = null;

            for (const provider of SEARCH_PROVIDERS) {
                result = await node.rest.resolve(`${provider}:${firstTrack.name} ${artist}`);
                if (result && result.loadType !== 'empty' && result.loadType !== 'error') break;
            }

            if (!result || result.loadType === 'empty' || result.loadType === 'error') {
                await ctx.sendTemporary(`${e.error} ${ctx.t('play.first_track_failed')}`, ctx.isInteraction);
                return null;
            }

            const trk = Array.isArray(result.data) ? result.data[0] : result.data;
            if (trk?.info) { trk.info.title = firstTrack.name; trk.info.author = artist; }

            return { result, allSpotifyTracks: tracks, spotifyPlaylistData: data };
        }
    } catch (err) {
        console.error('[play] Spotify resolve error:', err);
        await ctx.send(`${e.error} ${ctx.t('play.spotify_failed')}`, true);
        return null;
    }
    return null;
}

async function ensureDispatcher(client, ctx, member, guild, channel) {
    const e = client.config.emojis;
    let dispatcher = client.queues.get(guild.id);
    if (dispatcher) return dispatcher;

    client.joinLocks = client.joinLocks || new Set();
    if (client.joinLocks.has(guild.id)) {
        await ctx.send(`${e.loading} ${ctx.t('error.joining')}`, true);
        return null;
    }

    client.joinLocks.add(guild.id);
    try {
        const player = await client.shoukaku.joinVoiceChannel({
            guildId: guild.id,
            channelId: member.voice.channelId,
            shardId: guild.shardId,
            deaf: true,
        });

        if (guild.members.me.voice.channel) {
            guild.members.me.voice.setDeaf(true).catch(() => {});
        }

        dispatcher = new Dispatcher(client, guild.id, channel.id, player);
        dispatcher.summonerId = member.id;

        const savedVol = VolumeManager.getVolume(member.id);
        if (savedVol !== 100) player.setGlobalVolume(savedVol);

        dispatcher.autoplay = SettingsManager.getAutoplay(member.id);
        dispatcher.twentyFourSeven = SettingsManager.get247(member.id);
        client.queues.set(guild.id, dispatcher);
        return dispatcher;
    } catch (error) {
        console.error('[play] Failed to join VC:', error);
        await ctx.send(`${e.error} ${ctx.t('error.join_failed')}`, true);
        return null;
    } finally {
        client.joinLocks.delete(guild.id);
    }
}

async function queueResult(ctx, dispatcher, result, allSpotifyTracks, requester) {
    const e = ctx.client.config.emojis;

    if (result.loadType === 'playlist') {
        for (const track of result.data.tracks) {
            if (!track?.info) continue;
            track.info.requester = requester;
            dispatcher.queue.push(track);
        }
        await ctx.send(`${e.success} ${ctx.t('play.added_playlist', { count: result.data.tracks.length, name: result.data.info.name })}`, ctx.isInteraction);
        return;
    }

    const track = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!track) return;

    track.info.requester = requester;
    dispatcher.queue.push(track);

    const isFirstSong = !dispatcher.current && dispatcher.queue.length === 1;
    const hasMoreSpotify = allSpotifyTracks.length > 0;

    if (!isFirstSong && !hasMoreSpotify) {
        await ctx.send(`${e.success} ${ctx.t('play.added_track', { title: track.info.title })}`, ctx.isInteraction);
    } else if (isFirstSong && !hasMoreSpotify) {
        await ctx.deleteReply().catch(() => {});
    }
}

async function handleSpotifyPagination(ctx, dispatcher, node, allSpotifyTracks, spotifyPlaylistData, query, requester) {
    const loadId = Date.now();
    dispatcher.backgroundLoadId = loadId;

    const coverImage = spotifyPlaylistData?.coverArt?.sources?.[0]?.url
        || 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png';

    const buildPagePayload = (pageIdx) => {
        const start = (pageIdx - 1) * SPOTIFY_PLAYLIST_PAGE_SIZE;
        const count = Math.min(allSpotifyTracks.length - start, SPOTIFY_PLAYLIST_PAGE_SIZE);
        const remaining = allSpotifyTracks.length - start - count;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**🎶 Menambahkan Playlist Spotify**\n\n**Playlist:** [${spotifyPlaylistData.name}](${query})\n**Total Lagu:** ${allSpotifyTracks.length}\n**Memuat Halaman:** ${pageIdx} (${count} Lagu)`
            ));

        try { container.setThumbnail(new ThumbnailBuilder().setURL(coverImage)); } catch {}

        const components = [container];
        if (remaining > 0) {
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`load_page_${pageIdx + 1}`)
                    .setLabel(`Load page ${pageIdx + 1}`)
                    .setStyle(ButtonStyle.Secondary)
            ));
        }

        return {
            components,
            flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
            content: '',
            remaining,
        };
    };

    const processPage = async (pageIdx) => {
        const start = (pageIdx - 1) * SPOTIFY_PLAYLIST_PAGE_SIZE;
        const end = start + SPOTIFY_PLAYLIST_PAGE_SIZE;
        const tracksToProcess = pageIdx === 1
            ? allSpotifyTracks.slice(1, end)
            : allSpotifyTracks.slice(start, end);

        for (const t of tracksToProcess) {
            if (dispatcher.backgroundLoadId !== loadId || dispatcher.stopped) break;
            await new Promise(r => setTimeout(r, 100));
            try {
                const artist = t.artists?.[0]?.name || t.artist || '';
                let resolved = null;

                for (const provider of SEARCH_PROVIDERS) {
                    resolved = await node.rest.resolve(`${provider}:${t.name} ${artist}`);
                    if (resolved && resolved.loadType !== 'empty' && resolved.loadType !== 'error') break;
                }

                if (resolved?.data) {
                    const trk = Array.isArray(resolved.data) ? resolved.data[0] : resolved.data;
                    if (trk?.info) { trk.info.title = t.name; trk.info.author = artist; }
                    trk.info.requester = requester;
                    if (dispatcher.isShuffled) {
                        const idx = Math.floor(Math.random() * (dispatcher.queue.length + 1));
                        dispatcher.queue.splice(idx, 0, trk);
                    } else {
                        dispatcher.queue.push(trk);
                    }
                }
            } catch (err) {
                console.error('[play] Spotify background load error:', err);
            }
        }
    };

    const loadAndShowPage = async (msgToEdit, pageIdx) => {
        const { components, flags, content, remaining } = buildPagePayload(pageIdx);
        const payload = { components, flags, content };

        let promptMsg;
        if (msgToEdit) {
            promptMsg = await msgToEdit.edit(payload).catch(() => {});
        } else {
            if (ctx.isInteraction) {
                await ctx.editReply(payload).catch(() => {});
                promptMsg = await ctx.fetchReply().catch(() => {});
            } else {
                promptMsg = await ctx.channel.send(payload).catch(() => {});
            }
        }

        if (remaining > 0 && promptMsg) {
            try {
                const filter = i => i.customId === `load_page_${pageIdx + 1}` && i.user.id === requester.id;
                const response = await promptMsg.awaitMessageComponent({ filter, time: 60000 });
                await response.deferUpdate().catch(() => {});
                processPage(pageIdx + 1);
                await loadAndShowPage(promptMsg, pageIdx + 1);
            } catch {
                const { components: cleanComponents } = buildPagePayload(pageIdx);
                await promptMsg.edit({ components: [cleanComponents[0]] }).catch(() => {});
            }
        }
    };

    processPage(1);
    await loadAndShowPage(null, 1);
}
