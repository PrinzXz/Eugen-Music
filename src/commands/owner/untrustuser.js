const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'untrustuser',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Cabut akses kontrol musik dari user lain.',
    options: [
        {
            name: 'user',
            description: 'User yang ingin dicabut aksesnya',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        if (dispatcher.summonerId !== ctx.user.id) return ctx.sendTemporary(`${e.error} ${ctx.t('untrust.only_owner')}`);
        const target = ctx.getUser('user', 0);
        if (!target) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (!dispatcher.trustedUsers.has(target.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('untrust.not_found')}`);
        dispatcher.trustedUsers.delete(target.id);
        return ctx.send(`${e.success} ${ctx.t('untrust.done', { userId: target.id })}`);
    },
};
