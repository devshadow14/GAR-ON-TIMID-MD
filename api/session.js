// api/session.js
// Proxy HTTPS -> HTTP (module http natif) pour déconnecter une session
// depuis le site (bouton "Déconnecter une session").

const http = require('http');

const KATABUMP_HOST = '51.75.118.149';
const KATABUMP_PORT = 20224;

module.exports = async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ success: false, message: 'Méthode non autorisée.' });
    }

    const { phoneNumber } = req.query;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Numéro manquant.' });
    }

    const options = {
        hostname: KATABUMP_HOST,
        port: KATABUMP_PORT,
        path: `/api/session/${phoneNumber}`,
        method: 'DELETE',
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
                res.status(502).json({ success: false, message: 'Réponse invalide du serveur.' });
            }
        });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ success: false, message: 'Timeout.' });
    });

    proxyReq.on('error', (err) => {
        console.error('Erreur proxy /api/session :', err.message);
        res.status(502).json({ success: false, message: `Serveur injoignable : ${err.message}` });
    });

    proxyReq.end();
};
