const { blue, cyan, green, red, yellow, magenta } = require('colorette');
const moment = require('moment');

class Logger {
    static get timestamp() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }

    static info(content) {
        console.log(`${cyan(this.timestamp)} ${blue('[INFO]')} ${content}`);
    }

    static warn(content) {
        console.log(`${cyan(this.timestamp)} ${yellow('[WARN]')} ${content}`);
    }

    static error(content, error = null) {
        console.log(`${cyan(this.timestamp)} ${red('[ERROR]')} ${content}`);
        if (error) console.error(error);
    }

    static debug(content) {
        console.log(`${cyan(this.timestamp)} ${magenta('[DEBUG]')} ${content}`);
    }

    static lavalink(content) {
        console.log(`${cyan(this.timestamp)} ${green('[LAVALINK]')} ${content}`);
    }
}

module.exports = Logger;
