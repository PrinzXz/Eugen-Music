const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { developerIds } = require('../../../config.js');

module.exports = {
    name: 'serverlist',
    cooldown: 0,
    developerOnly: true,
    permissions: [],
    aliases: ['servers', 'slist'],
    description: 'Menampilkan daftar server dan detailnya (Khusus Developer).',
    
    execute: async (client, ctx) => {
        if (ctx.isInteraction) await ctx.deferReply();

        const guilds = Array.from(client.guilds.cache.values()).sort((a, b) => b.memberCount - a.memberCount);
        
        if (guilds.length === 0) {
            return ctx.send('❌ Bot belum bergabung dengan server apapun.');
        }

        const topGuilds = guilds.slice(0, 25);

        const options = topGuilds.map((g, i) => {
            return {
                label: `${i + 1}. ${g.name.substring(0, 50)}`,
                description: `Anggota: ${g.memberCount} | ID: ${g.id}`,
                value: g.id
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`serverlist_${ctx.id}`)
            .setPlaceholder('Pilih server untuk melihat detailnya...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const replyOptions = {
            content: `🌐 **Daftar Server Bot (Top ${topGuilds.length} dari total ${guilds.length})**\nSilakan pilih server dari dropdown di bawah untuk melihat informasinya secara rinci.`,
            components: [row]
        };

        let msg;
        if (ctx.isInteraction) {
            msg = await ctx.editReply(replyOptions);
        } else {
            msg = await ctx.channel.send(replyOptions);
        }

        const filter = i => i.customId === `serverlist_${ctx.id}` && developerIds.includes(i.user.id);
        const collector = msg.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 60000 });

        collector.on('collect', async i => {
            const guildId = i.values[0];
            const selectedGuild = client.guilds.cache.get(guildId);
            
            if (!selectedGuild) {
                return i.update({ content: '❌ Server tidak ditemukan (mungkin bot sudah ditendang).', components: [row] });
            }

            const owner = await selectedGuild.fetchOwner().catch(() => null);
            const ownerTag = owner ? owner.user.tag : 'Tidak diketahui';
            
            const isPlaying = client.queues.has(selectedGuild.id) ? `${client.config.emojis.music} Sedang memutar musik` : `${client.config.emojis.stop} Sedang diam`;
            const boostCount = selectedGuild.premiumSubscriptionCount || 0;
            const verificationLevels = ['Tidak ada', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];
            const verification = verificationLevels[selectedGuild.verificationLevel] || 'Tidak diketahui';

            let detailText = `🏢 **Detail Server: ${selectedGuild.name}**\n\n`;
            detailText += `**📝 ID:** \`${selectedGuild.id}\`\n`;
            detailText += `**👑 Owner:** ${ownerTag} (\`${selectedGuild.ownerId}\`)\n`;
            if (selectedGuild.description) detailText += `**📖 Deskripsi:** ${selectedGuild.description}\n`;
            
            const textChannels = selectedGuild.channels.cache.filter(c => c.isTextBased()).size;
            const voiceChannels = selectedGuild.channels.cache.filter(c => c.isVoiceBased()).size;
            
            detailText += `**👥 Members:** ${selectedGuild.memberCount}\n`;
            detailText += `**💬 Channels:** ${selectedGuild.channels.cache.size} total (${textChannels} Text | ${voiceChannels} Voice)\n`;
            detailText += `**🎭 Roles:** ${selectedGuild.roles.cache.size}\n`;
            detailText += `**😃 Emojis:** ${selectedGuild.emojis.cache.size}\n`;
            detailText += `**🚀 Boosts:** Tier ${selectedGuild.premiumTier} (${boostCount} Boosts)\n`;
            detailText += `**🛡️ Verification:** ${verification}\n`;
            
            const mfaLevel = selectedGuild.mfaLevel === 1 ? 'Aktif (2FA Required)' : 'Tidak Aktif';
            detailText += `**🔐 MFA/2FA Moderasi:** ${mfaLevel}\n`;

            if (selectedGuild.vanityURLCode) {
                detailText += `**🔗 Vanity URL:** discord.gg/${selectedGuild.vanityURLCode}\n`;
            }

            if (selectedGuild.features.length > 0) {
                const features = selectedGuild.features.map(f => f.replace(/_/g, ' ').toLowerCase()).join(', ');
                detailText += `**🌟 Fitur Khusus:** \`${features}\`\n`;
            }

            detailText += `**🤖 Status Bot:** ${isPlaying}\n`;
            detailText += `**📅 Dibuat Pada:** <t:${Math.floor(selectedGuild.createdTimestamp / 1000)}:R>\n`;
            detailText += `**🤖 Bot Masuk Pada:** <t:${Math.floor(selectedGuild.joinedTimestamp / 1000)}:R>\n`;
            if (selectedGuild.iconURL()) {
                detailText += `**🖼️ Icon Server:** [Klik di sini](${selectedGuild.iconURL({ extension: 'png', size: 1024 })})\n`;
            }

            await i.update({ content: detailText, components: [row] });
        });

        collector.on('end', () => {
            if (msg.editable) {
                msg.edit({ components: [] }).catch(()=>{});
            }
        });
    }
};
