const { ApplicationCommandOptionType } = require('discord.js');
const { handleAction } = require('../../structures/ActionUtils');

module.exports = {
    name: 'dance',
    aliases: [],
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    description: 'Dance someone!',
    options: [
        {
            name: 'target',
            description: 'Pengguna target',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],

    execute: async (client, ctx) => {
        await handleAction(client, ctx, 'dance', 'berdansa dengan', 'Kamu berdansa sendirian.', 'Ayo berdansa bersama!');
    }
};
