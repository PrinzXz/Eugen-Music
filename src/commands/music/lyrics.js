const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'lyrics',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['ly'],
    description: 'Mencari dan menampilkan lirik lagu dengan pilihan hasil dan pagination.',
    options: [
        {
            name: 'query',
            description: 'Judul lagu yang ingin dicari liriknya',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    execute: async (client, ctx) => {
        const query = ctx.getString('query', 0) || (ctx.args.length ? ctx.args.join(' ') : null);
        await handleLyrics(client, ctx, query);
    }
};

const chunkLyrics = (lyrics) => {
    const chunks = [];
    let current = lyrics;
    while (current.length > 0) {
        if (current.length <= 3500) {
            chunks.push(current);
            break;
        }
        // Cari titik pemisah yang aman (baris baru)
        let breakIndex = current.lastIndexOf('\n', 3500);
        if (breakIndex === -1) breakIndex = 3500;
        chunks.push(current.substring(0, breakIndex));
        current = current.substring(breakIndex).trim();
    }
    return chunks;
};

const cleanSongTitle = (title, author) => {
    let clean = title;
    // Hapus teks dalam kurung ( ) atau [ ] seperti (Official Video), [Lyrics]
    clean = clean.replace(/(\(.*?\)|\[.*?\])/g, '');
    // Potong jika ada karakter pipe | (biasanya judul alternatif)
    clean = clean.split('|')[0];
    
    // Jika judul diawali dengan nama artis (ex: "Virgoun - Surat Cinta..."), hapus nama artis dari judul
    if (author && clean.toLowerCase().startsWith(author.toLowerCase())) {
        clean = clean.substring(author.length);
        clean = clean.replace(/^[\s\-\|:]+/, ''); // Hapus sisa strip/spasi di depan
    }
    
    // Hapus sisa kata-kata kotor seperti "feat.", "ft.", "official", "lyric"
    clean = clean.replace(/(ft\.|feat\.|lyric|video|official|audio).*/i, '');
    
    return clean.trim();
};

async function handleLyrics(client, ctx, query) {
    let searchQuery = query;
    const guildId = ctx.guild.id;
    const dispatcher = client.queues.get(guildId);
    
    if (!searchQuery) {
        if (!dispatcher?.current) {
            const msg = `❌ ${ctx.t('lyrics.no_query')}`;
            return ctx.isInteraction ? ctx.reply({ content: msg, flags: 64 }) : ctx.channel.send({ content: msg });
        }
        
        let author = dispatcher.current.info.author;
        let title = cleanSongTitle(dispatcher.current.info.title, author);
        searchQuery = `${author} ${title}`;
    }

    if (ctx.isInteraction) await ctx.deferReply();
    const loadingMsg = ctx.isInteraction ? null : await ctx.channel.send(ctx.t('lyrics.searching'));

    try {
        let res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('Gagal menghubungi LRCLIB API');
        let data = await res.json();
        
        if ((!data || data.length === 0) && !query && dispatcher?.current) {
            // Fallback: Coba cari hanya dengan judul lagunya saja (tanpa nama artis)
            let titleOnly = cleanSongTitle(dispatcher.current.info.title, dispatcher.current.info.author);
            res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(titleOnly)}`);
            if (res.ok) data = await res.json();
        }

        const validSongs = data?.filter(s => s.plainLyrics) || [];

        if (validSongs.length === 0) {
            const msg = `❌ ${ctx.t('lyrics.not_found')}`;
            if (ctx.isInteraction) return ctx.editReply({ content: msg });
            return loadingMsg.edit({ content: msg });
        }

        // Ambil maksimal 5 hasil teratas
        const topSongs = validSongs.slice(0, 5).map(s => ({
            ...s,
            chunks: chunkLyrics(s.plainLyrics)
        }));
        
        let selectedIndex = topSongs.length === 1 ? 0 : -1;
        let currentPage = 0;

        const generateContainer = (song, pageIndex) => {
            const totalPages = song.chunks.length;
            const text = `🎤 **${song.trackName} - ${song.artistName}**\n\n${song.chunks[pageIndex]}\n\n*(Page ${pageIndex + 1}/${totalPages})*`;
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
            return container;
        };

        const generateRow = (currentIdx) => {
            const select = new StringSelectMenuBuilder()
                .setCustomId('lyrics_select')
                .setPlaceholder('Pilih lagu untuk melihat lirik...')
                .addOptions(
                    topSongs.map((song, i) => ({
                        label: `${song.trackName}`.substring(0, 50),
                        description: `Oleh: ${song.artistName}`.substring(0, 50),
                        value: i.toString(),
                        default: i === currentIdx
                    }))
                );
            return new ActionRowBuilder().addComponents(select);
        };

        const generateButtons = (song, pageIndex) => {
            const totalPages = song.chunks.length;
            if (totalPages <= 1) return null;
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lyrics_prev')
                    .setLabel('Prev')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('lyrics_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === totalPages - 1)
            );
            return row;
        };

        const getPayload = () => {
            if (selectedIndex === -1) {
                const initialContainer = new ContainerBuilder();
                initialContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔍 ${ctx.t('lyrics.results', { count: topSongs.length })}`));
                return {
                    content: '',
                    components: [initialContainer, generateRow(-1)],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
                };
            } else {
                const song = topSongs[selectedIndex];
                const components = [generateContainer(song, currentPage)];
                const btnRow = generateButtons(song, currentPage);
                if (btnRow) components.push(btnRow);
                
                return {
                    content: '',
                    components: components,
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
                };
            }
        };

        let responseMsg;
        const initialPayload = getPayload();

        if (ctx.isInteraction) {
            responseMsg = await ctx.editReply(initialPayload);
        } else {
            responseMsg = await loadingMsg.edit(initialPayload);
        }

        // Kolektor interaksi
        const collector = responseMsg.createMessageComponentCollector({ 
            time: 5 * 60 * 1000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== ctx.user.id) {
                return i.reply({ content: `❌ ${ctx.t('lyrics.only_requester')}`, flags: 64 });
            }
            
            if (i.isStringSelectMenu() && i.customId === 'lyrics_select') {
                selectedIndex = parseInt(i.values[0]);
                currentPage = 0; // Reset halaman ke 0 setiap ganti lagu
            } else if (i.isButton()) {
                if (i.customId === 'lyrics_prev') currentPage--;
                if (i.customId === 'lyrics_next') currentPage++;
            }
            
            await i.update(getPayload());
        });

        collector.on('end', () => {
            if (responseMsg.deletable) {
                responseMsg.delete().catch(() => {});
            }
        });

    } catch (err) {
        console.error('Lyrics Error:', err);
        const msg = `❌ ${ctx.t('lyrics.error')}`;
        if (ctx.isInteraction) return ctx.editReply({ content: msg });
        return loadingMsg?.edit({ content: msg });
    }
}
