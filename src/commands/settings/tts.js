module.exports = {
    name: 'tts',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Toggle fitur Auto Text-to-Speech di Voice Channel.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher) return ctx.sendTemporary(`${e.error} ${ctx.t('error.bot_not_in_vc')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);

        dispatcher.ttsEnabled = !dispatcher.ttsEnabled;
        return ctx.send(dispatcher.ttsEnabled
            ? `${e.success} ${ctx.t('tts.on')}`
            : `${e.loop_none} ${ctx.t('tts.off')}`
        );
    },
};
