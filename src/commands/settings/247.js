const SettingsManager = require('../../structures/SettingsManager');

module.exports = {
    name: '247',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: ['stay'],
    description: 'Toggle mode 24/7 agar bot tidak keluar saat antrean habis.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);

        dispatcher.twentyFourSeven = !dispatcher.twentyFourSeven;
        SettingsManager.set247(ctx.user.id, dispatcher.twentyFourSeven);

        return ctx.send(dispatcher.twentyFourSeven
            ? `${e.success} ${ctx.t('247.on')}`
            : `${e.loop_none} ${ctx.t('247.off')}`
        );
    },
};
