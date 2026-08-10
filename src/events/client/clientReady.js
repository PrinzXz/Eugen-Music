const { ActivityType } = require('discord.js');

module.exports = async (client) => {
    client.logger.info(`Logged in as ${client.user.tag}!`);
    
    const updatePresence = () => {
        const serverCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        client.user.setActivity(`e. help | ${userCount} Users | ${serverCount} Servers`, { type: ActivityType.Playing });
    };

    updatePresence();
    setInterval(updatePresence, 5 * 60 * 1000); // Update setiap 5 menit

    // Register slash commands
    const slashCommands = client.commands.map(cmd => {
        return {
            name: cmd.name,
            description: cmd.description || 'No description provided.',
            options: cmd.options || []
        };
    });

    try {
        await client.application.commands.set(slashCommands);
        client.logger.info('Successfully registered application commands.');
    } catch (error) {
        client.logger.error('Failed to register application commands.', error);
    }
};
