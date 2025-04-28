const fs = require('fs');
const path = require('path');
const os = require('os');

if (!process.env.DISCORD_BOT_TOKEN) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const { Client, GatewayIntentBits, Partials, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_DISCORD_BOT_TOKEN';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'YOUR_DISCORD_CLIENT_ID';
const GUILD_ID = process.env.DISCORD_GUILD_ID || 'YOUR_DISCORD_GUILD_ID';
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message]
});

const commands = [
  new SlashCommandBuilder()
    .setName('upload')
    .setDescription('Upload a file to Google Drive')
    .addAttachmentOption(option => 
      option.setName('file')
        .setDescription('The file to upload')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('hii')
    .setDescription('Say hello to the bot')
];

async function setupRcloneConfig() {
  const configPath = path.join(__dirname, '..', 'rclone.conf');
  return configPath;
}

async function uploadFileToGDrive(filePath, targetFolder = '/') {
  try {
    const configPath = await setupRcloneConfig();
    
    const sanitizedFolder = targetFolder.startsWith('/') ? targetFolder.substring(1) : targetFolder;
    const destinationPath = sanitizedFolder ? `gdrive:${sanitizedFolder}` : 'gdrive:';
    
    const rcloneCommand = `rclone copy "${filePath}" "${destinationPath}" --config="${configPath}" -v`;
    console.log('Executing rclone upload command:', rcloneCommand);
    
    const { stdout, stderr } = await execAsync(rcloneCommand);
    console.log('rclone stdout:', stdout);
    if (stderr) console.error('rclone stderr:', stderr);
    
    const fileName = path.basename(filePath);
    const filePathInDrive = sanitizedFolder ? `${sanitizedFolder}/${fileName}` : fileName;
    
    const lsfCommand = `rclone lsf "gdrive:${filePathInDrive}" --format="ips" --config="${configPath}"`;
    console.log('Executing rclone command to get file ID:', lsfCommand);
    
    const { stdout: fileInfo } = await execAsync(lsfCommand);
    const fileId = fileInfo.trim().split(';')[0];
    
    if (!fileId) {
      throw new Error('Could not get file ID');
    }
    
    const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
    return { 
      fileName, 
      fileId, 
      url: downloadUrl,
      path: filePathInDrive
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

async function downloadDiscordAttachment(attachment) {
  const tempDir = path.join(os.tmpdir(), 'discord-uploads');
  fs.mkdirSync(tempDir, { recursive: true });
  
  const fileName = attachment.name;
  const tempFilePath = path.join(tempDir, fileName);
  
  console.log('Downloading attachment to:', tempFilePath);
  
  try {
    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const fileStream = fs.createWriteStream(tempFilePath);
    
    return new Promise((resolve, reject) => {
      const { body } = response;
      
      fileStream.on('error', err => {
        console.error('Error writing to file stream:', err);
        fileStream.close();
        fs.unlink(tempFilePath, () => {}); // Clean up file
        reject(err);
      });
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(tempFilePath);
      });
      
      if (body) {
        const { Readable } = require('stream');
        const readableStream = Readable.fromWeb ? 
          Readable.fromWeb(body) : 
          Readable.from(body);
          
        readableStream.pipe(fileStream);
        
        readableStream.on('error', err => {
          console.error('Error in readable stream:', err);
          fileStream.close();
          fs.unlink(tempFilePath, () => {});
          reject(err);
        });
      } else {
        fileStream.close();
        fs.unlink(tempFilePath, () => {});
        reject(new Error('No response body available'));
      }
    });
  } catch (error) {
    console.error('Error downloading file from Discord:', error);
    throw error;
  }
}

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');
    
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands.map(command => command.toJSON()) },
    );
    
    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands.map(command => command.toJSON()) },
      );
    }
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  if (!interaction.deferred && !interaction.replied) {
    try {
      await interaction.deferReply();
    } catch (err) {
      console.error('Failed to defer interaction:', err);
      return;
    }
  }

  const { commandName } = interaction;
  
  try {
    if (commandName === 'hii') {
      await interaction.editReply('hello');
      return;
    }
    
    if (commandName === 'upload') {
      console.log('Processing upload command...');

      try {
        const attachment = interaction.options.getAttachment('file');
        if (!attachment) {
          console.log('No attachment found in command');
          return await interaction.editReply('No file provided. Please attach a file when using the /upload command.');
        }

        console.log('Found attachment:', attachment.name);

        const tempFilePath = await downloadDiscordAttachment(attachment);
        const uploadResult = await uploadFileToGDrive(tempFilePath, '/');
        fs.unlinkSync(tempFilePath);

        const responseMsg = `✅ File uploaded successfully!\n🔗 URL: ${uploadResult.url}`;
        await interaction.editReply(responseMsg);

      } catch (error) {
        console.error('Error handling upload command:', error);
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({ content: `❌ Error uploading file: ${error.message}`, flags: 64 }).catch(err => console.error('Failed to send error reply:', err));
        } else {
          await interaction.editReply(`❌ Error uploading file: ${error.message}`).catch(err => console.error('Failed to edit reply with error:', err));
        }
      }
    }
  } catch (error) {
    console.error('Error handling command:', error);
    if (error.code === 10062) {
      console.error('Interaction expired or invalid (10062). This is normal if the interaction timed out.');
    }
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

function startBot() {
  console.log('Starting Discord bot...');
  client.login(TOKEN).catch(error => {
    console.error('Failed to start Discord bot:', error);
  });
}

module.exports = {
  startBot,
  uploadFileToGDrive
};