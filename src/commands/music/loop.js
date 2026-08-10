const { ApplicationCommandOptionType } = require('discord.js');
const SettingsManager = require('../../structures/SettingsManager');

const LOOP_CYCLE = { none: 'track', track: 'queue', queue: 'none' };
const LOOP_KEYS = { track: 'loop.track', queue: 'loop.queue', none: 'loop.off' };
const LOOP_EMOJIS = { track: 'loop_track', queue: 'loop_queue', none: 'loop_none' };

module.exports = {
    name: 'loop',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['repeat'],
    description: 'Toggle mode loop (track, queue, atau off).',
    options: [
        {
            name: 'mode',
            description: 'Mode loop',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: 'Queue', value: 'queue' },
                { name: 'Track', value: 'track' },
                { name: 'Off', value: 'none' },
            ],
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

        const input = ctx.getString('mode', 0);
        if (input) {
            const normalized = { q: 'queue', queue: 'queue', t: 'track', track: 'track', o: 'none', off: 'none', none: 'none' }[input.toLowerCase()];
            if (!normalized) return ctx.sendTemporary(`${e.error} ${ctx.t('loop.invalid')}`);
            dispatcher.loop = normalized;
        } else {
            dispatcher.loop = LOOP_CYCLE[dispatcher.loop] || 'none';
        }

        SettingsManager.setLoop(ctx.user.id, dispatcher.loop);
        dispatcher.updateMessage();
        return ctx.send(`${e[LOOP_EMOJIS[dispatcher.loop]]} ${ctx.t(LOOP_KEYS[dispatcher.loop])}`);
    },
};
