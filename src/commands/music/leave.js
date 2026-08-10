module.exports = {
    name: 'leave',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['quit', 'dc', 'disconnect'],
    description: 'Hentikan musik dan keluar dari Voice Channel.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.bot_not_in_vc')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        dispatcher.destroy();
        return ctx.send(`${e.stop} ${ctx.t('leave.done')}`);
    },
};
