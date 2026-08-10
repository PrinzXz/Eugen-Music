module.exports = {
    name: 'claimowner',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Claim sesi DJ jika Owner sudah meninggalkan VC.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        if (dispatcher.summonerId === ctx.user.id) return ctx.sendTemporary(`${e.error} ${ctx.t('claim.already_owner')}`);
        const voiceChannel = ctx.guild.members.me.voice.channel;
        if (!voiceChannel) return ctx.sendTemporary(`${e.error} ${ctx.t('claim.bot_not_in_vc')}`);
        if (voiceChannel.members.has(dispatcher.summonerId)) return ctx.sendTemporary(`${e.error} ${ctx.t('claim.owner_in_vc')}`);
        dispatcher.summonerId = ctx.user.id;
        return ctx.send(`${e.success} ${ctx.t('claim.done')}`);
    },
};
