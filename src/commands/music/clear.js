module.exports = {
    name: 'clear',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['c'],
    description: 'Bersihkan semua lagu di antrean dan hentikan musik.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        dispatcher.queue = [];
        dispatcher.loop = 'none';
        dispatcher.current = null;
        dispatcher.previous = null;
        dispatcher.backgroundLoadId = null;
        dispatcher.player.stopTrack();
        return ctx.send(`${e.success} ${ctx.t('clear.done')}`);
    },
};
