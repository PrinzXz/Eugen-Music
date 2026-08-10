module.exports = {
    name: 'nowplaying',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['np'],
    description: 'Tampilkan info lagu yang sedang diputar.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);

        if (!dispatcher?.current) {
            return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        }

        const { current, player } = dispatcher;
        const position = player.position || 0;
        const duration = current.info.length;
        const isStream = current.info.isStream;

        let progressStr;
        if (isStream) {
            progressStr = `${e.music} **${ctx.t('np.live')}** ──────────────`;
        } else {
            const barLength = 15;
            const filled = Math.round(barLength * Math.min(position / duration, 1));
            const empty = barLength - filled;
            const bar = '─'.repeat(Math.max(0, filled - 1)) + '🔘' + '─'.repeat(Math.max(0, empty));
            progressStr = `${dispatcher.formatTime(position)} ${bar} ${dispatcher.formatTime(duration)}`;
        }

        const requester = current.info.requester ? `<@${current.info.requester.id}>` : 'Unknown';
        let msg = `${e.music} **${ctx.t('nowplaying.title')}**\n\n`;
        msg += `**${ctx.t('nowplaying.label_title')}:** [${current.info.title}](${current.info.uri || ''})\n`;
        msg += `**${ctx.t('nowplaying.label_author')}:** ${current.info.author}\n`;
        msg += `**${ctx.t('nowplaying.label_requester')}:** ${requester}\n\n`;
        msg += `\`${progressStr}\``;

        return ctx.send(msg);
    },
};
