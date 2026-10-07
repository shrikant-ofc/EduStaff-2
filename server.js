import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiApp from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API routes
app.use(apiApp);

// Serve static assets directly
app.use(express.static(__dirname));

// Route-friendly cleaner URL resolution (e.g. /dashboard -> /dashboard.html)
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    const cleanPath = req.path.replace(/^\//, '');
    const htmlPath = path.join(__dirname, `${cleanPath}.html`);
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
  }
  next();
});

// Fallback to index.html for root or unknown HTML paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduStaff server running at http://0.0.0.0:${PORT}`);
  });
}

export default app;
