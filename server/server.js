require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const multer = require('multer');
const discordBot = require('./discord');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3005;

// Middlewares
app.use(cors());
app.use(express.json());

// Setup Multer for file uploads
const uploadM = multer({ dest: os.tmpdir() });

// Caching Download URLs
const downloadUrlCache = new Map();
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, value] of downloadUrlCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY_MS) {
      downloadUrlCache.delete(key);
    }
  }
}
setInterval(cleanupExpiredCache, 5 * 60 * 1000);

// Rclone config setup
async function setupRcloneConfig() {
  return path.join(__dirname, '..', 'rclone.conf');
}

// API Routes

app.get('/api/list', async (req, res) => {
  try {
    const folderPath = req.query.path || '/';
    const configPath = await setupRcloneConfig();

    const rcloneCommand = `rclone lsjson gdrive:"${folderPath}" --config="${configPath}"`;
    console.log('List command:', rcloneCommand);

    const { stdout } = await execAsync(rcloneCommand);
    const files = JSON.parse(stdout);

    const formattedFiles = files.map(file => ({
      ...file,
      Path: folderPath === '/' ? `/${file.Name}` : `${folderPath}/${file.Name}`
    }));

    res.status(200).json(formattedFiles);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.get('/api/getDownloadUrl', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'No file path specified' });

    if (downloadUrlCache.has(filePath)) {
      const cached = downloadUrlCache.get(filePath);
      if (Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
        return res.status(200).json({ url: cached.url });
      }
      downloadUrlCache.delete(filePath);
    }

    const configPath = await setupRcloneConfig();
    const sanitizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const rcloneCommand = `rclone lsf "gdrive:${sanitizedPath}" --format="ips" --config="${configPath}"`;
    console.log('Executing rclone command:', rcloneCommand);

    const { stdout } = await execAsync(rcloneCommand);
    const fileInfo = stdout.trim();
    if (!fileInfo) return res.status(404).json({ error: 'link_generation_failed' });

    const parts = fileInfo.split(';');
    const fileId = parts[0];
    if (!fileId) return res.status(404).json({ error: 'link_generation_failed' });

    const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
    downloadUrlCache.set(filePath, { url: downloadUrl, timestamp: Date.now() });

    res.status(200).json({ url: downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'link_generation_failed' });
  }
});

app.post('/api/upload-file', uploadM.single('file'), async (req, res) => {
  if (!req.file) {
    console.warn('Upload attempt without file received.');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    const targetFolder = req.body.targetFolder || '/';

    console.log(`Uploading file ${filePath} to GDrive at folder ${targetFolder}...`);

    const uploadResult = await discordBot.uploadFileToGDrive(filePath, targetFolder);

    fs.unlinkSync(filePath); // Cleanup uploaded file from temp

    res.status(200).json(uploadResult);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', express.json(), async (req, res) => {
  try {
    const { filePath, targetFolder } = req.body;
    if (!filePath) return res.status(400).json({ error: 'No file path specified' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const uploadResult = await discordBot.uploadFileToGDrive(filePath, targetFolder || '/');

    res.status(200).json(uploadResult);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(path.join(__dirname, '..', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (http://localhost:${PORT})`);

  if (process.env.START_DISCORD_BOT === 'true' || process.env.DISCORD_BOT_TOKEN) {
    discordBot.startBot();
  } else {
    console.log('Discord bot not started. Set START_DISCORD_BOT=true or DISCORD_BOT_TOKEN.');
  }

  if (process.env.START_TELEGRAM_BOT === 'true') {
    const py = spawn('python3', ['server/telegram.py'], { stdio: 'inherit' });
    py.on('close', code => console.log(`Telethon bot exited with code ${code}`));
  } else {
    console.log('Telethon bot not started. Set START_TELEGRAM_BOT=true to enable.');
  }
});

module.exports = app;
