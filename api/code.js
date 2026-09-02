// api/code.js
// Proxy HTTPS -> HTTP (module http natif) : le site interroge cette route en boucle
// pour savoir si le code de pairing est prêt.

const http = require('http');

const KATABUMP_HOST = '51.75.118.149';
const KATABUMP_PORT = 20224;

module.exports = async function handler(req, res) {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
        return res.status(400).json({ status: 'error', message: 'Numéro manquant.' });
    }

    const options = {
        hostname: KATABUMP_HOST,
        port: KATABUMP_PORT,
        path: `/api/code/${phoneNumber}`,
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
                console.error('Réponse KataBump non-JSON :', data);
                res.status(502).json({ status: 'error', message: 'Réponse invalide du serveur.' });
            }
        });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ status: 'error', message: 'Timeout.' });
    });

    proxyReq.on('error', (err) => {
        console.error('Erreur proxy /api/code :', err.message);
        res.status(502).json({ status: 'error', message: `Serveur injoignable : ${err.message}` });
    });

    proxyReq.end();
};
