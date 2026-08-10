const Context = require('../../structures/Context');
const checkMiddleware = require('../../structures/Middleware');
const LocaleManager = require('../../structures/LocaleManager');
const SettingsManager = require('../../structures/SettingsManager');

module.exports = async (client, message) => {
    if (message.author.bot || !message.guild) return;

    let prefix = client.config.prefix;
    const mentionRegex = new RegExp(`^<@!?${client.user.id}> `);

    if (mentionRegex.test(message.content)) {
        prefix = message.content.match(mentionRegex)[0];
    } else if (
        message.content.trim() === `<@${client.user.id}>` ||
        message.content.trim() === `<@!${client.user.id}>`
    ) {
        return message.reply(`Prefix di server ini adalah \`${client.config.prefix}\` atau kamu bisa mention aku!`);
    }

    const dispatcher = client.queues.get(message.guild.id);
    if (dispatcher?.ttsEnabled && !message.content.startsWith(prefix)) {
        const botVcId = message.guild.members.me.voice.channelId;
        if (
            message.channel.id === dispatcher.textChannelId &&
            message.member?.voice?.channelId === botVcId
        ) {
            dispatcher.playTTS(message.content);
            return;
        }
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));

    if (!command) return;

    const ctx = new Context(message, args);
    const isAllowed = await checkMiddleware(client, ctx, command);
    if (!isAllowed) return;

    try {
        await command.execute(client, ctx);
    } catch (error) {
        client.logger.error(`Error executing command "${commandName}":`, error);
        const lang = SettingsManager.getLanguage(message.author.id);
        message.reply(LocaleManager.t(lang, 'dispatcher.error'));
    }
};
