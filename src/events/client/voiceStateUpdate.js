const SessionManager = require('../../structures/SessionManager');

module.exports = async (client, oldState, newState) => {
    if (oldState.id !== client.user.id) return;

    const dispatcher = client.queues.get(newState.guild.id);
    if (!dispatcher) return;

    // Bot was manually disconnected from VC
    if (oldState.channelId && !newState.channelId) {
        client.logger.info(`Bot disconnected from VC in guild ${newState.guild.id}. Destroying dispatcher.`);
        dispatcher.destroy();
        return;
    }

    // Bot was moved to a different VC — persist new channel to session
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        SessionManager.saveSession(dispatcher);
    }
};
