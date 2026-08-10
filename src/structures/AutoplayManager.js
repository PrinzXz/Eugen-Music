/**
 * Handles autoplay track resolution using YouTube Mix as primary source,
 * with multiple search fallbacks when Mix is unavailable.
 */
async function resolveAutoplayTrack(dispatcher) {
    const prev = dispatcher.previous?.info;
    if (!prev) return null;

    let tracks = await fetchYouTubeMix(dispatcher, prev);

    if (!tracks.length) {
        tracks = await fetchSearchFallback(dispatcher, prev);
    }

    tracks = tracks.filter(t => !dispatcher.history.includes(t.info.identifier));
    if (!tracks.length) return null;

    const maxIndex = Math.min(5, tracks.length);
    let track = tracks[Math.floor(Math.random() * maxIndex)];

    if (track.info.title === prev.title && tracks.length > 1) {
        track = tracks.find(t => t.info.title !== prev.title) || tracks[1];
    }

    track.info.requester = dispatcher.client.user;
    return track;
}

async function fetchYouTubeMix(dispatcher, prev) {
    if (prev.sourceName !== 'youtube' || !prev.identifier) return [];
    try {
        const url = `https://www.youtube.com/watch?v=${prev.identifier}&list=RD${prev.identifier}`;
        const res = await dispatcher.player.node.rest.resolve(url);
        if (res?.loadType === 'playlist' && res.data?.tracks) {
            return res.data.tracks;
        }
    } catch {
        // YouTube Mix unavailable, fall through to search
    }
    return [];
}

async function fetchSearchFallback(dispatcher, prev) {
    const author = prev.author || 'Lo-Fi';
    const queries = [
        `scsearch:${author} mix`,
        `ytsearch:${author} mix`,
        `ytmsearch:${author}`,
    ];

    for (const query of queries) {
        try {
            const res = await dispatcher.player.node.rest.resolve(query);
            if (res && (res.loadType === 'search' || res.loadType === 'track') && res.data) {
                const tracks = Array.isArray(res.data) ? res.data : [res.data];
                if (tracks.length > 0) return tracks;
            }
        } catch {
            // try next query
        }
    }
    return [];
}

module.exports = { resolveAutoplayTrack };
