const { glob } = require('glob');
const path = require('path');

module.exports = async (client) => {
    client.logger.info('Loading Events...');
    
    // Client Events
    const clientEventFiles = await glob(`${process.cwd()}/src/events/client/**/*.js`.replace(/\\/g, '/'));
    let clientCount = 0;
    
    clientEventFiles.forEach(file => {
        const eventName = path.basename(file, '.js');
        const event = require(path.resolve(file));
        
        client.on(eventName, event.bind(null, client));
        clientCount++;
    });

    client.logger.info(`Successfully loaded ${clientCount} Client Events.`);

    // Lavalink Events
    const lavalinkEventFiles = await glob(`${process.cwd()}/src/events/lavalink/**/*.js`.replace(/\\/g, '/'));
    let lavalinkCount = 0;
    
    lavalinkEventFiles.forEach(file => {
        const eventName = path.basename(file, '.js');
        const event = require(path.resolve(file));
        
        client.shoukaku.on(eventName, event.bind(null, client));
        lavalinkCount++;
    });

    client.logger.info(`Successfully loaded ${lavalinkCount} Lavalink Events.`);
};
