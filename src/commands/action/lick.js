const { ApplicationCommandOptionType } = require('discord.js');
const { handleAction } = require('../../structures/ActionUtils');

module.exports = {
    name: 'lick',
    aliases: [],
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    description: 'Lick someone!',
    options: [
        {
            name: 'target',
            description: 'Pengguna target',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],

    execute: async (client, ctx) => {
        await handleAction(client, ctx, 'lick', 'menjilat', 'Eww... menjilat diri sendiri?', 'Hyaa! Jangan jilat aku!');
    }
};
