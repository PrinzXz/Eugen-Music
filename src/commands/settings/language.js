const { ApplicationCommandOptionType } = require('discord.js');
const SettingsManager = require('../../structures/SettingsManager');
const LocaleManager = require('../../structures/LocaleManager');

const LANG_NAMES = { id: '🇮🇩 Bahasa Indonesia', en: '🇺🇸 English' };

module.exports = {
    name: 'language',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: ['lang', 'bahasa'],
    description: 'Set your preferred language / Atur bahasa pilihanmu.',
    options: [
        {
            name: 'lang',
            description: 'Language code: id / en',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: '🇮🇩 Bahasa Indonesia', value: 'id' },
                { name: '🇺🇸 English', value: 'en' },
            ],
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const userId = ctx.user.id;
        const input = ctx.getString('lang', 0);

        if (!input) {
            const current = SettingsManager.getLanguage(userId);
            return ctx.sendTemporary(`${e.success} ${ctx.t('language.current', { lang: LANG_NAMES[current] || current })}`);
        }

        const lang = input.toLowerCase();
        if (!LocaleManager.isSupported(lang)) {
            const options = LocaleManager.getSupported().join(', ');
            return ctx.sendTemporary(`${e.error} ${ctx.t('language.invalid', { options })}`);
        }

        SettingsManager.setLanguage(userId, lang);

        // Reply in the NEW language so the user immediately sees it in effect
        return ctx.send(`${e.success} ${client.locale.t(lang, 'language.set', { lang: LANG_NAMES[lang] })}`);
    },
};
