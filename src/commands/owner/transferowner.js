const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'transferowner',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Transfer hak kepemilikan Owner ke user lain.',
    options: [
        {
            name: 'user',
            description: 'User yang ingin dijadikan Owner baru',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        if (dispatcher.summonerId !== ctx.user.id) return ctx.sendTemporary(`${e.error} ${ctx.t('transfer.only_owner')}`);
        const target = ctx.getUser('user', 0);
        if (!target) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (target.bot) return ctx.sendTemporary(`${e.error} ${ctx.t('transfer.not_bot')}`);
        if (target.id === ctx.user.id) return ctx.sendTemporary(`${e.error} ${ctx.t('transfer.self')}`);
        const voiceChannel = ctx.guild.members.me.voice.channel;
        if (voiceChannel && !voiceChannel.members.has(target.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('transfer.target_not_in_vc')}`);
        dispatcher.summonerId = target.id;
        dispatcher.trustedUsers.delete(target.id);
        return ctx.send(`${e.success} ${ctx.t('transfer.done', { userId: target.id })}`);
    },
};
