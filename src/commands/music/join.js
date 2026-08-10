const Dispatcher = require('../../structures/Dispatcher');

module.exports = {
    name: 'join',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: [],
    description: 'Panggil bot ke Voice Channel kamu.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const { guild, member } = ctx;
        const channelId = ctx.isInteraction ? ctx.channelId : ctx.channel.id;

        if (!member.voice.channel) return ctx.sendTemporary(`${e.error} ${ctx.t('error.no_voice_channel')}`);
        if (client.queues.has(guild.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('join.bot_in_vc')}`);

        client.joinLocks = client.joinLocks || new Set();
        if (client.joinLocks.has(guild.id)) {
            return ctx.send(`${e.loading} ${ctx.t('error.joining')}`);
        }

        client.joinLocks.add(guild.id);
        try {
            const player = await client.shoukaku.joinVoiceChannel({
                guildId: guild.id,
                channelId: member.voice.channelId,
                shardId: guild.shardId,
                deaf: true,
            });
            if (guild.members.me.voice.channel) {
                guild.members.me.voice.setDeaf(true).catch(() => {});
            }
            const dispatcher = new Dispatcher(client, guild.id, channelId, player);
            dispatcher.summonerId = member.id;
            client.queues.set(guild.id, dispatcher);
            return ctx.send(`${e.success} ${ctx.t('join.done', { channelId: member.voice.channelId })}`);
        } catch (error) {
            console.error('[join] Failed to join VC:', error);
            return ctx.sendTemporary(`${e.error} ${ctx.t('error.join_failed')}`);
        } finally {
            client.joinLocks.delete(guild.id);
        }
    },
};
