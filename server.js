const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Get all seasons
app.get('/api/seasons', async (req, res) => {
    try {
        const seasons = await db.getAllSeasons();
        res.json(seasons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific season
app.get('/api/seasons/:id', async (req, res) => {
    try {
        const season = await db.getSeason(req.params.id);
        if (!season) {
            return res.status(404).json({ error: 'Season not found' });
        }
        res.json(season);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new season
app.post('/api/seasons', async (req, res) => {
    try {
        const { name, start_year, buffer } = req.body;
        if (!name || !start_year) {
            return res.status(400).json({ error: 'Name and start_year are required' });
        }
        const season = await db.createSeason(name, start_year, buffer || 0);
        res.status(201).json(season);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update season buffer
app.put('/api/seasons/:id', async (req, res) => {
    try {
        const { buffer } = req.body;
        const result = await db.updateSeason(req.params.id, buffer);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a season
app.delete('/api/seasons/:id', async (req, res) => {
    try {
        const result = await db.deleteSeason(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly data for a season
app.get('/api/seasons/:id/monthly', async (req, res) => {
    try {
        const data = await db.getMonthlyData(req.params.id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save monthly data
app.post('/api/seasons/:id/monthly', async (req, res) => {
    try {
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ferie Beregner is running on http://localhost:${PORT}`);
});
