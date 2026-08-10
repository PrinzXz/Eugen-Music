const { ApplicationCommandOptionType } = require('discord.js');
const { handleAction } = require('../../structures/ActionUtils');

module.exports = {
    name: 'wave',
    aliases: [],
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    description: 'Wave someone!',
    options: [
        {
            name: 'target',
            description: 'Pengguna target',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],

    execute: async (client, ctx) => {
        await handleAction(client, ctx, 'wave', 'melambai pada', 'Melambai ke cermin.', 'Halo juga! 👋');
    }
};
