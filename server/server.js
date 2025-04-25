const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

async function setupRcloneConfig() {
  const configPath = path.join(__dirname, '..', 'rclone.conf');
  return configPath;
}

// Routes
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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} (http://localhost:${PORT})`));

module.exports = app;