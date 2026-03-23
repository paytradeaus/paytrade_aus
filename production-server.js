const http = require('http');
const httpProxy = require('http-proxy');
const nodemailer = require('nodemailer');

const FRONTEND_PORT = 5001;
const BACKEND_PORT = 3001;
const PROXY_PORT = 5000;

let backendHealthy = true;
let lastCrashAlertSent = 0;
const CRASH_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function sendCrashAlertEmail(reason) {
  const alertEmails = process.env.ADMIN_ALERT_EMAILS;
  const brevoLogin = process.env.BREVO_EMAIL_LOGIN;
  const brevoPass = process.env.BREVO_EMAIL_PASSWORD;

  if (!alertEmails || !brevoLogin || !brevoPass) {
    console.log(`[${new Date().toISOString()}] Crash alert skipped - ADMIN_ALERT_EMAILS or BREVO credentials not configured`);
    return;
  }

  const now = Date.now();
  if (now - lastCrashAlertSent < CRASH_ALERT_COOLDOWN_MS) {
    console.log(`[${new Date().toISOString()}] Crash alert skipped - cooldown active (last sent ${Math.round((now - lastCrashAlertSent) / 60000)} minutes ago)`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user: brevoLogin, pass: brevoPass },
  });

  const recipients = alertEmails.split(',').map(e => e.trim()).filter(Boolean);
  const timestamp = new Date().toISOString();

  const mailOptions = {
    from: '"PayTrade System Alert" <noreply@paytrade.app>',
    to: recipients.join(', '),
    subject: `[ALERT] PayTrade Backend Crash - ${timestamp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">PayTrade Backend Crash Alert</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p><strong>Time:</strong> ${timestamp}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Action:</strong> The backend auto-restart loop will attempt to restart the service.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 0.9em;">This is an automated alert from the PayTrade production server. You will not receive another alert for 24 hours.</p>
        </div>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Failed to send crash alert email: ${err.message}`);
    } else {
      lastCrashAlertSent = Date.now();
      console.log(`[${new Date().toISOString()}] Crash alert email sent to ${recipients.join(', ')}`);
    }
  });
}

function checkBackendHealth() {
  const req = http.request({
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: '/health',
    method: 'GET',
    timeout: 5000,
  }, (res) => {
    if (res.statusCode === 200) {
      if (!backendHealthy) {
        console.log(`[${new Date().toISOString()}] Backend recovered - port ${BACKEND_PORT} is responding`);
      }
      backendHealthy = true;
    } else {
      if (backendHealthy) {
        console.error(`[${new Date().toISOString()}] Backend health check returned status ${res.statusCode}`);
        sendCrashAlertEmail(`Health check returned HTTP ${res.statusCode}`);
      }
      backendHealthy = false;
    }
    res.resume();
  });
  req.on('error', () => {
    if (backendHealthy) {
      console.error(`[${new Date().toISOString()}] Backend health check FAILED - port ${BACKEND_PORT} is not responding`);
      sendCrashAlertEmail('Backend is not responding on port ' + BACKEND_PORT);
    }
    backendHealthy = false;
  });
  req.on('timeout', () => {
    req.destroy();
    if (backendHealthy) {
      console.error(`[${new Date().toISOString()}] Backend health check TIMEOUT`);
      sendCrashAlertEmail('Backend health check timed out');
    }
    backendHealthy = false;
  });
  req.end();
}

setInterval(checkBackendHealth, 30000);
setTimeout(checkBackendHealth, 5000);

const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true,
});

proxy.on('error', (err, req, res) => {
  const url = req?.url || '';
  if (!url.includes('.env') && !url.includes('.php') && !url.includes('.git')) {
    console.error('Proxy error:', err.message, 'URL:', url);
  }
  if (res && res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

const scannerPatterns = [
  /\.env/, /\.php/, /\.git/, /\.aws/, /\.DS_Store/, /phpinfo/, /swagger/,
  /actuator/, /wp-/, /\.yml$/, /\.xml$/, /telescope/, /debug\/default/,
  /server-status/, /v2\/_catalog/, /exec\?cmd/, /nodesync/, /trace\.axd/,
  /\.vscode/, /login\.action/, /@vite\/env/, /security\.txt/,
];

proxy.on('proxyRes', (proxyRes, req, res) => {
  if (proxyRes.statusCode >= 400) {
    const reqUrl = req.url || '';
    const isScanner = scannerPatterns.some(p => p.test(reqUrl));
    if (!isScanner) {
      console.error(`[${new Date().toISOString()}] ${proxyRes.statusCode} ${req.method} ${reqUrl}`);
    }
  }
  
  // Prevent caching of HTML pages to avoid Server Action version mismatches after deployments
  const contentType = proxyRes.headers['content-type'] || '';
  const url = req.url || '';
  
  // Don't cache HTML pages or Server Action responses
  if (contentType.includes('text/html') || url.includes('_rsc') || req.method === 'POST') {
    proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    proxyRes.headers['pragma'] = 'no-cache';
    proxyRes.headers['expires'] = '0';
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
  
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (host === 'www.paytrade.app') {
    const targetUrl = `https://paytrade.app${url}`;
    res.writeHead(301, { 'Location': targetUrl });
    res.end();
    return;
  }
  
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
