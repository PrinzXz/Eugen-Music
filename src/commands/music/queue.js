const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { ThumbnailBuilder, SectionBuilder } = require('@discordjs/builders');

function formatTime(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${minutes}:${pad(seconds)}`;
}

function formatTotalTime(ms) {
    if (!ms) return '0m';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

module.exports = {
    name: 'queue',
    cooldown: 3000,
    developerOnly: false,
    permissions: [],
    aliases: ['q'],
    description: 'Display the current song queue in an interactive UI.',

    execute: async (client, ctx) => {
        await handleQueue(client, ctx);
    },
};

async function handleQueue(client, ctx) {
    const guildId = ctx.guild.id;
    const dispatcher = client.queues.get(guildId);
    const e = client.config.emojis;

    if (!dispatcher || !dispatcher.current) {
        return ctx.sendTemporary(`${e.error} ${ctx.t('error.not_playing')}`);
    }

    let currentPage = 1;
    let selectedTrackIndex = -1; 
    const pageSize = 5;

    const generatePayload = () => {
        const current = dispatcher.current;
        const queue = dispatcher.queue;
        const totalPages = Math.ceil(queue.length / pageSize) || 1;
        
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const currentTracks = queue.slice(startIdx, endIdx);

        // --- Now Playing Container (compact) ---
        const npContainer = new ContainerBuilder();
        npContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e.music} **NOW PLAYING**`));
        
        const requesterId = current.info.requester?.id || ctx.user?.id || ctx.author?.id;
        const npDesc = `**[${current.info.title}](${current.info.uri || ''})** \`${formatTime(current.info.length)}\`\n${e.mic} ${current.info.author}  ${e.user} <@${requesterId}>`;
        
        const npSection = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(npDesc));
        
        if (current.info.artworkUrl) {
            npSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(current.info.artworkUrl));
        } else if (current.info.uri && current.info.uri.includes('youtube.com')) {
            const videoId = current.info.uri.split('v=')[1]?.split('&')[0];
            if (videoId) npSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`));
        }
        npContainer.addSectionComponents(npSection);
        
        // --- Queue Container ---
        let totalQueueDuration = 0;
        for (const t of queue) totalQueueDuration += (t.info.length || 0);

        const qContainer = new ContainerBuilder();
        
        let qHeader = `**Queue — ${queue.length} tracks · ${formatTotalTime(totalQueueDuration)}**`;
        if (queue.length === 0) {
            qHeader += `\n\n*${ctx.t('queue.empty')}*`;
        }
        
        qContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(qHeader));

        if (queue.length > 0) {
            currentTracks.forEach((track, i) => {
                const globalIndex = startIdx + i;
                const isSelected = selectedTrackIndex === globalIndex;
                const trackNum = String(globalIndex + 1).padStart(2, '0');
                
                let trackDesc = `**${trackNum}  [${track.info.title}](${track.info.uri || ''})** \`${formatTime(track.info.length)}\`\n${e.mic} ${track.info.author}`;
                const section = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(trackDesc));
                
                if (isSelected) {
                    section.setButtonAccessory(new ButtonBuilder().setCustomId('act_cancel').setEmoji(e.error).setStyle(ButtonStyle.Secondary));
                } else {
                    section.setButtonAccessory(new ButtonBuilder().setCustomId(`queue_expand_${globalIndex}`).setEmoji(e.options).setStyle(ButtonStyle.Secondary));
                }
                
                qContainer.addSectionComponents(section);
                
                if (isSelected) {
                    const actionRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`act_remove_${globalIndex}`).setEmoji(e.trash).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`act_up_${globalIndex}`).setEmoji(e.up).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`act_top_${globalIndex}`).setEmoji(e.top).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`act_down_${globalIndex}`).setEmoji(e.down).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`act_play_${globalIndex}`).setEmoji(e.play).setStyle(ButtonStyle.Secondary)
                    );
                    qContainer.addActionRowComponents(actionRow);
                }
            });
            
            qContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Page ${currentPage}/${totalPages}`));
        }

        // --- Pagination & Global Controls (icon-only) ---
        const btnPrev = new ButtonBuilder().setCustomId('q_prev').setEmoji(e.page_prev).setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1);
        const btnNext = new ButtonBuilder().setCustomId('q_next').setEmoji(e.page_next).setStyle(ButtonStyle.Secondary).setDisabled(currentPage === totalPages || totalPages === 1);
        const btnShuffle = new ButtonBuilder().setCustomId('q_shuffle').setEmoji(e.shuffle).setStyle(ButtonStyle.Secondary);
        const btnClear = new ButtonBuilder().setCustomId('q_clear').setEmoji(e.clear).setStyle(ButtonStyle.Danger);
        
        const navRow = new ActionRowBuilder().addComponents(btnPrev, btnShuffle, btnClear, btnNext);
        qContainer.addActionRowComponents(navRow);

        const components = [npContainer, qContainer];
        return { components, flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications, content: '' };
    };

    const payload = generatePayload();
    let promptMsg;
    
    if (ctx.isInteraction) {
        await ctx.deferReply();
        await ctx.editReply(payload);
        promptMsg = await ctx.fetchReply();
    } else {
        promptMsg = await ctx.channel.send(payload);
    }

    const collector = promptMsg.createMessageComponentCollector({ time: 60000 }); // 1 menit, auto-delete jika tidak ada aksi

    collector.on('collect', async i => {
        if (i.user.id !== (ctx.user?.id || ctx.author?.id)) {
            return i.reply({ content: `${e.error} ${ctx.t('queue.only_requester')}`, flags: 64 });
        }

        const id = i.customId;
        const queue = dispatcher.queue;

        collector.resetTimer();

        if (id.startsWith('queue_expand_')) {
            selectedTrackIndex = parseInt(id.split('_')[2]);
        } else if (id === 'act_cancel') {
            selectedTrackIndex = -1;
        } else if (id.startsWith('act_remove_')) {
            const idx = parseInt(id.split('_')[2]);
            if (idx >= 0 && idx < queue.length) queue.splice(idx, 1);
            selectedTrackIndex = -1;
        } else if (id.startsWith('act_top_')) {
            const idx = parseInt(id.split('_')[2]);
            if (idx > 0 && idx < queue.length) {
                const track = queue.splice(idx, 1)[0];
                queue.unshift(track);
            }
            selectedTrackIndex = -1;
        } else if (id.startsWith('act_up_')) {
            const idx = parseInt(id.split('_')[2]);
            if (idx > 0 && idx < queue.length) {
                const track = queue.splice(idx, 1)[0];
                queue.splice(idx - 1, 0, track);
            }
            selectedTrackIndex = -1;
        } else if (id.startsWith('act_down_')) {
            const idx = parseInt(id.split('_')[2]);
            if (idx >= 0 && idx < queue.length - 1) {
                const track = queue.splice(idx, 1)[0];
                queue.splice(idx + 1, 0, track);
            }
            selectedTrackIndex = -1;
        } else if (id.startsWith('act_play_')) {
            const idx = parseInt(id.split('_')[2]);
            if (idx >= 0 && idx < queue.length) {
                const track = queue.splice(idx, 1)[0];
                queue.unshift(track);
                dispatcher.player.stopTrack();
            }
            selectedTrackIndex = -1;
        } else if (id === 'q_prev') {
            currentPage--;
        } else if (id === 'q_next') {
            currentPage++;
        } else if (id === 'q_shuffle') {
            if (queue.length > 1) {
                for (let i = queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue[i], queue[j]] = [queue[j], queue[i]];
                }
            }
        } else if (id === 'q_clear') {
            dispatcher.queue.length = 0;
            currentPage = 1;
        }

        await i.deferUpdate().catch(()=>{});
        await promptMsg.edit(generatePayload()).catch(()=>{});
    });

    collector.on('end', () => {
        // Auto-delete queue message jika tidak ada aksi selama 1 menit
        promptMsg.delete().catch(() => {});
    });
}
