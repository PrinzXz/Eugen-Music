const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        this.db = new Database(path.join(dataDir, 'database.sqlite'));
        this.db.pragma('journal_mode = WAL'); // Better performance and concurrency

        this.initTables();
    }

    initTables() {
        // Table for User Settings (Autoplay, 24/7, Status Template)
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                autoplay INTEGER DEFAULT 0,
                twentyFourSeven INTEGER DEFAULT 0,
                loop TEXT DEFAULT 'none',
                language TEXT DEFAULT 'id',
                statusTemplate TEXT
            )
        `).run();

        // Migration: add language column for existing databases
        try {
            this.db.prepare(`ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'id'`).run();
        } catch {
            // Column already exists — safe to ignore
        }

        // Table for Guild Settings
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY
            )
        `).run();

        // Table for User Volume
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS user_volume (
                user_id TEXT PRIMARY KEY,
                volume INTEGER DEFAULT 100
            )
        `).run();

        // Table for User Stats
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS user_stats (
                user_id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )
        `).run();

        // Table for Active Sessions
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS guild_sessions (
                guild_id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )
        `).run();
    }
}

module.exports = new DatabaseManager().db;
