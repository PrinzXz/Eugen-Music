const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } = require('discord.js');

async function sendContainer(ctx, text, isInteraction, isEdit = false, isTemporary = false, imageUrl = null) {
    const config = require('../../config');
    const e = config.emojis;
    if (e && text) {
        text = text
            // Status / Feedback
            .replace(/✅/g, e.success)
            .replace(/❌/g, e.error)
            .replace(/⏳/g, e.loading)
            .replace(/🔍/g, e.search)
            .replace(/⚠️/g, e.error)
            // Music info
            .replace(/🎵/g, e.music)
            .replace(/🎶/g, e.music)
            .replace(/🔊/g, e.volume)
            .replace(/🎤/g, e.mic)
            // Playback controls
            .replace(/▶️/g, e.play)
            .replace(/⏸️/g, e.pause)
            .replace(/⏭️/g, e.skip)
            .replace(/⏹️/g, e.stop)
            .replace(/💤/g, e.stop)
            // Queue
            .replace(/🔀/g, e.shuffle)
            .replace(/🔁/g, e.loop_track)
            .replace(/🔄/g, e.loop_queue)
            // Extra
            .replace(/🤖/g, e.autoplay)
            .replace(/💾/g, e.save);
    }
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    
    if (imageUrl) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(imageUrl)
            )
        );
    }

    const payload = {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };

    if (isTemporary && isInteraction && !isEdit) {
        payload.flags |= MessageFlags.Ephemeral;
    }

    let msg;
    try {
        if (isInteraction) {
            if (isEdit) {
                msg = await ctx.editReply({ ...payload, content: '' });
            } else {
                msg = await ctx.reply({ ...payload, withResponse: true });
            }
        } else {
            msg = await ctx.channel.send(payload);
        }
    } catch (err) {
        console.error('sendContainer error:', err);
        return null;
    }

    if (isTemporary) {
        if (isInteraction && isEdit) {
            setTimeout(() => ctx.deleteReply().catch(()=>{}), 5000);
        } else if (!isInteraction && msg && msg.deletable) {
            setTimeout(() => msg.delete().catch(()=>{}), 5000);
        }
    }

    return msg;
}

async function setVoiceStatus(channelId, status) {
    const config = require('../../config');
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/voice-status`, {
        method: 'PUT',
        headers: {
            Authorization: `Bot ${config.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: status || '' })
    });
    
    if (!res.ok) {
        const errData = await res.text();
        throw new Error(`HTTP ${res.status}: ${errData}`);
    }
    return true;
}

module.exports = {
    sendContainer,
    setVoiceStatus
};
