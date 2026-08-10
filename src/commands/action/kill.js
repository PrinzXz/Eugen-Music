const { ApplicationCommandOptionType } = require('discord.js');
const { handleAction } = require('../../structures/ActionUtils');

module.exports = {
    name: 'kill',
    aliases: [],
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    description: 'Kill someone!',
    options: [
        {
            name: 'target',
            description: 'Pengguna target',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],

    execute: async (client, ctx) => {
        await handleAction(client, ctx, 'kill', 'membunuh', 'Jangan lakukan itu!', 'TIDAAAK! *mati*');
    }
};
