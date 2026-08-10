const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'trustuser',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Beri akses kontrol musik ke user lain.',
    options: [
        {
            name: 'user',
            description: 'User yang ingin diberi akses',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        if (dispatcher.summonerId !== ctx.user.id) return ctx.sendTemporary(`${e.error} ${ctx.t('trust.only_owner')}`);
        const target = ctx.getUser('user', 0);
        if (!target) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (target.id === ctx.user.id) return ctx.sendTemporary(`${e.error} ${ctx.t('trust.self')}`);
        dispatcher.trustedUsers.add(target.id);
        return ctx.send(`${e.success} ${ctx.t('trust.done', { userId: target.id })}`);
    },
};
