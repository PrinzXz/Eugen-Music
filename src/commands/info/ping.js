module.exports = {
    name: 'ping',
    cooldown: 5000,
    developerOnly: false,
    permissions: [],
    aliases: ['latency'],
    description: 'Tampilkan latency bot dan Lavalink.',

    execute: async (client, ctx) => {
        const e = client.config.emojis;
        const start = Date.now();
        await ctx.deferReply();

        const apiPing = client.ws.ping;
        let lavalinkPing = '';

        if (client.shoukaku?.nodes) {
            for (const [name, node] of client.shoukaku.nodes) {
                const status = node.ping >= 0 ? `${node.ping}ms` : 'Disconnected';
                lavalinkPing += `\n${e.music} **Lavalink [${name}]**: \`${status}\``;
            }
        }

        await ctx.send(
            `${e.success} **Pong!**\n\n${e.loading} **Discord API**: \`${apiPing}ms\`\n${e.success} **Bot Response**: \`${Date.now() - start}ms\`${lavalinkPing}`,
            true
        );
    },
};
