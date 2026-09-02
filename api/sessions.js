// api/sessions.js
// Proxy HTTPS -> HTTP (module http natif) pour récupérer le nombre
// de sessions WhatsApp actuellement connectées.

const http = require('http');

const KATABUMP_HOST = '51.75.118.149';
const KATABUMP_PORT = 20224;

module.exports = async function handler(req, res) {
    const options = {
        hostname: KATABUMP_HOST,
        port: KATABUMP_PORT,
        path: '/api/sessions/count',
        method: 'GET',
        timeout: 8000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                res.status(proxyRes.statusCode || 200).json(parsed);
            } catch (err) {
                res.status(502).json({ count: 0 });
            }
        });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ count: 0 });
    });

    proxyReq.on('error', (err) => {
        console.error('Erreur proxy /api/sessions :', err.message);
        res.status(502).json({ count: 0 });
    });

    proxyReq.end();
};
