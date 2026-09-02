// api/pair.js
// Proxy HTTPS -> HTTP vers l'API KataBump, écrit avec le module http natif de Node
// (évite toute dépendance à fetch(), disponible seulement sur Node 18+).

const http = require('http');

const KATABUMP_HOST = '51.75.118.149';
const KATABUMP_PORT = 20224;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Méthode non autorisée.' });
    }

    const bodyString = JSON.stringify(req.body || {});

    const options = {
        hostname: KATABUMP_HOST,
        port: KATABUMP_PORT,
        path: '/api/pair',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyString),
        },
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
                console.error('Réponse KataBump non-JSON :', data);
                res.status(502).json({ success: false, message: 'Réponse invalide du serveur de pairing.' });
            }
        });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        console.error('Timeout en contactant KataBump (api/pair)');
        res.status(504).json({ success: false, message: 'Le serveur de pairing met trop de temps à répondre.' });
    });

    proxyReq.on('error', (err) => {
        console.error('Erreur proxy vers KataBump :', err.message);
        res.status(502).json({ success: false, message: `Le serveur de pairing est injoignable : ${err.message}` });
    });

    proxyReq.write(bodyString);
    proxyReq.end();
};
