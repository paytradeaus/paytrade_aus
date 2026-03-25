const http = require('http');
const httpProxy = require('http-proxy');
const nodemailer = require('nodemailer');

const FRONTEND_PORT = 5001;
const BACKEND_PORT = 3001;
const PROXY_PORT = 5000;

let backendHealthy = true;
let frontendHealthy = true;
let frontendFailCount = 0;
const FRONTEND_FAIL_THRESHOLD = 3;
let maintenanceAlertSent = false;

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayTrade - Maintenance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f0f7f5 0%, #e8f4f8 50%, #f5f0ff 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 520px;
      background: white;
      border-radius: 16px;
      padding: 48px 40px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: #2a7b6f;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 20px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: 300;
      color: #1a1a1a;
    }
    .logo-text span { color: #2a7b6f; font-weight: 600; }
    .icon {
      width: 64px;
      height: 64px;
      background: #f0f7f5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 28px;
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .status {
      display: inline-block;
      margin-top: 24px;
      padding: 8px 20px;
      background: #fef3c7;
      color: #92400e;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
    }
    .retry {
      margin-top: 24px;
    }
    .retry a {
      display: inline-block;
      padding: 10px 28px;
      background: #2a7b6f;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .retry a:hover { background: #1f5f56; }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
  <meta http-equiv="refresh" content="30">
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon">P</div>
      <div class="logo-text"><span>pay</span>trade</div>
    </div>
    <div class="icon">&#128736;</div>
    <h1>We'll be right back</h1>
    <p>We're performing some quick maintenance to improve your experience. This should only take a few minutes.</p>
    <p>Your data is safe and all services will resume shortly.</p>
    <div class="status">&#9679; Maintenance in progress</div>
    <div class="retry"><a href="/">Try again</a></div>
    <div class="footer">This page will automatically refresh in 30 seconds.</div>
  </div>
</body>
</html>`;

function serveMaintenancePage(res) {
  res.writeHead(503, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-store, no-cache',
    'Retry-After': '30',
  });
  res.end(MAINTENANCE_HTML);
}

function sendCrashAlertEmail(reason) {
  const alertEmails = process.env.ADMIN_ALERT_EMAILS;
  const brevoLogin = process.env.BREVO_EMAIL_LOGIN;
  const brevoPass = process.env.BREVO_EMAIL_PASSWORD;

  if (!alertEmails || !brevoLogin || !brevoPass) {
    console.log(`[${new Date().toISOString()}] Crash alert skipped - ADMIN_ALERT_EMAILS or BREVO credentials not configured`);
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
    subject: `[ALERT] PayTrade Down - Maintenance Page Active - ${timestamp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">PayTrade Service Alert</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p><strong>Time:</strong> ${timestamp}</p>
          <p><strong>Issue:</strong> ${reason}</p>
          <p><strong>Status:</strong> The maintenance page is now being shown to visitors.</p>
          <p><strong>Action:</strong> The auto-restart loop will attempt to recover the service. If this does not resolve, a manual re-publish may be required.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 0.9em;">You will receive a recovery email when the service comes back online. No further alerts will be sent until then.</p>
        </div>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Failed to send alert email: ${err.message}`);
    } else {
      console.log(`[${new Date().toISOString()}] Alert email sent to ${recipients.join(', ')}`);
    }
  });
}

function sendRecoveryEmail() {
  const alertEmails = process.env.ADMIN_ALERT_EMAILS;
  const brevoLogin = process.env.BREVO_EMAIL_LOGIN;
  const brevoPass = process.env.BREVO_EMAIL_PASSWORD;

  if (!alertEmails || !brevoLogin || !brevoPass) return;

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
    subject: `[RECOVERED] PayTrade Back Online - ${timestamp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2a7b6f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">PayTrade Service Recovered</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p><strong>Time:</strong> ${timestamp}</p>
          <p><strong>Status:</strong> All services are back online. The maintenance page has been removed.</p>
        </div>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Failed to send recovery email: ${err.message}`);
    } else {
      console.log(`[${new Date().toISOString()}] Recovery email sent to ${recipients.join(', ')}`);
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
      }
      backendHealthy = false;
      enterMaintenanceMode(`Backend health check returned HTTP ${res.statusCode}`);
    }
    res.resume();
  });
  req.on('error', () => {
    if (backendHealthy) {
      console.error(`[${new Date().toISOString()}] Backend health check FAILED - port ${BACKEND_PORT} is not responding`);
    }
    backendHealthy = false;
    enterMaintenanceMode('Backend is not responding on port ' + BACKEND_PORT);
  });
  req.on('timeout', () => {
    req.destroy();
    if (backendHealthy) {
      console.error(`[${new Date().toISOString()}] Backend health check TIMEOUT`);
    }
    backendHealthy = false;
    enterMaintenanceMode('Backend health check timed out');
  });
  req.end();
}

const FRONTEND_HEALTH_PATHS = ['/', '/pricing', '/blog'];
let frontendHealthPathIndex = 0;

function checkFrontendHealth() {
  const checkPath = FRONTEND_HEALTH_PATHS[frontendHealthPathIndex % FRONTEND_HEALTH_PATHS.length];
  frontendHealthPathIndex++;

  const req = http.request({
    hostname: '127.0.0.1',
    port: FRONTEND_PORT,
    path: checkPath,
    method: 'HEAD',
    timeout: 10000,
    headers: { 'host': '127.0.0.1' },
  }, (res) => {
    if (res.statusCode < 500) {
      if (!frontendHealthy) {
        console.log(`[${new Date().toISOString()}] Frontend recovered - ${checkPath} responding (${res.statusCode})`);
      }
      frontendHealthy = true;
      frontendFailCount = 0;
      exitMaintenanceMode();
    } else {
      frontendFailCount++;
      console.error(`[${new Date().toISOString()}] Frontend health check ${checkPath} returned ${res.statusCode} (fail ${frontendFailCount}/${FRONTEND_FAIL_THRESHOLD})`);
      if (frontendFailCount >= FRONTEND_FAIL_THRESHOLD) {
        frontendHealthy = false;
        enterMaintenanceMode(`Frontend returning HTTP ${res.statusCode} on ${checkPath}`);
      }
    }
    res.resume();
  });
  req.on('error', (err) => {
    frontendFailCount++;
    if (frontendFailCount >= FRONTEND_FAIL_THRESHOLD) {
      if (frontendHealthy) {
        console.error(`[${new Date().toISOString()}] Frontend health check FAILED - ${checkPath} not responding: ${err.message}`);
      }
      frontendHealthy = false;
      enterMaintenanceMode(`Frontend not responding on ${checkPath}: ${err.message}`);
    }
  });
  req.on('timeout', () => {
    req.destroy();
    frontendFailCount++;
    if (frontendFailCount >= FRONTEND_FAIL_THRESHOLD) {
      if (frontendHealthy) {
        console.error(`[${new Date().toISOString()}] Frontend health check TIMEOUT on ${checkPath}`);
      }
      frontendHealthy = false;
      enterMaintenanceMode(`Frontend health check timed out on ${checkPath}`);
    }
  });
  req.end();
}

function enterMaintenanceMode(reason) {
  if (!maintenanceAlertSent) {
    maintenanceAlertSent = true;
    console.error(`[${new Date().toISOString()}] MAINTENANCE MODE ACTIVE: ${reason}`);
    sendCrashAlertEmail(reason);
  }
}

function exitMaintenanceMode() {
  if (maintenanceAlertSent && backendHealthy && frontendHealthy) {
    console.log(`[${new Date().toISOString()}] MAINTENANCE MODE ENDED - all services recovered`);
    maintenanceAlertSent = false;
    sendRecoveryEmail();
  }
}

setInterval(checkBackendHealth, 30000);
setInterval(checkFrontendHealth, 30000);
setTimeout(checkBackendHealth, 5000);
setTimeout(checkFrontendHealth, 10000);

const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true,
});

proxy.on('error', (err, req, res) => {
  const url = req?.url || '';
  if (!url.includes('.env') && !url.includes('.php') && !url.includes('.git')) {
    console.error('Proxy error:', err.message, 'URL:', url);
  }
  if (res && res.writeHead && !res.headersSent) {
    serveMaintenancePage(res);
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
  
  const contentType = proxyRes.headers['content-type'] || '';
  const url = req.url || '';
  
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
const MAX_WEBHOOK_BODY_SIZE = 1024 * 1024;

const server = http.createServer((req, res) => {
  const url = req.url || '';
  
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (host === 'www.paytrade.app') {
    const targetUrl = `https://paytrade.app${url}`;
    res.writeHead(301, { 'Location': targetUrl });
    res.end();
    return;
  }
  
  if (url === '/health' || url === '/__health') {
    const status = backendHealthy && frontendHealthy ? 'ok' : 'degraded';
    const code = backendHealthy && frontendHealthy ? 200 : 503;
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      backend: backendHealthy ? 'ok' : 'unhealthy',
      frontend: frontendHealthy ? 'ok' : 'unhealthy',
      maintenance: maintenanceAlertSent,
    }));
    return;
  }
  
  const isBackend = backendPaths.some(path => url.startsWith(path));
  const isWebhook = webhookPaths.some(path => url.startsWith(path));
  
  if (url.includes('xero') || url.includes('webhook')) {
    console.log(`[${new Date().toISOString()}] INCOMING REQUEST: ${req.method} ${url}`);
    console.log(`[${new Date().toISOString()}] Headers: ${JSON.stringify(req.headers)}`);
  }

  if (!frontendHealthy && !isBackend && !url.startsWith('/_next/')) {
    serveMaintenancePage(res);
    return;
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
    proxy.web(req, res, {
      target: `http://127.0.0.1:${FRONTEND_PORT}`,
      headers: { host: `localhost:${FRONTEND_PORT}` },
    });
  }
});

server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';
  
  if (url.startsWith('/socket.io')) {
    console.log('WebSocket upgrade for socket.io');
    proxy.ws(req, socket, head, { target: `http://127.0.0.1:${BACKEND_PORT}` });
  } else {
    proxy.ws(req, socket, head, {
      target: `http://127.0.0.1:${FRONTEND_PORT}`,
      headers: { host: `localhost:${FRONTEND_PORT}` },
    });
  }
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Production proxy running on port ${PROXY_PORT}`);
});
