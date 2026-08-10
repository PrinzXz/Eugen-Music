module.exports = {
    name: 'next',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['n'],
    description: 'Lewati ke lagu berikutnya di antrean.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) {
            const vc = ctx.guild.members.me.voice.channel;
            const memberCount = vc ? vc.members.filter(m => !m.user.bot && !m.voice.deaf).size : 1;
            const required = Math.ceil(memberCount / 2);
            dispatcher.skipVotes.add(ctx.user.id);
            if (dispatcher.skipVotes.size >= required) {
                dispatcher.skip();
                return ctx.send(`${e.success} ${ctx.t('skip.vote_passed')}`);
            }
            return ctx.sendTemporary(`${e.success} ${ctx.t('skip.vote_added', { current: dispatcher.skipVotes.size, required })}`);
        }

        dispatcher.skip();
        return ctx.send(`${e.skip} ${ctx.t('next.skipped')}`);
    },
};
