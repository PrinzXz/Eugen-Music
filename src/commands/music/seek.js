module.exports = {
    name: 'seek',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['forward', 'rewind'],
    description: 'Loncat ke waktu tertentu dalam lagu (contoh: 1m30s).',
    options: [
        {
            name: 'time',
            description: 'Waktu tujuan (contoh: 1m30s atau 90)',
            type: 3,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const dispatcher = client.queues.get(ctx.guild.id);
        if (!dispatcher?.current) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
        const memberChannelId = ctx.member?.voice?.channelId;
        const botChannelId = ctx.guild.members.me?.voice?.channelId;
        if (!memberChannelId || memberChannelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);
        if (!dispatcher.isAuthorized(ctx.user.id)) return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_authorized')}`);
        if (!dispatcher.current.info.isSeekable) return ctx.sendTemporary(`${e.error} ${ctx.t('seek.not_seekable')}`);

        const timeStr = ctx.getString('time', 0);
        const ms = parseTimeToMs(timeStr);
        if (ms === null || ms < 0) return ctx.sendTemporary(`${e.error} ${ctx.t('seek.invalid_format')}`);
        if (ms > dispatcher.current.info.length) return ctx.sendTemporary(`${e.error} ${ctx.t('seek.exceeded')}`);

        dispatcher.player.seekTo(ms);
        return ctx.send(`${e.success} ${ctx.t('seek.done', { time: dispatcher.formatTime(ms) })}`);
    },
};

function parseTimeToMs(str) {
    const match = str?.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if (match && (match[1] || match[2] || match[3])) {
        return (parseInt(match[1] || 0) * 3600000)
            + (parseInt(match[2] || 0) * 60000)
            + (parseInt(match[3] || 0) * 1000);
    }
    const seconds = parseInt(str);
    return isNaN(seconds) ? null : seconds * 1000;
}
