const SettingsManager = require('../../structures/SettingsManager');

module.exports = {
    name: 'autoplay',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: ['ap'],
    description: 'Toggle fitur Auto-Play lagu terkait setelah antrean habis.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);

        dispatcher.autoplay = !dispatcher.autoplay;
        SettingsManager.setAutoplay(ctx.user.id, dispatcher.autoplay);

        return ctx.send(dispatcher.autoplay
            ? `${e.autoplay} ${ctx.t('autoplay.on')}`
            : `${e.loop_none} ${ctx.t('autoplay.off')}`
        );
    },
};
