import os
import tempfile
import requests
from telethon import TelegramClient, events
from dotenv import load_dotenv
import uuid

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

api_id = int(os.getenv('TELETHON_API_ID', 0))
api_hash = os.getenv('TELETHON_API_HASH')
bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
server_url = os.getenv('SERVER_URL', 'http://localhost:5000')

if not api_id or not api_hash or not bot_token:
    print('Missing TELETHON_API_ID, TELETHON_API_HASH, or TELEGRAM_BOT_TOKEN in environment')
    exit(1)

session_name = f'bot_{uuid.uuid4().hex[:8]}'
print(f'Starting Telethon bot with session: {session_name}')
client = TelegramClient(session_name, api_id, api_hash).start(bot_token=bot_token)

@client.on(events.NewMessage(pattern='/start'))
async def start(event):
    await event.reply('Welcome! Send me a file to upload to Google Drive.')

@client.on(events.NewMessage(pattern='/hii'))
async def hi(event):
    await event.reply('hello')

@client.on(events.NewMessage)
async def handle_file(event):
    msg = event.message
    if msg.file:
        status_msg = await event.reply('Downloading your file...')
        import asyncio
        dl_progress = {'bytes': 0}
        total_bytes = msg.file.size or 0
        async def report_download():
            while dl_progress['bytes'] < total_bytes:
                mb = dl_progress['bytes'] / (1024*1024)
                pct = (dl_progress['bytes'] / total_bytes * 100) if total_bytes else 0
                await status_msg.edit(f"Downloading: {mb:.2f} MB ({pct:.1f}%)")
                await asyncio.sleep(5) 
        report_dl_task = asyncio.create_task(report_download())
        tmpdir_obj = tempfile.TemporaryDirectory()
        tmpdir = tmpdir_obj.name
        file_path = await event.download_media(tmpdir, progress_callback=lambda d, t: dl_progress.update({'bytes': d}))
        report_dl_task.cancel()
        final_mb = (total_bytes / (1024*1024)) if total_bytes else 0
        await status_msg.edit(f"Download complete: {final_mb:.2f} MB (100%)")
        from requests_toolbelt.multipart.encoder import MultipartEncoder, MultipartEncoderMonitor
        total_size = os.path.getsize(file_path)
        progress = {'bytes': 0}
        def cb(monitor):
            progress['bytes'] = monitor.bytes_read
        encoder = MultipartEncoder(fields={'file': (os.path.basename(file_path), open(file_path, 'rb')),
                                           'targetFolder': '/'})
        monitor = MultipartEncoderMonitor(encoder, cb)
        headers = {'Content-Type': monitor.content_type}
        import asyncio, time
        async def report_progress():
            while progress['bytes'] < total_size:
                mb = progress['bytes'] / (1024*1024)
                pct = progress['bytes'] / total_size * 100
                await status_msg.edit(f"Uploading: {mb:.2f} MB ({pct:.1f}%)")
                await asyncio.sleep(5)
        report_task = asyncio.create_task(report_progress())
        try:
            res = requests.post(f'{server_url}/api/upload-file', data=monitor, headers=headers)
            res.raise_for_status()
            await report_task
            # final update
            total_mb = total_size / (1024*1024)
            await status_msg.edit(f"Upload complete: {total_mb:.2f} MB (100%)")
            url = res.json().get('url', '')
            await event.reply(f"✅ File uploaded successfully!\n🔗 URL: {url}")
        except Exception as e:
            report_task.cancel()
            await status_msg.edit(f"❌ Error uploading file: {e}")
        finally:
            tmpdir_obj.cleanup()

if __name__ == '__main__':
    print('Starting Telethon bot...')
    client.run_until_disconnected()