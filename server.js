const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'server_data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
// Ensure history file exists
if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
};

const server = http.createServer(function (request, response) {
    console.log('request ', request.method, request.url);

    // API Routes
    if (request.url === '/api/history' && request.method === 'GET') {
        fs.readFile(HISTORY_FILE, 'utf8', (err, data) => {
            if (err) {
                response.writeHead(500, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'Failed to read history' }));
            } else {
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(data);
            }
        });
        return;
    }

    if (request.url === '/api/history' && request.method === 'POST') {
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', () => {
            try {
                const newAttempt = JSON.parse(body);

                // Read existing
                const existingData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
                existingData.push(newAttempt);

                // Write back
                fs.writeFileSync(HISTORY_FILE, JSON.stringify(existingData, null, 2));

                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ success: true, message: 'History saved' }));
            } catch (e) {
                console.error("API Error:", e);
                response.writeHead(500, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ error: 'Failed to save history' }));
            }
        });
        return;
    }

    // --- Streak API ---
    const STREAK_FILE = path.join(DATA_DIR, 'streak.json');
    if (!fs.existsSync(STREAK_FILE)) {
        fs.writeFileSync(STREAK_FILE, JSON.stringify({ streak: 0, lastActive: null }));
    }

    if (request.url === '/api/streak' && request.method === 'GET') {
        fs.readFile(STREAK_FILE, 'utf8', (err, data) => {
            if (err) {
                response.writeHead(500, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ streak: 0, lastActive: null }));
            } else {
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(data);
            }
        });
        return;
    }

    if (request.url === '/api/streak' && request.method === 'POST') {
        const today = new Date().toISOString().split('T')[0];
        try {
            const data = JSON.parse(fs.readFileSync(STREAK_FILE, 'utf8'));
            const lastActive = data.lastActive;
            let streak = data.streak || 0;

            if (lastActive === today) {
                // Already active today
            } else if (lastActive) {
                const lastDate = new Date(lastActive);
                const currentDate = new Date(today);
                const diffTime = Math.abs(currentDate - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    streak++;
                } else {
                    streak = 1;
                }
            } else {
                streak = 1;
            }

            const newData = { streak, lastActive: today };
            fs.writeFileSync(STREAK_FILE, JSON.stringify(newData, null, 2));

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(newData));
        } catch (e) {
            console.error("Streak API Error:", e);
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Failed to update streak' }));
        }
        return;
    }

    // Static File Serving
    let filePath = '.' + request.url.split('?')[0];
    if (filePath == './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, function (error, content) {
        if (error) {
            if (error.code == 'ENOENT') {
                fs.readFile('./404.html', function (error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
                response.end();
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
