module.exports = async (client, name, error) => {
    client.logger.error(`Lavalink Node: ${name} encountered an error:`, error);
};
