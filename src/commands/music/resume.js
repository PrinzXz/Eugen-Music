module.exports = {
    name: 'resume',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['r'],
    description: 'Lanjutkan musik yang sedang di-jeda.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (!dispatcher.player.paused) return ctx.sendTemporary(`${e.error} ${ctx.t('resume.not_paused')}`);
        dispatcher.player.setPaused(false);
        dispatcher.updateMessage();
        return ctx.send(`${e.play} ${ctx.t('resume.resumed')}`);
    },
};
