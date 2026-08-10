const Context = require('../../structures/Context');
const checkMiddleware = require('../../structures/Middleware');
const LocaleManager = require('../../structures/LocaleManager');
const SettingsManager = require('../../structures/SettingsManager');

module.exports = async (client, interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const ctx = new Context(interaction);
        const isAllowed = await checkMiddleware(client, ctx, command);
        if (!isAllowed) return;

        try {
            await command.execute(client, ctx);
        } catch (error) {
            client.logger.error(`Error executing slash command "${interaction.commandName}":`, error);
            const lang = SettingsManager.getLanguage(interaction.user.id);
            const payload = { content: LocaleManager.t(lang, 'dispatcher.error'), flags: 64 };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
        return;
    }

    // np_* buttons are handled by per-message collectors inside Dispatcher.
    if (interaction.isButton() && interaction.customId.startsWith('np_')) return;
};
