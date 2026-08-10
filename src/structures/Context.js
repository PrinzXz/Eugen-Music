const { Message, ChatInputCommandInteraction } = require('discord.js');
const { sendContainer } = require('./Utils');

class Context {
    constructor(ctx, args = []) {
        this.ctx = ctx;
        this.isInteraction = ctx instanceof ChatInputCommandInteraction;
        this.interaction = this.isInteraction ? ctx : null;
        this.message = this.isInteraction ? null : ctx;

        this.id = ctx.id;
        this.applicationId = ctx.applicationId;
        this.channelId = ctx.channelId;
        this.guildId = ctx.guildId;

        this.author = ctx instanceof Message ? ctx.author : ctx.user;
        this.user = this.author;
        this.member = ctx.member;
        this.guild = ctx.guild;
        this.channel = ctx.channel;
        this.client = ctx.client;

        this.args = args;
        this.deferred = false;
        this.replied = false;
    }

    getString(name) {
        if (this.isInteraction) return this.interaction.options.getString(name);
        return this.args.length > 0 ? this.args.join(' ') : null;
    }

    getUser(name, argIndex = 0) {
        if (this.isInteraction) return this.interaction.options.getUser(name);
        if (this.message.mentions.users.size > 0) return this.message.mentions.users.first();
        if (this.args[argIndex]) {
            const id = this.args[argIndex].replace(/[^0-9]/g, '');
            if (id.length > 15) return this.client.users.cache.get(id);
        }
        return null;
    }

    getNumber(name, argIndex = 0) {
        if (this.isInteraction) {
            return this.interaction.options.getNumber(name) || this.interaction.options.getInteger(name);
        }
        if (this.args[argIndex]) {
            const num = parseInt(this.args[argIndex]);
            if (!isNaN(num)) return num;
        }
        return null;
    }

    getInteger(name, argIndex = 0) {
        if (this.isInteraction) {
            return this.interaction.options.getInteger(name) || this.interaction.options.getNumber(name);
        }
        if (this.args[argIndex]) {
            const num = parseInt(this.args[argIndex]);
            if (!isNaN(num)) return num;
        }
        return null;
    }

    getMember(name, argIndex = 0) {
        if (this.isInteraction) return this.interaction.options.getMember(name);
        if (this.message.mentions.members.size > 0) return this.message.mentions.members.first();
        if (this.args[argIndex]) {
            const id = this.args[argIndex].replace(/[^0-9]/g, '');
            if (id.length > 15) return this.guild.members.cache.get(id);
        }
        return null;
    }

    async deferReply(options = {}) {
        if (this.isInteraction) {
            await this.interaction.deferReply(options);
        } else {
            await this.channel.sendTyping();
        }
        this.deferred = true;
    }

    async reply(options) {
        this.replied = true;
        if (this.isInteraction) {
            return this.deferred
                ? this.interaction.editReply(options)
                : this.interaction.reply(options);
        }
        return this.message.reply(options);
    }

    async editReply(options) {
        if (this.isInteraction) return this.interaction.editReply(options);
        return this.channel.send(options);
    }

    async fetchReply() {
        if (this.isInteraction) return this.interaction.fetchReply();
        return null;
    }

    async deleteReply() {
        if (this.isInteraction) return this.interaction.deleteReply().catch(() => {});
        return Promise.resolve();
    }

    async send(text, isEdit = false) {
        return sendContainer(this.ctx, text, this.isInteraction, isEdit);
    }

    async sendWithMedia(text, imageUrl, isEdit = false) {
        return sendContainer(this.ctx, text, this.isInteraction, isEdit, false, imageUrl);
    }

    async sendTemporary(text, isEdit = false) {
        return sendContainer(this.ctx, text, this.isInteraction, isEdit, true);
    }

    async sendEmbed(embed) {
        return this.reply({ embeds: [embed] });
    }

    /**
     * Translate a locale key using the invoking user's language preference.
     * @param {string} key - Locale key (e.g. 'error.not_playing')
     * @param {Object} vars - Optional interpolation variables
     */
    t(key, vars = {}) {
        const SettingsManager = require('./SettingsManager');
        const lang = SettingsManager.getLanguage(this.user?.id) || 'id';
        return this.client.locale.t(lang, key, vars);
    }
}

module.exports = Context;
