const MusicClient = require('./structures/Client');

const client = new MusicClient();

client.build();

// Catch unhandled exceptions to prevent bot crash
process.on('unhandledRejection', (error) => {
    client.logger.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', (error) => {
    client.logger.error('Uncaught exception:', error);
});
