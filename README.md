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
2. Install rclone:
   - On Linux:
     ```bash
     sudo apt install rclone
     ```
   - On macOS:
     ```bash
     brew install rclone
     ```
   - Other platforms: see https://rclone.org/downloads/
3. Configure rclone:
   ```bash
   rclone config
   ```
   - Choose `n` for new remote
   - Name: `gdrive`
   - Select `drive` as the storage type
   - Follow the OAuth flow to grant access
4. Ensure `rclone.conf` is available in the project root. rclone will generate it at `~/.config/rclone/rclone.conf`. You can copy or symlink it:
   ```bash
   ln -s ~/.config/rclone/rclone.conf ./rclone.conf
   ```

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
   npm run prod
   ```

## Environment Variables

Create a `.env` file in the root directory with:

```
PORT=3005
DISCORD_BOT_TOKEN
DISCORD_BOT_TOKEN
DISCORD_BOT_TOKEN
TELEGRAM_BOT_TOKEN
TELETHON_API_ID
TELETHON_API_HASH

```

When using Docker, you can also set these in the `docker-compose.yml` file.

## License

MIT