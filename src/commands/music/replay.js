module.exports = {
    name: 'replay',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['restart'],
    description: 'Mulai ulang lagu yang sedang diputar dari awal.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        dispatcher.player.seekTo(0);
        return ctx.send(`${e.success} ${ctx.t('replay.done', { title: dispatcher.current.info.title })}`);
    },
};
