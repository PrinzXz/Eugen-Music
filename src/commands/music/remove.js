const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'remove',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['rm'],
    description: 'Hapus lagu spesifik dari antrean berdasarkan nomornya.',
    options: [
        {
            name: 'nomor',
            description: 'Nomor lagu di antrean',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);

        const index = ctx.getInteger('nomor', 0);
        if (index < 1 || index > dispatcher.queue.length) {
            return ctx.sendTemporary(`${e.error} ${ctx.t('error.invalid_index', { count: dispatcher.queue.length })}`);
        }

        const removed = dispatcher.queue.splice(index - 1, 1)[0];
        dispatcher.updateMessage();
        return ctx.send(`${e.trash} ${ctx.t('remove.done', { title: removed.info.title })}`);
    },
};
