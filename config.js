require('dotenv').config();

module.exports = {
    token: process.env.TOKEN,
    prefix: process.env.PREFIX || 'e.',
    botName: process.env.BOT_NAME || 'Eugen MUSIC',
    spotifyApiKey: 'ana-eugen',
    developerIds: [
        '960087921174663200',
        '1462061923053863024'
    ],
    emojis: {
        // --- Playback Controls ---
        play:       '<:play:1535731910142337064>',
        pause:      '<:pause:1535731908485316749>',
        stop:       '<:stop:1535731921085014126>',
        skip:       '<:skip:1535731919474393259>',
        prev:       '<:prev:1535731911832637440>',
        next:       '<:next:1535731900746834050>',

        // --- Loop ---
        loop_none:  '<:loop_none:1535731888335880282>',
        loop_track: '<:loop_track:1535731891917815849>',
        loop_queue: '<:loop_queue:1535731890042966016>',

        // --- Queue Actions ---
        shuffle:    '<:shuffle:1535731917754728518>',
        clear:      '<:clear:1535731875752976444>',
        trash:      '<:trash:1535731927322075146>',
        up:         '<:up:1535731929381343312>',
        down:       '<:down:1535731877699256401>',
        top:        '<:top:1535731925225050203>',
        options:    '<:options:1535731902911352974>',

        // --- Page Navigation ---
        page_prev:  '<:page_prev:1535731906551750737>',
        page_next:  '<:page_next:1535731904857378826>',

        // --- Display / Status ---
        music:      '<:music:1535731898377175212>',
        volume:     '<:volume:1535731932808224840>',
        loading:    '<:loading:1535731886494851192>',
        success:    '<:success:1535731922876239972>',
        error:      '<:error:1535731880106922144>',

        // --- User / Info ---
        user:       '<:user:1535731931457527908>',
        mic:        '<:mic:1535731895705542726>',

        // --- Extra Features ---
        autoplay:   '<:autoplay:1535731873446367393>',
        lyrics:     '<:lyrics:1535731893629231304>',
        filters:    '<:filters:1535731882501734451>',
        save:       '<:save:1535731913686515833>',
        search:     '<:search:1535731915548528771>',
        list:       '<:list:1535731884607406110>',
    },
    lavalink: [
        {
            name: 'Eugen Private Node',
            url: '38.45.71.27:2017',
            auth: 'eugenmsc',
            secure: false
        }
        /*
        ,{
            name: 'AjieBlogs Public Node (V4)',
            url: 'lava-v4.ajieblogs.eu.org:443',
            auth: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        ... (public nodes)
        */
    ]
};
