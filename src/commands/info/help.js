const {
    ApplicationCommandOptionType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags,
} = require('discord.js');

module.exports = {
    name: 'help',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: ['h', 'menu'],
    description: 'Tampilkan daftar perintah dan informasi bot.',
    options: [
        {
            name: 'perintah',
            description: 'Nama perintah untuk melihat detailnya',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const commandName = ctx.getString('perintah', 0);

        if (commandName) {
            const command = client.commands.get(commandName.toLowerCase())
                || client.commands.find(cmd => cmd.aliases?.includes(commandName.toLowerCase()));

            if (!command) {
                return ctx.send(`${e.error} ${ctx.t('help.not_found', { name: commandName })}`);
            }

            let helpText = `📖 **Detail Perintah: ${command.name}**\n\n`;
            helpText += `**Deskripsi:** ${command.description || ctx.t('help.no_description')}\n`;
            if (command.aliases?.length > 0) helpText += `**Alias:** ${command.aliases.join(', ')}\n`;
            if (command.cooldown) helpText += `**Cooldown:** ${command.cooldown / 1000} detik\n`;
            if (command.permissions?.length > 0) helpText += `**Izin Dibutuhkan:** ${command.permissions.join(', ')}\n`;

            return ctx.send(helpText);
        }

        const categories = [...new Set(client.commands.map(cmd => cmd.category || 'Lainnya'))];

        const generatePayload = (category) => {
            const commands = client.commands.filter(cmd => (cmd.category || 'Lainnya') === category);

            let text = `${e.music} **Eugen Music — Help Menu**\n\n`;
            if (category === 'main') {
                text += `**Selamat datang!**\nAku adalah bot musik dengan berbagai fitur. Gunakan menu dropdown untuk menjelajah perintahku.`;
            } else {
                text += `**Kategori: ${category.toUpperCase()}**\n`;
                commands.forEach(cmd => { text += `\`/${cmd.name}\` — ${cmd.description}\n`; });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_category')
                .setPlaceholder('Pilih kategori perintah...')
                .addOptions([
                    { label: 'Menu Utama', description: 'Kembali ke menu utama', value: 'main', default: category === 'main' },
                    ...categories.map(cat => ({
                        label: `Kategori: ${cat.toUpperCase()}`,
                        description: `Lihat semua perintah dalam kategori ${cat}`,
                        value: cat,
                        default: category === cat,
                    })),
                ]);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Privacy Policy & Legal')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://prinzxz.github.io/eugen-legal/')
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

            return {
                components: [container, row1, row2],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications,
                content: '',
            };
        };

        let responseMsg;
        if (ctx.isInteraction) {
            responseMsg = await ctx.reply({ ...generatePayload('main'), withResponse: true });
        } else {
            responseMsg = await ctx.channel.send(generatePayload('main'));
        }

        let selectedCategory = 'main';
        const collector = responseMsg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== ctx.author.id) {
                return i.reply({ content: `${e.error} Hanya pengguna perintah ini yang bisa memilih kategori!`, flags: 64 });
            }
            if (i.isStringSelectMenu() && i.customId === 'help_category') {
                selectedCategory = i.values[0];
                await i.update(generatePayload(selectedCategory));
            }
        });

        collector.on('end', () => {
            if (responseMsg.editable) {
                const payload = generatePayload(selectedCategory);
                payload.components = [payload.components[0], payload.components[2]];
                responseMsg.edit(payload).catch(() => {});
            }
        });
    },
};
