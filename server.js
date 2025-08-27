require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Replace with your actual Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_ACTUAL_GEMINI_API_KEY_HERE';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Simple file-based storage for user history
const HISTORY_FILE = 'user_history.json';

// Load user history
async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save user history
async function saveHistory(history) {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Get user ID from session/cookie (simplified)
function getUserId(req) {
  return req.headers['x-user-id'] || 'anonymous';
}

// Health advice endpoint
app.post('/api/health-advice', async (req, res) => {
  try {
    const { issue } = req.body;
    const userId = getUserId(req);
    
    if (!issue) {
      return res.status(400).json({ error: 'Health issue is required' });
    }

    // Load user history
    const history = await loadHistory();
    const userHistory = history[userId] || [];
    
    // Create context from user history
    let contextPrompt = `Provide first aid or health advice for: ${issue}`;
    if (userHistory.length > 0) {
      const recentIssues = userHistory.slice(-3).map(h => h.issue).join(', ');
      contextPrompt += `\n\nUser's recent health concerns: ${recentIssues}. Consider any patterns or related conditions.`;
    }

    // Validate API key
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_ACTUAL_GEMINI_API_KEY_HERE') {
      return res.status(500).json({ error: 'Gemini API key not configured. Please add your API key to server.js' });
    }

    // Call Gemini API
    console.log('Making API request to:', GEMINI_API_URL.substring(0, 80) + '...');
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contextPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      })
    });

    console.log('API Response status:', response.status);
    const data = await response.json();
    console.log('API Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      throw new Error(data.error?.message || `API request failed: ${response.status}`);
    }

    const advice = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!advice) {
      throw new Error('No advice generated');
    }

    // Save to user history
    userHistory.push({
      issue,
      advice,
      timestamp: new Date().toISOString()
    });
    
    history[userId] = userHistory;
    await saveHistory(history);

    res.json({ advice });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user history endpoint
app.get('/api/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    const history = await loadHistory();
    res.json(history[userId] || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// Delete history item endpoint
app.delete('/api/history/:index', async (req, res) => {
  try {
    const userId = getUserId(req);
    const index = parseInt(req.params.index);
    const history = await loadHistory();
    const userHistory = history[userId] || [];
    
    if (index >= 0 && index < userHistory.length) {
      userHistory.splice(index, 1);
      history[userId] = userHistory;
      await saveHistory(history);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'History item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history item' });
  }
});

// Test endpoint to check API key
app.get('/api/test', (req, res) => {
  const keyExists = !!GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_ACTUAL_GEMINI_API_KEY_HERE' && GEMINI_API_KEY !== 'your_actual_api_key_here';
  res.json({ 
    keyConfigured: keyExists,
    keyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0,
    keyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 8) + '...' : 'none'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API Key configured:', !!GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_ACTUAL_GEMINI_API_KEY_HERE');
  console.log('API Key length:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
});