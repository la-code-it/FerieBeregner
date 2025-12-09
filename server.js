const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./database');
const https = require('https');
const http = require('http');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// HTTPS configuration for production
const useLetsEncrypt = NODE_ENV === 'production' && process.env.DOMAIN && process.env.MAINTAINER_EMAIL;
const useManualHTTPS = NODE_ENV === 'production' && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH && !useLetsEncrypt;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'ferie-beregner-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: useLetsEncrypt || useManualHTTPS, // Set to true when using HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username || username.trim().length === 0) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Check if user exists
        let user = await db.getUserByUsername(username);
        
        // If user doesn't exist, create new user
        if (!user) {
            user = await db.createUser(username);
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
});

app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true, 
            user: { 
                id: req.session.userId, 
                username: req.session.username 
            } 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Get all seasons
app.get('/api/seasons', requireAuth, async (req, res) => {
    try {
        const seasons = await db.getAllSeasons(req.session.userId);
        res.json(seasons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific season
app.get('/api/seasons/:id', requireAuth, async (req, res) => {
    try {
        const season = await db.getSeason(req.params.id);
        if (!season) {
            return res.status(404).json({ error: 'Season not found' });
        }
        // Verify season belongs to user
        if (season.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(season);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new season
app.post('/api/seasons', requireAuth, async (req, res) => {
    try {
        const { name, start_year, buffer, earned_per_month, extra_holidays } = req.body;
        if (!name || !start_year) {
            return res.status(400).json({ error: 'Name and start_year are required' });
        }
        const season = await db.createSeason(
            req.session.userId, 
            name, 
            start_year, 
            buffer || 0,
            earned_per_month || 2.08,
            extra_holidays || 5
        );
        res.status(201).json(season);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update season buffer
app.put('/api/seasons/:id', requireAuth, async (req, res) => {
    try {
        const { buffer, earned_per_month, extra_holidays } = req.body;
        // Verify season belongs to user
        const season = await db.getSeason(req.params.id);
        if (!season || season.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const result = await db.updateSeason(
            req.params.id, 
            buffer !== undefined ? buffer : season.buffer,
            earned_per_month !== undefined ? earned_per_month : season.earned_per_month,
            extra_holidays !== undefined ? extra_holidays : season.extra_holidays
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a season
app.delete('/api/seasons/:id', requireAuth, async (req, res) => {
    try {
        // Verify season belongs to user
        const season = await db.getSeason(req.params.id);
        if (!season || season.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const result = await db.deleteSeason(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly data for a season
app.get('/api/seasons/:id/monthly', requireAuth, async (req, res) => {
    try {
        // Verify season belongs to user
        const season = await db.getSeason(req.params.id);
        if (!season || season.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = await db.getMonthlyData(req.params.id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save monthly data
app.post('/api/seasons/:id/monthly', requireAuth, async (req, res) => {
    try {
        // Verify season belongs to user
        const season = await db.getSeason(req.params.id);
        if (!season || season.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { month_index, planned_holidays } = req.body;
        const result = await db.saveMonthlyData(
            req.params.id,
            month_index,
            planned_holidays
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
if (useLetsEncrypt) {
    // Use Greenlock Express for automatic Let's Encrypt certificates
    require('greenlock-express')
        .init({
            packageRoot: __dirname,
            configDir: './greenlock.d',
            maintainerEmail: process.env.MAINTAINER_EMAIL,
            cluster: false
        })
        .ready((glx) => {
            // Serve the app with HTTPS
            glx.serveApp(app);
            console.log(`Ferie Beregner is running with Let's Encrypt SSL on https://${process.env.DOMAIN}`);
        });
} else if (useManualHTTPS) {
    // Load SSL certificates manually
    const httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
    
    https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log(`Ferie Beregner is running on https://localhost:${PORT} (Production mode with manual SSL)`);
    });
} else {
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
        console.log(`Ferie Beregner is running on http://localhost:${PORT} (${NODE_ENV} mode)`);
    });
}
