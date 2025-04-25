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
└── README.md            # This file
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Make sure rclone is installed on your system and properly configured with your Google Drive account.

3. Ensure `rclone.conf` is present in the root directory with your Google Drive configured as "gdrive".

## Running the Application

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
PORT=5000
```

## License

MIT