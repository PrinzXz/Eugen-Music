const { ApplicationCommandOptionType, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const Context = require('../../structures/Context');
const { handlePlay } = require('./play');

module.exports = {
    name: 'search',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['find'],
    description: 'Cari lagu di berbagai platform dan pilih dari menu hasil pencarian.',
    options: [
        {
            name: 'query',
            description: 'Judul lagu yang ingin dicari',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const query = ctx.getString('query', 0) || ctx.args.join(' ');
        if (!query) return ctx.sendTemporary(`${e.error} ${ctx.t('error.no_voice_channel')}`);

        const { member, guild } = ctx;
        if (!member?.voice?.channelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.no_voice_channel')}`);
        const botChannelId = guild.members.me?.voice?.channelId;
        if (botChannelId && member.voice.channelId !== botChannelId) return ctx.sendTemporary(`${e.error} ${ctx.t('error.same_voice_channel')}`);

        if (ctx.isInteraction) await ctx.deferReply();

        const node = client.shoukaku.getIdealNode();
        if (!node) return ctx.send(`${e.error} ${ctx.t('error.no_lavalink')}`, true);

        const prefixes = ['ytsearch', 'ytmsearch', 'scsearch', 'amsearch'];
        let result;
        for (const prefix of prefixes) {
            try {
                result = await node.rest.resolve(`${prefix}:${query}`);
                if (result?.loadType !== 'empty' && result?.loadType !== 'error' && result?.data?.length > 0) break;
            } catch {
                // try next platform
            }
        }

        if (!result?.data?.length) return ctx.send(`${e.error} ${ctx.t('search.not_found')}`, true);

        const tracks = result.data.slice(0, 5);
        const options = tracks.map((track, i) => ({
            label: `${i + 1}. ${track.info.title.substring(0, 50)}`,
            description: `${track.info.author.substring(0, 50)} | ${formatTime(track.info.length)}`,
            value: i.toString(),
        }));

        const replyOptions = {
            content: `${e.success} ${ctx.t('search.results', { query })}`,
            components: [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`search_select_${ctx.id}`)
                    .setPlaceholder('Pilih lagu yang ingin diputar...')
                    .addOptions(options)
            )],
        };

        let msg;
        if (ctx.isInteraction) {
            msg = await ctx.editReply(replyOptions);
        } else {
            msg = await ctx.channel.send(replyOptions);
        }

        const filter = i => i.customId === `search_select_${ctx.id}` && i.user.id === ctx.user.id;
        const collector = msg.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 30000 });

        collector.on('collect', async i => {
            collector.stop('selected');
            const selectedTrack = tracks[parseInt(i.values[0])];
            const interactionCtx = new Context(i);
            await handlePlay(client, interactionCtx, selectedTrack);
            if (msg.editable) {
                await msg.edit({ content: `${e.success} ${ctx.t('search.selected')}`, components: [] }).catch(() => {});
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && msg.editable) {
                msg.edit({ content: `${e.loading} ${ctx.t('search.timeout')}`, components: [] }).catch(() => {});
            }
        });
    },
};

function formatTime(ms) {
    if (!ms) return '0:00';
    const pad = n => String(n).padStart(2, '0');
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 60000) % 60);
    const hours = Math.floor(ms / 3600000);
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
