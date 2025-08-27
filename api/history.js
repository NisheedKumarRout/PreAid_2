const fs = require('fs').promises;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = req.headers['x-user-id'] || 'anonymous';

  try {
    if (req.method === 'GET') {
      const history = await loadHistory();
      res.json(history[userId] || []);
    } else if (req.method === 'DELETE') {
      const { index } = req.query;
      const history = await loadHistory();
      const userHistory = history[userId] || [];
      
      const idx = parseInt(index);
      if (idx >= 0 && idx < userHistory.length) {
        userHistory.splice(idx, 1);
        history[userId] = userHistory;
        await saveHistory(history);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'History item not found' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process history request' });
  }
}

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