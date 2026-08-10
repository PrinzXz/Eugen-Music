async function handleAction(client, ctx, endpoint, actionVerb, selfMessage, botMessage) {
    const e = client.config.emojis;
    const target = ctx.getUser('target', 0);

    if (!target) {
        return ctx.sendTemporary(`${e.error} ${ctx.t('action.no_target')}`, false);
    }
    if (target.id === ctx.user.id && selfMessage) {
        return ctx.sendTemporary(`${e.error} ${selfMessage}`, false);
    }
    if (target.id === client.user.id && botMessage) {
        return ctx.sendTemporary(`${e.error} ${botMessage}`, false);
    }

    await ctx.deferReply();

    const imageUrl = await fetchActionGif(endpoint);
    const text = `**<@${ctx.user.id}> ${actionVerb} <@${target.id}>!**`;

    if (imageUrl) {
        await ctx.sendWithMedia(text, imageUrl, true);
    } else {
        await ctx.send(text, true);
    }
}

async function fetchActionGif(endpoint) {
    const providers = [
        () => fetch(`https://nekos.best/api/v2/${endpoint}`)
            .then(r => r.json()).then(d => d.results?.[0]?.url),
        () => fetch(`https://api.otakugifs.xyz/gif?reaction=${endpoint}`)
            .then(r => r.json()).then(d => d.url),
        () => fetch(`https://nekos.life/api/v2/img/${endpoint}`)
            .then(r => r.json()).then(d => d.url),
        () => fetch(`https://api.purrbot.site/v2/img/sfw/${endpoint}/gif`)
            .then(r => r.json()).then(d => d.link),
    ];

    for (const provider of providers) {
        try {
            const url = await provider();
            if (url) return url;
        } catch {
            // try next provider
        }
    }
    return null;
}

module.exports = { handleAction };
