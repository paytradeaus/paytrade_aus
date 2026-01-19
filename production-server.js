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

const server = http.createServer((req, res) => {
  const url = req.url || '';
  
  const backendPaths = [
    '/graphql', '/uploads', '/files', '/socket.io', '/bull-board',
    '/profile_photo', '/admin_profile_photo', '/company_logo', '/communication',
    '/trust_training_records', '/blog_banner', '/resources', '/notice-templates',
    '/notices', '/recieved-notices', '/notices_supporting_docs', '/contracts',
    '/variations', '/bank_statements', '/retention_trust_certificates',
    '/transaction_csv_file_attachments', '/optional_attachments', '/compulsory_attachments',
    '/optional_supporting_statement_attachments', '/audit_reports', '/generated_aba_files',
    '/Admin_holiday', '/misc', '/notices-generated', '/original-notices-generated', '/stripe-webhook', '/xero-webhook', '/xero', '/support-mail', '/support-ticket'
  ];
  const isBackend = backendPaths.some(path => url.startsWith(path));
  
  if (isBackend) {
    proxy.web(req, res, { target: `http://127.0.0.1:${BACKEND_PORT}` });
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
