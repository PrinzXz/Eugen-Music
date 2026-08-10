const VolumeManager = require('../../structures/VolumeManager');

module.exports = {
    name: 'volume',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['vol', 'v'],
    description: 'Atur volume musik (1-200%).',
    options: [
        {
            name: 'amount',
            description: 'Volume (1-200)',
            type: 10,
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

        const amount = Math.round(ctx.getNumber('amount', 0));
        if (isNaN(amount) || amount < 1 || amount > 200) {
            return ctx.sendTemporary(`${e.error} Volume harus antara 1 sampai 200!`);
        }

        dispatcher.player.setGlobalVolume(amount);
        VolumeManager.setVolume(ctx.user.id, amount);
        dispatcher.updateMessage();
        return ctx.send(`${e.volume} ${ctx.t('volume.done', { amount })}`);
    },
};
