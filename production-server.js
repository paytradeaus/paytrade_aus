const http = require('http');
const httpProxy = require('http-proxy');

const FRONTEND_PORT = 5001;
const BACKEND_PORT = 3001;
const PROXY_PORT = 5000;

const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true,
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message, 'URL:', req?.url);
  if (res && res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  if (proxyRes.statusCode >= 400) {
    console.error(`[${new Date().toISOString()}] ${proxyRes.statusCode} ${req.method} ${req.url}`);
  }
});

const backendPaths = [
  '/graphql', '/uploads', '/files', '/socket.io', '/bull-board', '/admin/mailQueues',
  '/profile_photo', '/admin_profile_photo', '/company_logo', '/communication',
  '/trust_training_records', '/blog_banner', '/resources', '/notice-templates',
  '/notices', '/recieved-notices', '/notices_supporting_docs', '/contracts',
  '/variations', '/bank_statements', '/retention_trust_certificates',
  '/transaction_csv_file_attachments', '/optional_attachments', '/compulsory_attachments',
  '/optional_supporting_statement_attachments', '/audit_reports', '/generated_aba_files',
  '/Admin_holiday', '/misc', '/notices-generated', '/original-notices-generated', '/stripe-webhook', '/xero-webhook', '/xero', '/support-mail', '/support-ticket'
];

const webhookPaths = ['/xero-webhook', '/stripe-webhook', '/support-mail'];
const MAX_WEBHOOK_BODY_SIZE = 1024 * 1024; // 1MB limit for webhook payloads

// Static files are now served directly by Next.js frontend
// No custom static file handling needed - let requests pass through to frontend

const server = http.createServer((req, res) => {
  const url = req.url || '';
  
  // Health check endpoint for keeping the app warm
  if (url === '/health' || url === '/__health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  const isBackend = backendPaths.some(path => url.startsWith(path));
  const isWebhook = webhookPaths.some(path => url.startsWith(path));
  
  // Log ALL incoming requests to xero-webhook for debugging
  if (url.includes('xero') || url.includes('webhook')) {
    console.log(`[${new Date().toISOString()}] INCOMING REQUEST: ${req.method} ${url}`);
    console.log(`[${new Date().toISOString()}] Headers: ${JSON.stringify(req.headers)}`);
  }
  
  if (isBackend) {
    if (isWebhook) {
      const chunks = [];
      let totalSize = 0;
      let aborted = false;
      
      req.on('data', chunk => {
        totalSize += chunk.length;
        if (totalSize > MAX_WEBHOOK_BODY_SIZE) {
          aborted = true;
          res.writeHead(413, { 'Content-Type': 'text/plain' });
          res.end('Payload Too Large');
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      
      req.on('error', (err) => {
        if (!aborted) {
          console.error('Webhook request error:', err.message);
          if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Bad Request');
          }
        }
      });
      
      req.on('aborted', () => {
        aborted = true;
        console.log('Webhook request aborted by client');
      });
      
      req.on('end', () => {
        if (aborted) return;
        
        const rawBody = Buffer.concat(chunks);
        const headers = { ...req.headers };
        delete headers['transfer-encoding'];
        headers['content-length'] = rawBody.length;
        
        console.log(`[${new Date().toISOString()}] WEBHOOK BODY RECEIVED: ${url}, size: ${rawBody.length} bytes`);
        console.log(`[${new Date().toISOString()}] Forwarding to backend port ${BACKEND_PORT}`);
        
        const proxyReq = http.request({
          hostname: '127.0.0.1',
          port: BACKEND_PORT,
          path: url,
          method: req.method,
          headers: headers,
          timeout: 30000,
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
          console.error('Webhook proxy error:', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway');
          }
        });
        
        proxyReq.on('timeout', () => {
          console.error('Webhook proxy timeout');
          proxyReq.destroy();
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'text/plain' });
            res.end('Gateway Timeout');
          }
        });
        
        proxyReq.write(rawBody);
        proxyReq.end();
      });
    } else {
      proxy.web(req, res, { target: `http://127.0.0.1:${BACKEND_PORT}` });
    }
  } else {
    proxy.web(req, res, { target: `http://127.0.0.1:${FRONTEND_PORT}` });
  }
});

server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';
  
  if (url.startsWith('/socket.io')) {
    console.log('WebSocket upgrade for socket.io');
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${BACKEND_PORT}` });
  } else {
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${FRONTEND_PORT}` });
  }
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Production proxy running on port ${PROXY_PORT}`);
});
