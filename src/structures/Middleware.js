const { Collection } = require('discord.js');
const LocaleManager = require('./LocaleManager');
const SettingsManager = require('./SettingsManager');

module.exports = async function checkMiddleware(client, ctx, command) {
    const e = client.config.emojis;
    const lang = SettingsManager.getLanguage(ctx.user?.id);

    if (command.developerOnly && !client.config.developerIds.includes(ctx.user.id)) {
        await ctx.sendTemporary(`${e.error} Perintah ini hanya bisa digunakan oleh Developer!`);
        return false;
    }

    if (command.permissions?.length > 0) {
        if (!ctx.member.permissions.has(command.permissions)) {
            await ctx.sendTemporary(`${e.error} ${LocaleManager.t(lang, 'middleware.no_permission')}`);
            return false;
        }
        if (!ctx.guild.members.me.permissions.has(command.permissions)) {
            await ctx.sendTemporary(`${e.error} ${LocaleManager.t(lang, 'middleware.no_permission')}`);
            return false;
        }
    }

    if (command.cooldown) {
        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const expirationTime = (timestamps.get(ctx.user.id) || 0) + command.cooldown;

        if (now < expirationTime) {
            const seconds = ((expirationTime - now) / 1000).toFixed(1);
            await ctx.sendTemporary(`${e.loading} ${LocaleManager.t(lang, 'middleware.cooldown', { seconds })}`);
            return false;
        }

        timestamps.set(ctx.user.id, now);
        setTimeout(() => timestamps.delete(ctx.user.id), command.cooldown);
    }

    return true;
};
