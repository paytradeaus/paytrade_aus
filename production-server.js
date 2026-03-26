const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');

const NEXT_STATIC_DIR = path.join(__dirname, 'front-end', '.next', 'static');
const MIME_TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.json': 'application/json',
  '.map': 'application/json',
};

function serveNextStatic(req, res, urlPath) {
  const relativePath = urlPath.replace('/_next/static/', '');
  const filePath = path.join(NEXT_STATIC_DIR, relativePath);
  const safePath = path.resolve(filePath);
  if (!safePath.startsWith(NEXT_STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return true;
  }
  try {
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(safePath).pipe(res);
      return true;
    }
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Static file serve error: ${e.message}`);
  }
  return false;
}

const FRONTEND_PORT = 5001;
const BACKEND_PORT = 3001;
const PROXY_PORT = 5000;

let backendHealthy = true;
let frontendHealthy = true;
let frontendFailCount = 0;
const FRONTEND_FAIL_THRESHOLD = 3;
let maintenanceAlertSent = false;
let frontendEverReady = false;

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayTrade - We'll be right back</title>
  <link rel="icon" type="image/png" href="/images/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      background: #f8f9fa;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      border-bottom: 1px solid #eee;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      z-index: 10;
    }
    .navbar svg { height: 36px; width: auto; }
    .card {
      text-align: center;
      max-width: 540px;
      width: 100%;
      background: white;
      border-radius: 12px;
      padding: 48px 40px;
      border: 1px solid #e5e7eb;
    }
    .icon-wrap {
      width: 80px;
      height: 80px;
      background: linear-gradient(174deg, #ff6358 0%, #e23b30 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
    }
    .icon-wrap svg { width: 40px; height: 40px; }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #0e1315;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 8px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      padding: 10px 24px;
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #f97316;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .btn {
      display: inline-block;
      margin-top: 28px;
      padding: 12px 36px;
      background: linear-gradient(174deg, #1583d8 0%, #104f93 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: #9ca3af;
    }
    @media (max-width: 480px) {
      .card { padding: 32px 24px; }
      .navbar { padding: 12px 20px; }
    }
  </style>
  <meta http-equiv="refresh" content="30">
</head>
<body>
  <nav class="navbar">
    <svg width="140" height="36" viewBox="0 0 509 135" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M306.824 96V31.872H313.544V96H306.824ZM295.4 56.928V50.88H324.872V56.928H295.4ZM329.329 96V50.88H336.049V96H329.329ZM336.049 69.696L333.265 68.448C333.265 62.752 334.641 58.24 337.393 54.912C340.209 51.584 344.049 49.92 348.913 49.92C351.153 49.92 353.201 50.336 355.057 51.168C356.913 51.936 358.641 53.184 360.241 54.912L355.825 59.616C354.737 58.4 353.521 57.536 352.177 57.024C350.897 56.512 349.425 56.256 347.761 56.256C344.305 56.256 341.489 57.408 339.313 59.712C337.137 61.952 336.049 65.28 336.049 69.696ZM380.581 96.96C376.293 96.96 372.453 95.936 369.061 93.888C365.669 91.776 362.981 88.96 360.997 85.44C359.077 81.92 358.117 77.952 358.117 73.536C358.117 69.056 359.077 65.056 360.997 61.536C362.981 57.952 365.669 55.136 369.061 53.088C372.453 50.976 376.261 49.92 380.485 49.92C383.941 49.92 387.013 50.624 389.701 52.032C392.453 53.376 394.661 55.296 396.325 57.792C398.053 60.224 399.109 63.072 399.493 66.336V80.448C399.109 83.712 398.053 86.592 396.325 89.088C394.661 91.584 392.453 93.536 389.701 94.944C387.013 96.288 383.973 96.96 380.581 96.96ZM381.637 90.528C386.309 90.528 390.053 88.96 392.869 85.824C395.749 82.688 397.189 78.56 397.189 73.44C397.189 70.048 396.517 67.072 395.173 64.512C393.893 61.888 392.069 59.872 389.701 58.464C387.397 56.992 384.677 56.256 381.541 56.256C378.341 56.256 375.493 56.992 372.997 58.464C370.565 59.936 368.613 61.984 367.141 64.608C365.733 67.168 365.029 70.112 365.029 73.44C365.029 76.768 365.733 79.712 367.141 82.272C368.613 84.832 370.597 86.848 373.093 88.32C375.589 89.792 378.437 90.528 381.637 90.528ZM396.805 96V83.904L398.149 72.768L396.805 61.92V50.88H403.525V96H396.805ZM431.554 96.96C427.394 96.96 423.649 95.936 420.321 93.888C416.993 91.84 414.337 89.056 412.353 85.536C410.433 81.952 409.473 77.952 409.473 73.536C409.473 69.056 410.433 65.056 412.353 61.536C414.337 57.952 416.993 55.136 420.321 53.088C423.649 50.976 427.394 49.92 431.554 49.92C434.945 49.92 438.017 50.592 440.769 51.936C443.522 53.28 445.729 55.2 447.393 57.696C449.121 60.128 450.177 63.008 450.561 66.336V80.736C450.177 84 449.121 86.848 447.393 89.28C445.729 91.712 443.522 93.6 440.769 94.944C438.017 96.288 434.945 96.96 431.554 96.96ZM432.61 90.528C435.81 90.528 438.626 89.824 441.058 88.416C443.49 86.944 445.378 84.928 446.722 82.368C448.13 79.744 448.834 76.768 448.834 73.44C448.834 70.048 448.13 67.072 446.722 64.512C445.378 61.952 443.49 59.936 441.058 58.464C438.626 56.992 435.842 56.256 432.706 56.256C429.57 56.256 426.786 56.992 424.354 58.464C421.986 59.936 420.13 61.952 418.786 64.512C417.442 67.072 416.77 70.048 416.77 73.44C416.77 76.768 417.442 79.744 418.786 82.368C420.13 84.928 421.986 86.944 424.354 88.416C426.722 89.824 429.474 90.528 432.61 90.528ZM448.45 96V84.384L449.794 73.344L448.45 62.4V31.872H455.17V96H448.45ZM479.215 96.96C474.991 96.96 471.183 95.936 467.791 93.888C464.463 91.84 461.807 89.056 459.823 85.536C457.903 81.952 456.943 77.952 456.943 73.536C456.943 69.056 457.871 65.024 459.727 61.44C461.647 57.856 464.239 55.04 467.503 52.992C470.831 50.944 474.607 49.92 478.831 49.92C483.055 49.92 486.735 50.912 489.871 52.896C493.007 54.816 495.439 57.504 497.167 60.96C498.959 64.352 499.855 68.288 499.855 72.768C499.855 73.408 499.823 74.08 499.759 74.784C499.759 75.424 499.695 76.096 499.567 76.8H462.127V71.136H496.207L493.423 73.152C493.423 69.888 492.815 67.04 491.599 64.608C490.383 62.112 488.655 60.16 486.415 58.752C484.175 57.344 481.583 56.64 478.639 56.64C475.695 56.64 473.071 57.344 470.767 58.752C468.527 60.16 466.767 62.144 465.487 64.704C464.271 67.2 463.663 70.08 463.663 73.344C463.663 76.672 464.303 79.616 465.583 82.176C466.863 84.736 468.687 86.752 471.055 88.224C473.423 89.632 476.111 90.336 479.119 90.336C481.743 90.336 484.079 89.824 486.127 88.8C488.239 87.712 489.999 86.208 491.407 84.288L496.015 88.512C494.159 91.2 491.727 93.312 488.719 94.848C485.711 96.256 482.575 96.96 479.215 96.96Z" fill="#0e1315"/>
      <path d="M178.144 96.96C174.688 96.96 171.584 96.256 168.832 94.848C166.08 93.44 163.808 91.52 162.016 89.088C160.288 86.592 159.232 83.712 158.848 80.448V66.336C159.232 63.008 160.32 60.128 162.112 57.696C163.904 55.2 166.176 53.28 168.928 51.936C171.744 50.592 174.816 49.92 178.144 49.92C182.304 49.92 186.048 50.976 189.376 53.088C192.704 55.136 195.328 57.952 197.248 61.536C199.232 65.056 200.224 69.056 200.224 73.536C200.224 77.952 199.264 81.92 197.344 85.44C195.424 88.96 192.768 91.776 189.376 93.888C186.048 95.936 182.304 96.96 178.144 96.96ZM176.992 90.528C180.192 90.528 183.008 89.824 185.44 88.416C187.872 86.944 189.76 84.928 191.104 82.368C192.512 79.744 193.216 76.768 193.216 73.44C193.216 70.048 192.512 67.072 191.104 64.512C189.76 61.952 187.872 59.936 185.44 58.464C183.008 56.992 180.224 56.256 177.088 56.256C173.952 56.256 171.168 56.992 168.736 58.464C166.368 59.936 164.512 61.952 163.168 64.512C161.824 67.072 161.152 70.048 161.152 73.44C161.152 76.768 161.824 79.744 163.168 82.368C164.512 84.928 166.368 86.944 168.736 88.416C171.104 89.824 173.856 90.528 176.992 90.528ZM154.816 115.008V50.88H161.536V62.4L160.192 73.344L161.536 84.384V115.008H154.816ZM227.676 96.96C223.388 96.96 219.548 95.936 216.156 93.888C212.764 91.776 210.076 88.96 208.092 85.44C206.172 81.92 205.212 77.952 205.212 73.536C205.212 69.056 206.172 65.056 208.092 61.536C210.076 57.952 212.764 55.136 216.156 53.088C219.548 50.976 223.356 49.92 227.58 49.92C231.036 49.92 234.108 50.624 236.796 52.032C239.548 53.376 241.756 55.296 243.42 57.792C245.148 60.224 246.204 63.072 246.588 66.336V80.448C246.204 83.712 245.148 86.592 243.42 89.088C241.756 91.584 239.548 93.536 236.796 94.944C234.108 96.288 231.068 96.96 227.676 96.96ZM228.732 90.528C233.404 90.528 237.148 88.96 239.964 85.824C242.844 82.688 244.284 78.56 244.284 73.44C244.284 70.048 243.612 67.072 242.268 64.512C240.988 61.888 239.164 59.872 236.796 58.464C234.492 56.992 231.772 56.256 228.636 56.256C225.436 56.256 222.588 56.992 220.092 58.464C217.66 59.936 215.708 61.984 214.236 64.608C212.828 67.168 212.124 70.112 212.124 73.44C212.124 76.768 212.828 79.712 214.236 82.272C215.708 84.832 217.692 86.848 220.188 88.32C222.684 89.792 225.532 90.528 228.732 90.528ZM243.9 96V83.904L245.244 72.768L243.9 61.92V50.88H250.62V96H243.9Z" fill="#e23b30"/>
      <circle cx="62" cy="73" r="62" fill="url(#paint0_maint)"/>
      <path d="M38.6415 68.8879H54.1167L48.1972 101.293L31.2 108.6L38.6415 68.8879Z" fill="#F7F7F7"/>
      <path d="M68.2618 68.8876H81.3797L83.4343 56.7357H40.3666L33.1755 42.2012C33.1755 42.2012 79.6412 42.2012 81.7748 42.2012C83.9084 42.2012 89.4401 41.9629 93.7863 48.9523C98.1326 55.9416 97.0263 62.5336 95.1297 68.8876C93.2332 75.2415 86.4372 81.3858 80.7475 83.5017C75.0578 85.6176 65.496 85.8053 65.496 85.8053L68.2618 68.8876Z" fill="#F7F7F7"/>
      <defs><linearGradient id="paint0_maint" x1="0" y1="11" x2="124" y2="135" gradientUnits="userSpaceOnUse"><stop stop-color="#FF6358"/><stop offset="1" stop-color="#E23B30"/></linearGradient></defs>
    </svg>
  </nav>
  <div class="card">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </div>
    <h1>We'll be right back</h1>
    <p>We're performing a quick update to improve your experience. This should only take a few minutes.</p>
    <p>Your data is safe and all services will resume shortly.</p>
    <div class="status-badge">
      <span class="status-dot"></span>
      Maintenance in progress
    </div>
    <div><a href="/" class="btn">Try again</a></div>
    <div class="footer">This page will automatically refresh in 30 seconds.</div>
  </div>
</body>
</html>`;

const LOADING_RETRY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayTrade</title>
  <link rel="icon" type="image/png" href="/images/favicon.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: linear-gradient(174deg, rgba(253,254,254,0.6) 0%, rgba(235,242,249,0.6) 100%); min-height: 100vh; }
    #fader {
      position: fixed;
      left: 0; top: 0;
      width: 100%; height: 100%;
      z-index: 999999;
      background: linear-gradient(174deg, rgba(253,254,254,0.85) 0%, rgba(235,242,249,0.85) 100%);
      backdrop-filter: blur(20px);
    }
    .loaderwrap {
      height: 175px; width: 175px;
      display: block;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .loader, .loader:after { border-radius: 50%; width: 175px; height: 175px; }
    .loader {
      margin: 0 auto;
      font-size: 10px;
      position: relative;
      text-indent: -9999em;
      border-top: 0.8em solid rgba(255,255,255,0.2);
      border-right: 0.8em solid rgba(255,255,255,0.2);
      border-bottom: 0.8em solid rgba(255,255,255,0.2);
      border-left: 0.8em solid #ffffff;
      transform: translateZ(0);
      animation: load8 0.5s infinite linear;
    }
    @keyframes load8 { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .loaderlogo {
      height: 64px; width: 64px;
      display: block;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background-image: url("/images/favicon.png");
      background-position: center;
      background-size: contain;
      background-repeat: no-repeat;
    }
    .loader-status {
      position: absolute;
      top: calc(50% + 120px);
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .loader-status p {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .loader-status .countdown {
      font-size: 12px;
      color: #9ca3af;
    }
    .loader-status .success {
      color: #10b981;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div id="fader">
    <div class="loaderwrap">
      <div class="loader"></div>
      <div class="loaderlogo"></div>
    </div>
    <div class="loader-status">
      <p id="message">Reconnecting...</p>
      <div class="countdown" id="retryInfo">Retrying in <span id="countdown">5</span>s</div>
    </div>
  </div>
  <script>
    (function() {
      var maxRetries = 6;
      var attempt = 0;
      var delays = [5, 5, 8, 10, 15, 20];
      var currentUrl = window.location.href;

      function tryReload() {
        attempt++;
        fetch(currentUrl, { method: 'GET', cache: 'no-store', redirect: 'follow' })
          .then(function(resp) {
            if (resp.ok || (resp.status >= 300 && resp.status < 400)) {
              document.getElementById('message').textContent = 'Ready!';
              document.getElementById('message').className = 'success';
              document.getElementById('retryInfo').style.display = 'none';
              setTimeout(function() { window.location.reload(); }, 400);
            } else if (attempt < maxRetries) {
              startCountdown(delays[attempt] || 20);
            } else {
              document.getElementById('message').textContent = 'Please refresh the page in a moment.';
              document.getElementById('retryInfo').style.display = 'none';
            }
          })
          .catch(function() {
            if (attempt < maxRetries) {
              startCountdown(delays[attempt] || 20);
            } else {
              document.getElementById('message').textContent = 'Please refresh the page in a moment.';
              document.getElementById('retryInfo').style.display = 'none';
            }
          });
      }

      function startCountdown(seconds) {
        var remaining = seconds;
        var el = document.getElementById('countdown');
        el.textContent = remaining;
        var timer = setInterval(function() {
          remaining--;
          el.textContent = remaining;
          if (remaining <= 0) {
            clearInterval(timer);
            tryReload();
          }
        }, 1000);
      }

      startCountdown(delays[0]);
    })();
  </script>
</body>
</html>`;

let loadingPageCountToday = 0;
let loadingPageCountDate = new Date().toISOString().slice(0, 10);
let lastEioAlertSentDate = '';

function serveLoadingRetryPage(res) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== loadingPageCountDate) {
    loadingPageCountToday = 0;
    loadingPageCountDate = today;
  }
  loadingPageCountToday++;
  res.writeHead(503, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-store, no-cache',
    'Retry-After': '5',
  });
  res.end(LOADING_RETRY_HTML);
  sendEioDailyAlert();
}

function sendEioDailyAlert() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastEioAlertSentDate === today) return;

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

  transporter.sendMail({
    from: '"PayTrade System Alert" <noreply@paytrade.app>',
    to: recipients.join(', '),
    subject: '[INFO] PayTrade EIO Recovery - Loading Page Shown - ' + today,
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">' +
      '<h2 style="margin: 0;">PayTrade EIO Recovery Notice</h2></div>' +
      '<div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">' +
      '<p><strong>Time:</strong> ' + timestamp + '</p>' +
      '<p><strong>Issue:</strong> A temporary filesystem error (EIO) caused a page to fail after all retries. ' +
      'The user was shown the standard loading screen with auto-retry while the frontend restarts.</p>' +
      '<p><strong>Loading pages served today:</strong> ' + loadingPageCountToday + '</p>' +
      '<p><strong>Status:</strong> Auto-recovery in progress. The frontend will restart and warm up automatically.</p>' +
      '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">' +
      '<p style="color: #666; font-size: 0.9em;">This alert is sent once per day. No action is needed unless these become frequent.</p>' +
      '</div></div>',
  }, (err) => {
    if (err) {
      console.error('[' + new Date().toISOString() + '] Failed to send EIO daily alert: ' + err.message);
    } else {
      lastEioAlertSentDate = today;
      console.log('[' + new Date().toISOString() + '] EIO daily alert sent to ' + recipients.join(', '));
    }
  });
}

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
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        if (!backendHealthy) {
          console.log(`[${new Date().toISOString()}] Backend recovered - port ${BACKEND_PORT} is responding`);
        }
        backendHealthy = true;
        exitMaintenanceMode();
      } else {
        let detail = `HTTP ${res.statusCode}`;
        try {
          const parsed = JSON.parse(body);
          if (parsed.checks) {
            const failing = Object.entries(parsed.checks)
              .filter(([, v]) => v !== 'ok')
              .map(([k, v]) => `${k}=${v}`)
              .join(', ');
            if (failing) detail += ` (${failing})`;
          }
        } catch (e) {}
        if (backendHealthy) {
          console.error(`[${new Date().toISOString()}] Backend health check DEGRADED: ${detail}`);
        }
        backendHealthy = false;
        enterMaintenanceMode(`Backend health check: ${detail}`);
      }
    });
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

const FRONTEND_HEALTH_PATHS = [
  '/', '/pricing', '/blog', '/how-to-guides',
  '/user/dashboard', '/user/projects', '/user/payments-list',
  '/admin/dashboard', '/admin/users',
  '/support',
];
let frontendHealthPathIndex = 0;
const routeFailCounts = {};

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
      if (routeFailCounts[checkPath] > 0) {
        console.log(`[${new Date().toISOString()}] Route recovered: ${checkPath} (${res.statusCode})`);
      }
      routeFailCounts[checkPath] = 0;
      frontendFailCount = 0;
      if (!frontendEverReady) {
        frontendEverReady = true;
        console.log(`[${new Date().toISOString()}] Frontend first ready - initial startup complete`);
      }
      if (!frontendHealthy) {
        const anyStillFailing = Object.values(routeFailCounts).some(c => c >= FRONTEND_FAIL_THRESHOLD);
        if (!anyStillFailing) {
          frontendHealthy = true;
          frontendEverReady = true;
          console.log(`[${new Date().toISOString()}] Frontend recovered - all routes healthy`);
          exitMaintenanceMode();
        }
      }
    } else {
      routeFailCounts[checkPath] = (routeFailCounts[checkPath] || 0) + 1;
      frontendFailCount++;
      console.error(`[${new Date().toISOString()}] Frontend health check ${checkPath} returned ${res.statusCode} (route fails: ${routeFailCounts[checkPath]}, total: ${frontendFailCount}/${FRONTEND_FAIL_THRESHOLD})`);
      if (frontendFailCount >= FRONTEND_FAIL_THRESHOLD) {
        frontendHealthy = false;
        const failingRoutes = Object.entries(routeFailCounts)
          .filter(([, c]) => c > 0)
          .map(([path, c]) => `${path}(${c})`)
          .join(', ');
        enterMaintenanceMode(`Frontend returning 500s on routes: ${failingRoutes}`);
        trackEioError(checkPath);
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

let eioErrorCount = 0;
let eioErrorWindowStart = 0;
let lastFrontendRestart = 0;
let eioRestartCount = 0;
let eioRestartWindowStart = 0;
const EIO_ERROR_THRESHOLD = 10;
const EIO_ERROR_WINDOW = 60000;
const FRONTEND_RESTART_COOLDOWN = 300000;
const MAX_RESTARTS_PER_WINDOW = 2;
const RESTART_ESCALATION_WINDOW = 600000;

function trackEioError(url) {
  const now = Date.now();
  if (now - eioErrorWindowStart > EIO_ERROR_WINDOW) {
    eioErrorCount = 0;
    eioErrorWindowStart = now;
  }
  eioErrorCount++;

  if (now - eioRestartWindowStart > RESTART_ESCALATION_WINDOW) {
    eioRestartCount = 0;
    eioRestartWindowStart = now;
  }

  if (eioRestartCount >= MAX_RESTARTS_PER_WINDOW) {
    if (eioErrorCount === EIO_ERROR_THRESHOLD) {
      console.error(`[${new Date().toISOString()}] EIO storm: ${eioRestartCount} restarts in ${RESTART_ESCALATION_WINDOW/60000}min window. Suppressing further restarts — waiting for filesystem to stabilize.`);
    }
    return;
  }
  
  if (eioErrorCount >= EIO_ERROR_THRESHOLD && (now - lastFrontendRestart) > FRONTEND_RESTART_COOLDOWN) {
    console.error(`[${new Date().toISOString()}] EIO auto-restart: ${eioErrorCount} errors in ${EIO_ERROR_WINDOW/1000}s window. Restarting frontend...`);
    lastFrontendRestart = now;
    eioErrorCount = 0;
    eioRestartCount++;
    
    const pidFile = '/tmp/next-frontend.pid';
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (pid && !isNaN(pid)) {
        process.kill(pid, 'SIGTERM');
        console.log(`[${new Date().toISOString()}] Frontend process (PID ${pid}) killed. Restart loop will bring it back.`);
      } else {
        console.error(`[${new Date().toISOString()}] Invalid PID in ${pidFile}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Failed to kill frontend via pidfile: ${err.message}. Falling back to pkill.`);
      exec('pkill -f "next start -p 5001"', () => {});
    }
  }
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
  xfwd: false,
  changeOrigin: true,
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

  if (url.startsWith('/_next/static/')) {
    if (serveNextStatic(req, res, url)) {
      return;
    }
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
    proxyToFrontendWithRetry(req, res);
  }
});

const HOP_BY_HOP_HEADERS = [
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'proxy-connection',
];

const STRIP_FORWARD_HEADERS = [
  'x-forwarded-port', 'x-forwarded-server',
];

function sanitizeHeaders(rawHeaders, originalHost) {
  const cleaned = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    const lower = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.includes(lower) && !STRIP_FORWARD_HEADERS.includes(lower)) {
      cleaned[key] = value;
    }
  }
  const publicHost = originalHost || 'paytrade.app';
  cleaned['x-forwarded-host'] = publicHost;
  cleaned['x-forwarded-proto'] = 'https';
  if (!cleaned['x-forwarded-for'] && rawHeaders['x-forwarded-for']) {
    cleaned['x-forwarded-for'] = rawHeaders['x-forwarded-for'];
  }
  return cleaned;
}

function proxyToFrontendWithRetry(req, res) {
  const url = req.url || '';
  const method = req.method || 'GET';
  const isRetryable = (method === 'GET' || method === 'HEAD');

  if (!isRetryable) {
    const origHost = (req.headers.host || '').replace(/:\d+$/, '');
    proxy.web(req, res, {
      target: `http://127.0.0.1:${FRONTEND_PORT}`,
      headers: {
        host: `localhost:${FRONTEND_PORT}`,
        'x-forwarded-host': origHost || 'paytrade.app',
        'x-forwarded-proto': 'https',
      },
    });
    return;
  }

  let clientAborted = false;
  let activeProxyReq = null;
  let retryTimer = null;

  const cleanup = () => {
    clientAborted = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (activeProxyReq) { activeProxyReq.destroy(); activeProxyReq = null; }
  };

  res.on('close', cleanup);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const attempt = (retryCount) => {
    if (clientAborted) return;

    const originalHost = (req.headers.host || '').replace(/:\d+$/, '');
    const headers = sanitizeHeaders(req.headers, originalHost);
    headers['host'] = `localhost:${FRONTEND_PORT}`;
    delete headers['content-length'];

    const options = {
      hostname: '127.0.0.1',
      port: FRONTEND_PORT,
      path: url,
      method: method,
      headers: headers,
      timeout: 15000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      if (clientAborted) { proxyRes.resume(); return; }

      if (proxyRes.statusCode === 500 && retryCount > 0) {
        proxyRes.resume();
        console.log(`[${new Date().toISOString()}] EIO retry: ${method} ${url} returned 500, retrying (${retryCount} left)...`);
        retryTimer = setTimeout(() => attempt(retryCount - 1), RETRY_DELAY);
        return;
      }

      if (proxyRes.statusCode === 500 && retryCount === 0) {
        trackEioError(url);
        proxyRes.resume();
        if (url.includes('_rsc')) {
          console.error(`[${new Date().toISOString()}] RSC 500 for ${url} - returning error to trigger client reload`);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
            res.end('Internal Server Error');
          }
          return;
        }
        const isPageRequest = !url.includes('_next/') && (req.headers['accept'] || '').includes('text/html');
        if (isPageRequest) {
          console.error(`[${new Date().toISOString()}] Serving loading page for ${method} ${url} (500 after all retries)`);
          serveLoadingRetryPage(res);
          return;
        }
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
          res.end('Internal Server Error');
        }
        return;
      }

      const contentType = proxyRes.headers['content-type'] || '';
      if (contentType.includes('text/html') || url.includes('_rsc')) {
        proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
        proxyRes.headers['pragma'] = 'no-cache';
        proxyRes.headers['expires'] = '0';
      }

      if (proxyRes.statusCode === 400 && url.includes('/_next/static/')) {
        console.error(`[${new Date().toISOString()}] 400 on static asset: ${url} - passing through (may be host validation)`);
      }

      if (proxyRes.statusCode >= 400) {
        const isScanner = scannerPatterns.some(p => p.test(url));
        if (!isScanner) {
          console.error(`[${new Date().toISOString()}] ${proxyRes.statusCode} ${method} ${url}`);
        }
      }

      if (res.headersSent) {
        proxyRes.resume();
        return;
      }
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    activeProxyReq = proxyReq;

    proxyReq.on('error', (err) => {
      if (clientAborted) return;
      if (retryCount > 0) {
        console.log(`[${new Date().toISOString()}] EIO retry: ${method} ${url} errored (${err.message}), retrying (${retryCount} left)...`);
        retryTimer = setTimeout(() => attempt(retryCount - 1), RETRY_DELAY);
        return;
      }
      console.error('Frontend proxy error:', err.message, 'URL:', url);
      if (!res.headersSent) {
        if (!frontendEverReady) {
          serveLoadingRetryPage(res);
        } else {
          serveMaintenancePage(res);
        }
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (clientAborted) return;
      if (retryCount > 0) {
        retryTimer = setTimeout(() => attempt(retryCount - 1), RETRY_DELAY);
        return;
      }
      if (!res.headersSent) {
        if (!frontendEverReady) {
          serveLoadingRetryPage(res);
        } else {
          serveMaintenancePage(res);
        }
      }
    });

    proxyReq.end();
  };

  attempt(MAX_RETRIES);
}

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
