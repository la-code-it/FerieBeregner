const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, 'holidays.db');
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create tables
db.serialize(() => {
    // Table for users
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table for holiday seasons
    db.run(`
        CREATE TABLE IF NOT EXISTS seasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            start_year INTEGER NOT NULL,
            buffer REAL DEFAULT 0,
            earned_per_month REAL DEFAULT 2.08,
            extra_holidays REAL DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Table for monthly holiday data
    db.run(`
        CREATE TABLE IF NOT EXISTS monthly_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            season_id INTEGER NOT NULL,
            month_index INTEGER NOT NULL,
            planned_holidays REAL DEFAULT 0,
            FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
            UNIQUE(season_id, month_index)
        )
    `);
});

// Database functions
const database = {
    // User functions
    getUserByUsername: (username) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    createUser: (username) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username) VALUES (?)',
                [username],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, username });
                }
            );
        });
    },

    // Get all seasons for a user
    getAllSeasons: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM seasons WHERE user_id = ? ORDER BY created_at DESC',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    // Get a specific season
    getSeason: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM seasons WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Create a new season
    createSeason: (userId, name, startYear, buffer = 0, earnedPerMonth = 2.08, extraHolidays = 5) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO seasons (user_id, name, start_year, buffer, earned_per_month, extra_holidays) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, name, startYear, buffer, earnedPerMonth, extraHolidays],
                function(err) {
                    if (err) reject(err);
                    else resolve({ 
                        id: this.lastID, 
                        user_id: userId, 
                        name, 
                        start_year: startYear, 
                        buffer,
                        earned_per_month: earnedPerMonth,
                        extra_holidays: extraHolidays
                    });
                }
            );
        });
    },

    // Update season
    updateSeason: (id, buffer, earnedPerMonth, extraHolidays) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE seasons SET buffer = ?, earned_per_month = ?, extra_holidays = ? WHERE id = ?',
                [buffer, earnedPerMonth, extraHolidays, id],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
    },

    // Delete season
    deleteSeason: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM seasons WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    // Get monthly data for a season
    getMonthlyData: (seasonId) => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM monthly_data WHERE season_id = ? ORDER BY month_index',
                [seasonId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    // Save or update monthly data
    saveMonthlyData: (seasonId, monthIndex, plannedHolidays) => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO monthly_data (season_id, month_index, planned_holidays) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(season_id, month_index) 
                 DO UPDATE SET planned_holidays = ?`,
                [seasonId, monthIndex, plannedHolidays, plannedHolidays],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    // Close database connection
    close: () => {
        db.close();
    }
};

module.exports = database;
