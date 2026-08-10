const { ApplicationCommandOptionType } = require('discord.js');
const SettingsManager = require('../../structures/SettingsManager');
const { setVoiceStatus } = require('../../structures/Utils');

module.exports = {
    name: 'status',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Ubah atau matikan status Voice Channel otomatis.',
    options: [
        {
            name: 'template',
            description: 'Kosongkan untuk toggle, atau isi custom template (contoh: {judul} - {author})',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        const voiceChannel = ctx.guild.members.me.voice.channel;
        const userId = ctx.user.id;

        const input = ctx.getString('template', 0) || (ctx.args.length ? ctx.args.join(' ') : null);
        let template = SettingsManager.getStatusTemplate(userId);

        if (input) {
            const lower = input.toLowerCase();
            if (lower === 'off') {
                template = 'off';
            } else if (lower === 'auto' || lower === 'on') {
                template = `${e.music} {judul}`;
            } else {
                template = input;
            }
        } else {
            template = template === 'off' ? `${e.music} {judul}` : 'off';
        }

        SettingsManager.setStatusTemplate(userId, template);

        if (template !== 'off') {
            if (dispatcher?.current && voiceChannel) {
                const statusText = template
                    .replace(/{judul}/gi, dispatcher.current.info.title || 'Unknown Title')
                    .replace(/{author}/gi, dispatcher.current.info.author || 'Unknown Author')
                    .replace(/{durasi}/gi, dispatcher.formatTime(dispatcher.current.info.length))
                    .substring(0, 500);

                try {
                    await setVoiceStatus(voiceChannel.id, statusText);
                } catch (err) {
                    return ctx.sendTemporary(`${e.error} ${ctx.t('status.error', { error: err.message })}`);
                }
            }
            return ctx.send(`${e.success} ${ctx.t('status.on', { template })}`);
        }

        if (voiceChannel) {
            setVoiceStatus(voiceChannel.id, '').catch(() => {});
        }
        return ctx.sendTemporary(`${e.loop_none} ${ctx.t('status.off')}`);
    },
};
