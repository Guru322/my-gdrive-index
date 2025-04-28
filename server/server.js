require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const discordBot = require('./discord');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const downloadUrlCache = new Map();
const CACHE_EXPIRY_MS = 10 * 60 * 1000; 

function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, value] of downloadUrlCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY_MS) {
      downloadUrlCache.delete(key);
    }
  }
}

setInterval(cleanupExpiredCache, 5 * 60 * 1000);

async function setupRcloneConfig() {
  const configPath = path.join(__dirname, '..', 'rclone.conf');
  return configPath;
}

app.get('/api/list', async (req, res) => {
  try {
    const folderPath = req.query.path || '/';
    
    const configPath = await setupRcloneConfig();
    
    const rcloneCommand = `rclone lsjson gdrive:"${folderPath}" --config=${configPath}`;
    console.log('List command:', rcloneCommand);
    
    const { stdout } = await execAsync(rcloneCommand);
    
    const files = JSON.parse(stdout);
    
    const formattedFiles = files.map(file => ({
      ...file,
      Path: folderPath === '/' 
        ? `/${file.Name}` 
        : `${folderPath}/${file.Name}`
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
    console.log('Download URL requested for file:', filePath);
    
    if (!filePath) {
      return res.status(400).json({ error: 'No file path specified' });
    }

    if (downloadUrlCache.has(filePath)) {
      const cachedData = downloadUrlCache.get(filePath);
      const now = Date.now();
      
      if (now - cachedData.timestamp < CACHE_EXPIRY_MS) {
        console.log('Returning cached download URL for:', filePath);
        return res.status(200).json({ url: cachedData.url });
      } else {
        downloadUrlCache.delete(filePath);
      }
    }
    
    const configPath = await setupRcloneConfig();
    const sanitizedFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    const rcloneCommand = `rclone lsf "gdrive:${sanitizedFilePath}" --format="ips" --config="${configPath}"`;
    console.log('Executing rclone command:', rcloneCommand);
    
    try {
      const { stdout, stderr } = await execAsync(rcloneCommand);
      const fileInfo = stdout.trim();
      
      if (!fileInfo) {
        console.error('No file info returned by rclone');
        return res.status(404).json({ error: 'link_generation_failed' });
      }
      
      const parts = fileInfo.split(';');
      if (parts.length < 1) {
        return res.status(404).json({ error: 'link_generation_failed' });
      }
      
      const fileId = parts[0];
      if (!fileId) {
        return res.status(404).json({ error: 'link_generation_failed' });
      }
      
      const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
      
      downloadUrlCache.set(filePath, {
        url: downloadUrl,
        timestamp: Date.now()
      });
      
      console.log('Generated Download URL:', downloadUrl);
      res.status(200).json({ url: downloadUrl });
    } catch (error) {
      console.error('rclone command failed:', error);
      return res.status(404).json({ error: 'link_generation_failed' });
    }
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'link_generation_failed' });
  }
});

app.get('/api/download', async (req, res) => {
  try {
    const filePath = req.query.path;
    console.log('Download requested for file:', filePath);
    
    if (!filePath) {
      return res.status(400).json({ error: 'No file path specified' });
    }
    
    const configPath = await setupRcloneConfig();
    
    const tempDir = path.join(os.tmpdir(), 'rclone-downloads');
    fs.mkdirSync(tempDir, { recursive: true });
    
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(tempDir, fileName);
    
    console.log('Temp file path:', tempFilePath);
    
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    const sanitizedFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    const rcloneCommand = `rclone copy "gdrive:${sanitizedFilePath}" "${tempDir}" --config="${configPath}" -v`;
    console.log('Executing rclone command:', rcloneCommand);
    
    const { stdout, stderr } = await execAsync(rcloneCommand);
    console.log('rclone stdout:', stdout);
    if (stderr) console.error('rclone stderr:', stderr);
    
    if (!fs.existsSync(tempFilePath)) {
      console.error('File not found at temp path after rclone copy');
      return res.status(404).json({ error: 'File not found after download attempt' });
    }
    
    const stats = fs.statSync(tempFilePath);
    console.log('File size:', stats.size);
    
    let mimeType = 'application/octet-stream';
    try {
      const { stdout: mimeOutput } = await execAsync(`file --mime-type -b "${tempFilePath}"`);
      mimeType = mimeOutput.trim() || 'application/octet-stream';
    } catch (err) {
      console.error('Error getting MIME type:', err);
    }
    
    console.log('Setting headers for download. MIME type:', mimeType);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', stats.size);
    
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
    
    fileStream.on('end', () => {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temp file cleaned up:', tempFilePath);
      } catch (err) {
        console.error('Error cleaning up temp file:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: `Failed to download file: ${error.message}` });
  }
});

app.post('/api/upload', express.json(), async (req, res) => {
  try {
    const { filePath, targetFolder } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No file path specified' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const uploadResult = await discordBot.uploadFileToGDrive(filePath, targetFolder || '/');
    
    res.status(200).json(uploadResult);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: `Failed to upload file: ${error.message}` });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (http://localhost:${PORT})`);
  
  if (process.env.START_DISCORD_BOT === 'true' || process.env.DISCORD_BOT_TOKEN) {
    discordBot.startBot();
  } else {
    console.log('Discord bot not started. Set START_DISCORD_BOT=true or DISCORD_BOT_TOKEN to enable.');
  }
});

module.exports = app;