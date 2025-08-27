const fs = require('fs').promises;
const path = require('path');

// Vercel serverless function for health advice
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { issue } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    if (!issue) {
      return res.status(400).json({ error: 'Health issue is required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
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

    // Call Gemini API
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contextPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
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
}

// Simple file-based storage for Vercel
async function loadHistory() {
  try {
    const filePath = '/tmp/user_history.json';
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveHistory(history) {
  try {
    const filePath = '/tmp/user_history.json';
    await fs.writeFile(filePath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving history:', error);
  }
}