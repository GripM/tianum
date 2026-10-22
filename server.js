const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function decorateResponse(res) {
  res.status = function(code) {
    res.statusCode = code;
    return {
      json: function(data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      },
      end: function(data) {
        res.end(data);
      },
      send: function(data) {
        res.end(data);
      }
    };
  };
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
}

function handleApi(req, res, handler) {
  decorateResponse(res);
  let bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(bodyChunks).toString();
    try {
      req.body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      req.body = rawBody;
    }
    try {
      const result = handler(req, res);
      if (result && typeof result.catch === 'function') {
        result.catch(err => {
          console.error('API Error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      }
    } catch (err) {
      console.error('API Error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Set global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Handle dynamic /api/* routes
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace(/^\/api\//, '').replace(/\/$/, '').split('/')[0];
    const apiFile = path.join(ROOT_DIR, 'api', `${apiName}.js`);
    if (fs.existsSync(apiFile)) {
      try {
        delete require.cache[require.resolve(apiFile)];
        const handler = require(apiFile);
        return handleApi(req, res, handler);
      } catch (err) {
        console.error(`Error loading API ${apiFile}:`, err);
      }
    }
  }

  // Prevent directory traversal attacks
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT_DIR, safePath);

  // Check possible file candidates (clean URLs & index)
  let candidateFiles = [];

  if (pathname === '/' || pathname === '') {
    candidateFiles.push(path.join(ROOT_DIR, 'index.html'));
  } else if (pathname === '/service' || pathname === '/service.html') {
    res.statusCode = 301;
    res.setHeader('Location', '/equities.html');
    res.end();
    return;
  } else if (pathname === '/admin' || pathname === '/admin/') {
    candidateFiles.push(path.join(ROOT_DIR, 'admin', 'dashboard.html'));
    candidateFiles.push(path.join(ROOT_DIR, 'admin', 'login.html'));
  } else {
    // Exact file
    candidateFiles.push(filePath);
    // If no extension, try .html
    if (!path.extname(pathname)) {
      candidateFiles.push(filePath + '.html');
      candidateFiles.push(path.join(filePath, 'index.html'));
    }
  }

  let finalFile = null;
  for (const candidate of candidateFiles) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        finalFile = candidate;
        break;
      }
    } catch (e) {
      // Not found, continue searching
    }
  }

  if (!finalFile) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
  <h1>404 - Not Found</h1>
  <p>The requested route <code>${pathname}</code> was not found.</p>
  <p><a href="/" style="color: #c49b48; text-decoration: none; font-weight: bold;">Return to Home</a></p>
</body>
</html>`);
    console.log(`[404] ${req.method} ${pathname}`);
    return;
  }

  // Determine MIME type
  const ext = path.extname(finalFile).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);

  // Cache static assets
  if (finalFile.includes(path.sep + 'public' + path.sep)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }

  const stream = fs.createReadStream(finalFile);
  stream.on('error', (err) => {
    console.error(`Stream error on ${finalFile}:`, err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('500 Internal Server Error');
    }
  });
  stream.pipe(res);
  console.log(`[200] ${req.method} ${pathname} -> ${path.relative(ROOT_DIR, finalFile)}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  Tianum Networth Managers Website is LIVE!`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  Admin URL:   http://localhost:${PORT}/admin/login.html`);
  console.log(`====================================================`);
});
