# Google Drive Index

A React application to browse and download files from Google Drive using rclone.

## Features

- Browse Google Drive folders and files
- Navigate through folder hierarchy
- Download files directly
- Clean and responsive UI using Material UI

## Project Structure

```
├── public/              # Static assets
├── server/              # Express server for API endpoints
│   └── server.js        # Server implementation
├── src/                 # React application source code
│   ├── components/      # React components
│   ├── App.js           # Main application component
│   ├── index.js         # Entry point
│   └── ...
├── rclone.conf          # rclone configuration file
├── package.json         # Project dependencies and scripts
├── Dockerfile           # Docker container configuration
├── docker-compose.yml   # Docker Compose configuration
└── README.md            # This file
```

## Setup

### Standard Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Make sure rclone is installed on your system and properly configured with your Google Drive account.

3. Ensure `rclone.conf` is present in the root directory with your Google Drive configured as "gdrive".

### Docker Setup

1. Build and run the Docker container:
   ```
   docker build -t gdrive-index .
   docker run -p 3005:3005 -v $(pwd)/rclone.conf:/app/rclone.conf --name gdrive-index-container gdrive-index
   ```

2. Or use Docker Compose (recommended):
   ```
   docker-compose up -d
   ```

3. Access the application at http://localhost:3005

4. To stop the container:
   ```
   docker stop gdrive-index-container
   ```

## Running the Application

### Standard Method

For development, run both the React app and Express server:

```
npm run dev
```

For production:

1. Build the React app:
   ```
   npm run build
   ```

2. Start the server:
   ```
   npm run server
   ```

## Environment Variables

Create a `.env` file in the root directory with:

```
PORT=3005
NODE_ENV=production  # For production mode
# Uncomment if you want to run the bots
# START_DISCORD_BOT=true
# DISCORD_BOT_TOKEN=your_discord_bot_token
# START_TELEGRAM_BOT=true
# TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

When using Docker, you can also set these in the `docker-compose.yml` file.

## License

MIT