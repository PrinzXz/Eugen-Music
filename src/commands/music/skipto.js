const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    name: 'skipto',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['jump'],
    description: 'Lompati langsung ke lagu tertentu di antrean.',
    options: [
        {
            name: 'nomor',
            description: 'Nomor lagu tujuan di antrean',
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

        if (index > 1) dispatcher.queue.splice(0, index - 1);
        const target = dispatcher.queue[0];
        await ctx.send(`${e.skip} ${ctx.t('skipto.jumping', { title: target.info.title })}`);
        dispatcher.player.stopTrack();
    },
};
