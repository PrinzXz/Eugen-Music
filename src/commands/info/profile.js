const { AttachmentBuilder, ApplicationCommandOptionType, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const StatsManager = require('../../structures/StatsManager');
const moment = require('moment');
require('moment-duration-format');
const path = require('path');
const config = require('../../../config.js');

module.exports = {
    name: 'profile',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: ['pr', 'stats'],
    description: 'Tampilkan profil dan statistik musik kamu.',
    options: [
        {
            name: 'user',
            description: 'Pilih user untuk melihat profilnya',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],

    execute: async (client, ctx) => {
        const targetUser = ctx.getUser('user', 0) || ctx.user;
        await handleProfile(client, ctx, targetUser, false);
    }
};

function formatDuration(ms) {
    if (!ms) return '0s';
    const duration = moment.duration(ms);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
}

async function handleProfile(client, ctx, targetUser) {
    if (ctx.isInteraction) {
        await ctx.deferReply();
    } else {
        await ctx.channel.sendTyping();
    }

    const stats = StatsManager.getStats(targetUser.id);
    
    const canvas = createCanvas(800, 720);
    const context = canvas.getContext('2d');

    // Background Gradient (Dark Theme)
    const gradient = context.createLinearGradient(0, 0, 800, 720);
    gradient.addColorStop(0, '#1E2326');
    gradient.addColorStop(1, '#0F1315');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative shapes (Music vibe)
    context.fillStyle = 'rgba(0, 176, 244, 0.03)';
    context.beginPath();
    context.arc(700, 100, 250, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(100, 450, 150, 0, Math.PI * 2);
    context.fill();

    // Top Right Label (Bot Name)
    context.fillStyle = '#00b0f4';
    context.beginPath();
    const bName = config.botName || 'ANTIGRAVITY MUSIC';
    const bNameWidth = context.measureText(bName).width + 30; // approx
    context.roundRect(570, 20, 200, 35, 17.5);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = "bold 15px 'Segoe UI', Arial, sans-serif";
    context.textAlign = 'center';
    context.fillText(bName, 670, 43);

    // Load Avatar
    context.save();
    context.beginPath();
    context.arc(120, 120, 70, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();
    
    try {
        const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarUrl);
        context.drawImage(avatar, 50, 50, 140, 140);
    } catch (e) {
        // Fallback if avatar fails
        context.fillStyle = '#2b2d31';
        context.fill();
    }
    context.restore();

    // Draw Avatar Border
    context.beginPath();
    context.arc(120, 120, 70, 0, Math.PI * 2, true);
    context.lineWidth = 6;
    context.strokeStyle = '#00b0f4';
    context.stroke();

    // Username
    context.fillStyle = '#ffffff';
    context.font = "bold 36px 'Segoe UI', Arial, sans-serif";
    context.textAlign = 'left';
    context.fillText(targetUser.username, 210, 115);

    // Total Playtime below username
    const totalMs = stats ? stats.totalListenTime : 0;
    context.fillStyle = '#b0b5ba';
    context.font = "20px 'Segoe UI', Arial, sans-serif";
    context.fillText(`Total Time: ${formatDuration(totalMs)}`, 210, 150);

    // Draw Cards
    const drawCard = (x, y, w, h, title) => {
        context.fillStyle = 'rgba(255, 255, 255, 0.05)';
        context.beginPath();
        context.roundRect(x, y, w, h, 12);
        context.fill();
        
        // Inner Border
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        context.stroke();

        context.fillStyle = '#ffffff';
        context.font = "bold 18px 'Segoe UI', Arial, sans-serif";
        context.fillText(title, x + 20, y + 35);
    };

    // Card 1: Top Servers
    drawCard(50, 230, 335, 210, 'TOP SERVERS');
    if (!stats || !stats.topServers.length) {
        context.fillStyle = '#80848e';
        context.font = "16px 'Segoe UI', Arial, sans-serif";
        context.fillText('No data available.', 70, 310);
    } else {
        stats.topServers.forEach((server, i) => {
            const yOffset = 300 + (i * 48);
            
            // Rank box
            context.fillStyle = '#00b0f4';
            context.beginPath();
            context.roundRect(70, yOffset - 20, 26, 26, 4);
            context.fill();
            context.fillStyle = '#ffffff';
            context.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            context.textAlign = 'center';
            context.fillText(`${i + 1}`, 83, yOffset - 2);

            // Name (Top)
            context.textAlign = 'left';
            context.fillStyle = '#ffffff';
            context.font = "bold 16px 'Segoe UI', Arial, sans-serif";
            const name = truncateText(context, server.name, 260);
            context.fillText(name, 110, yOffset - 6);

            // Duration (Bottom)
            context.fillStyle = '#b0b5ba';
            context.font = "14px 'Segoe UI', Arial, sans-serif";
            const durationTxt = formatDuration(server.listenTime);
            context.fillText(`Played for ${durationTxt}`, 110, yOffset + 12);
        });
    }

    // Card 2: Top Friends
    drawCard(415, 230, 335, 210, 'TOP FRIENDS');
    if (!stats || !stats.topFriends || !stats.topFriends.length) {
        context.fillStyle = '#80848e';
        context.font = "16px 'Segoe UI', Arial, sans-serif";
        context.fillText('No data available.', 435, 310);
    } else {
        stats.topFriends.forEach((friend, i) => {
            const yOffset = 300 + (i * 48);
            
            // Rank box
            context.fillStyle = '#00b0f4';
            context.beginPath();
            context.roundRect(435, yOffset - 20, 26, 26, 4);
            context.fill();
            context.fillStyle = '#ffffff';
            context.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            context.textAlign = 'center';
            context.fillText(`${i + 1}`, 448, yOffset - 2);

            // Name (Top)
            context.textAlign = 'left';
            context.fillStyle = '#ffffff';
            context.font = "bold 16px 'Segoe UI', Arial, sans-serif";
            const name = truncateText(context, friend.username, 260);
            context.fillText(name, 475, yOffset - 6);

            // Duration (Bottom)
            context.fillStyle = '#b0b5ba';
            context.font = "14px 'Segoe UI', Arial, sans-serif";
            const durationTxt = formatDuration(friend.listenTime);
            context.fillText(`Listened with for ${durationTxt}`, 475, yOffset + 12);
        });
    }

    // Card 3: Top Tracks
    drawCard(50, 460, 700, 210, 'TOP TRACKS');
    if (!stats || !stats.topTracks.length) {
        context.fillStyle = '#80848e';
        context.font = "16px 'Segoe UI', Arial, sans-serif";
        context.fillText('No data available.', 70, 540);
    } else {
        stats.topTracks.forEach((track, i) => {
            const yOffset = 530 + (i * 48);
            
            // Rank box
            context.fillStyle = '#00b0f4';
            context.beginPath();
            context.roundRect(70, yOffset - 20, 26, 26, 4);
            context.fill();
            context.fillStyle = '#ffffff';
            context.font = "bold 14px 'Segoe UI', Arial, sans-serif";
            context.textAlign = 'center';
            context.fillText(`${i + 1}`, 83, yOffset - 2);

            // Name (Top)
            context.textAlign = 'left';
            context.fillStyle = '#ffffff';
            context.font = "bold 16px 'Segoe UI', Arial, sans-serif";
            const name = truncateText(context, track.title, 630);
            context.fillText(name, 110, yOffset - 6);

            // Duration (Bottom)
            context.fillStyle = '#b0b5ba';
            context.font = "14px 'Segoe UI', Arial, sans-serif";
            const durationTxt = formatDuration(track.listenTime);
            context.fillText(`Played for ${durationTxt}`, 110, yOffset + 12);
        });
    }



    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile.png' });
    
    const container = new ContainerBuilder();
    const display = new TextDisplayBuilder().setContent(`📊 **Music Profile for ${targetUser.username}**`);
    
    const mediaItem = new MediaGalleryItemBuilder().setURL('attachment://profile.png');
    const mediaGallery = new MediaGalleryBuilder().addItems(mediaItem);
    
    container.addTextDisplayComponents(display);
    container.addMediaGalleryComponents(mediaGallery);

    const payload = {
        files: [attachment],
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
    };

    if (ctx.isInteraction) {
        return ctx.editReply(payload);
    } else {
        return ctx.reply(payload);
    }
}
