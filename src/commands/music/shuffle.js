module.exports = {
    name: 'shuffle',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['mix'],
    description: 'Acak urutan lagu di antrean.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (dispatcher.queue.length === 0) return ctx.sendTemporary(`${e.error} ${ctx.t('error.queue_empty')}`);
        dispatcher.shuffle();
        return ctx.send(`${e.shuffle} ${ctx.t('shuffle.done')}`);
    },
};
