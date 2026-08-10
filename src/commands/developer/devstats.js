const { developerIds } = require('../../../config.js');

module.exports = {
    name: 'devstats',
    cooldown: 0,
    developerOnly: true,
    permissions: [],
    aliases: ['dev', 'botstats', 'system'],
    description: 'Menampilkan statistik bot (Khusus Developer).',
    
    execute: async (client, ctx) => {
        const guilds = client.guilds.cache.size;
        const channels = client.channels.cache.size;
        const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const activeVoice = client.queues.size;
        
        // Memory Usage in MB
        const memory = process.memoryUsage();
        const rss = (memory.rss / 1024 / 1024).toFixed(2);
        const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
        
        // Uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;

        let statsMsg = `📊 **Developer Stats**\n\n`;
        statsMsg += `**Guilds:** ${guilds}\n`;
        statsMsg += `**Channels:** ${channels}\n`;
        statsMsg += `**Total Users:** ${users}\n`;
        statsMsg += `**Active Voice Connections:** ${activeVoice}\n\n`;
        
        statsMsg += `**Memory Usage:**\n`;
        statsMsg += `RSS: ${rss} MB\n`;
        statsMsg += `Heap Used: ${heapUsed} MB\n\n`;
        
        statsMsg += `**Uptime:**\n`;
        statsMsg += `${days}d ${hours}h ${minutes}m\n\n`;

        statsMsg += `**Lavalink Nodes:**\n`;
        if (client.shoukaku && client.shoukaku.nodes) {
            for (const [name, node] of client.shoukaku.nodes) {
                const state = node.state === 1 ? '✅ Connected' : '❌ Disconnected';
                const ping = node.ping >= 0 ? `${node.ping}ms` : 'N/A';
                const players = node.stats ? node.stats.players : 0;
                
                statsMsg += `- **${name}**: ${state} | Ping: ${ping} | Active Players: ${players}\n`;
            }
        } else {
            statsMsg += `- No nodes configured.\n`;
        }

        return ctx.send(statsMsg);
    }
};
