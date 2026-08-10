const { ApplicationCommandOptionType } = require('discord.js');
const { handleAction } = require('../../structures/ActionUtils');

module.exports = {
    name: 'kick',
    aliases: [],
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    description: 'Kick someone!',
    options: [
        {
            name: 'target',
            description: 'Pengguna target',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],

    execute: async (client, ctx) => {
        await handleAction(client, ctx, 'kick', 'menendang', 'Kamu menendang dirimu sendiri?', 'Aduh! Kenapa menendangku?!');
    }
};
