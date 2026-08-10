const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');
const config = require('../../config');
const Logger = require('./Logger');
const LocaleManager = require('./LocaleManager');

class MusicClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent
            ],
            allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
        });

        this.commands = new Collection();
        this.aliases = new Collection();
        this.cooldowns = new Collection();
        this.queues = new Map();
        this.config = config;
        this.logger = Logger;
        this.locale = LocaleManager;

        this.shoukaku = new Shoukaku(new Connectors.DiscordJS(this), this.config.lavalink, {
            moveOnDisconnect: true,
            resume: true,
            resumeTimeout: 60,
            resumeByLibrary: true,
            reconnectTries: 5,
            restTimeout: 10000,
            connectionTimeout: 30000,
        });

    }

    build() {
        ['commands', 'events'].forEach(handler => {
            require(`../handlers/${handler}`)(this);
        });

        this.login(this.config.token).catch(err => {
            this.logger.error('Failed to login to Discord.', err);
        });
    }
}

module.exports = MusicClient;
