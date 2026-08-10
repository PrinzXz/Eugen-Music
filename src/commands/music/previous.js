module.exports = {
    name: 'previous',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['prev', 'back'],
    description: 'Putar ulang lagu sebelumnya.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (!dispatcher.previousTracks.length) return ctx.sendTemporary(`${e.error} ${ctx.t('previous.empty')}`);
        dispatcher.playPrevious();
        return ctx.send(`${e.previous} ${ctx.t('previous.done')}`);
    },
};
