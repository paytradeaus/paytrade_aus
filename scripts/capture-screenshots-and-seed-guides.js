const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const BASE_URL = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const SCREENSHOT_DIR = path.join(__dirname, '..', 'front-end', 'public', 'guide-screenshots');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'phil.taylor@paytrade.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dismissCookieBanner(page) {
  try {
    await page.waitForSelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, [data-testid="uc-accept-all-button"]', { timeout: 3000 });
    await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, [data-testid="uc-accept-all-button"]');
    await delay(500);
  } catch (e) {}
  try {
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const btn = await frame.$('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
        if (btn) { await btn.click(); await delay(500); break; }
      } catch(e2) {}
    }
  } catch(e) {}
  try {
    await page.evaluate(() => {
      const el = document.getElementById('CybotCookiebotDialog');
      if (el) el.style.display = 'none';
      const overlay = document.getElementById('CybotCookiebotDialogBodyUnderlay');
      if (overlay) overlay.style.display = 'none';
      document.querySelectorAll('[class*="cookiebot"], [class*="cookie-consent"], [id*="cookiebot"]').forEach(e => e.style.display = 'none');
    });
  } catch(e) {}
}

async function takeScreenshot(page, name, url, waitSelector) {
  try {
    console.log(`  Capturing: ${name} (${url})`);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(3000);
    await dismissCookieBanner(page);
    await delay(500);
    if (waitSelector) {
      try { await page.waitForSelector(waitSelector, { timeout: 5000 }); } catch(e) {}
    }
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  ✓ Saved: ${name}.png`);
    return true;
  } catch (e) {
    console.log(`  ✗ Failed: ${name} - ${e.message}`);
    return false;
  }
}

async function captureScreenshots() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  
  console.log('\n--- PUBLIC PAGES ---');
  await takeScreenshot(page, 'home-page', '/');
  await takeScreenshot(page, 'pricing-page', '/pricing');
  await takeScreenshot(page, 'login-page', '/user/login');
  await takeScreenshot(page, 'community-page', '/community');
  await takeScreenshot(page, 'community-discussions', '/community/discussions');
  await takeScreenshot(page, 'get-support', '/get-support');

  console.log('\n--- ADMIN LOGIN ---');
  try {
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(3000);
    await dismissCookieBanner(page);
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-login.png') });
    
    const inputs = await page.$$('input');
    for (const input of inputs) {
      const type = await page.evaluate(el => el.type, input);
      if (type === 'email' || type === 'text') {
        await input.click({ clickCount: 3 });
        await input.type(ADMIN_EMAIL);
      }
      if (type === 'password') {
        await input.click({ clickCount: 3 });
        await input.type(ADMIN_PASSWORD);
      }
    }
    await delay(500);
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent?.trim(), btn);
      if (text && (text.includes('Sign') || text.includes('Log'))) {
        await btn.click();
        break;
      }
    }
    await delay(5000);
    console.log('  Admin login attempted, current URL:', page.url());
  } catch (e) {
    console.log('  Admin login error:', e.message);
  }

  console.log('\n--- ADMIN PAGES ---');
  await takeScreenshot(page, 'admin-dashboard', '/admin/dashboard');
  await takeScreenshot(page, 'admin-users', '/admin/users');
  await takeScreenshot(page, 'admin-business', '/admin/business');
  await takeScreenshot(page, 'admin-community-discussions', '/admin/community/discussions');
  await takeScreenshot(page, 'admin-subscriptions', '/admin/subscriptions/current');
  await takeScreenshot(page, 'admin-subscription-items', '/admin/subscriptions/manage-items/current');
  await takeScreenshot(page, 'admin-notices', '/admin/notices/current');
  await takeScreenshot(page, 'admin-compliances', '/admin/compliances');
  await takeScreenshot(page, 'admin-content-faq', '/admin/content-management/faq');
  await takeScreenshot(page, 'admin-blog', '/admin/blog');
  await takeScreenshot(page, 'admin-how-to-guides', '/admin/how-to-guides');
  await takeScreenshot(page, 'admin-resource-guides', '/admin/resource');
  await takeScreenshot(page, 'admin-masters', '/admin/masters');
  await takeScreenshot(page, 'admin-holidays', '/admin/holidays');
  await takeScreenshot(page, 'admin-groups', '/admin/groups');
  await takeScreenshot(page, 'admin-activity-log', '/admin/activity-log');
  await takeScreenshot(page, 'admin-communication', '/admin/communication');

  console.log('\n--- USER LOGIN ---');
  await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await dismissCookieBanner(page);

  console.log('\n--- USER PAGES (via direct navigation) ---');
  await takeScreenshot(page, 'user-dashboard', '/user/dashboard');
  await takeScreenshot(page, 'user-projects', '/user/projects');
  await takeScreenshot(page, 'user-contracts', '/user/contracts');
  await takeScreenshot(page, 'user-clients-suppliers', '/user/clients-suppliers');
  await takeScreenshot(page, 'user-claims', '/user/claims');
  await takeScreenshot(page, 'user-payments-to-do', '/user/payments-to-do');
  await takeScreenshot(page, 'user-payments-list', '/user/payments-list');
  await takeScreenshot(page, 'user-retention-list', '/user/retention-list');
  await takeScreenshot(page, 'user-bank-accounts', '/user/bank-accounts/current');
  await takeScreenshot(page, 'user-trust-accounting', '/user/trust-accounting');
  await takeScreenshot(page, 'user-trust-journals', '/user/trust-accounting/journals');
  await takeScreenshot(page, 'user-compliances', '/user/compliances');
  await takeScreenshot(page, 'user-notices', '/user/notices');
  await takeScreenshot(page, 'user-variations', '/user/variations');
  await takeScreenshot(page, 'user-integrations', '/user/integrations');
  await takeScreenshot(page, 'user-personal-info', '/user/personal-info');
  await takeScreenshot(page, 'user-security', '/user/sign-in-security');
  await takeScreenshot(page, 'user-activity-log', '/user/activity-log');

  await browser.close();
  console.log('\n✓ Screenshot capture complete!');
  
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`Total screenshots: ${files.length}`);
  return files;
}

function imgTag(name, alt) {
  return `<div style="margin: 24px 0; text-align: center;"><img src="/guide-screenshots/${name}.png" alt="${alt}" style="max-width: 100%; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /><p style="color: #666; font-size: 14px; margin-top: 8px; font-style: italic;">${alt}</p></div>`;
}

function sectionHeading(text) {
  return `<h2 style="color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 8px; margin-top: 32px;">${text}</h2>`;
}

function stepBox(number, title, description) {
  return `<div style="display: flex; gap: 16px; margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a73e8;"><div style="min-width: 36px; height: 36px; background: #1a73e8; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${number}</div><div><strong style="font-size: 16px;">${title}</strong><p style="margin: 4px 0 0; color: #555;">${description}</p></div></div>`;
}

function tipBox(text) {
  return `<div style="margin: 16px 0; padding: 16px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;"><strong>Tip:</strong> ${text}</div>`;
}

function warningBox(text) {
  return `<div style="margin: 16px 0; padding: 16px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;"><strong>Important:</strong> ${text}</div>`;
}

function componentExplainer(components) {
  let html = '<div style="margin: 16px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;"><h3 style="margin-top: 0; color: #333;">What You See on This Page</h3><table style="width: 100%; border-collapse: collapse;">';
  html += '<tr style="background: #e0e0e0;"><th style="padding: 10px; text-align: left; border: 1px solid #ccc;">Component</th><th style="padding: 10px; text-align: left; border: 1px solid #ccc;">What It Shows</th></tr>';
  for (const [comp, desc] of components) {
    html += `<tr><td style="padding: 10px; border: 1px solid #ccc; font-weight: 600;">${comp}</td><td style="padding: 10px; border: 1px solid #ccc;">${desc}</td></tr>`;
  }
  html += '</table></div>';
  return html;
}

function generateGuides(categoryMap) {
  const guides = [];
  const adminId = '25472ecc-2de4-413a-b20c-2cc9c0c533d8';

  // ===== GETTING STARTED =====
  guides.push({
    title: 'How to Sign Up and Create Your Account',
    category_id: categoryMap['Getting Started'],
    tags: ['registration', 'sign up', 'getting started', 'new account'],
    content: `
      <h1 style="color: #333;">How to Sign Up and Create Your Account</h1>
      <p style="font-size: 18px; color: #555;">Get started with PayTrade in minutes. This guide walks you through every step of the registration process.</p>
      
      ${imgTag('login-page', 'PayTrade login and sign-up page')}
      
      ${sectionHeading('Overview')}
      <p>Creating a PayTrade account is a multi-step process that sets up your personal profile and business entity. Once complete, you'll have full access to all features included in your subscription plan.</p>

      ${componentExplainer([
        ['Sign In Panel (Left)', 'For existing users to log in with their email and password'],
        ['Join PayTrade Today Panel (Right)', 'For new users — enter your email and choose a password to begin registration'],
        ['Forgot Password Link', 'Click to reset your password via email verification'],
        ['User Agreement & Privacy Links', 'Review the terms of service and privacy policy before signing up']
      ])}

      ${sectionHeading('Step-by-Step Registration')}
      
      ${stepBox(1, 'Enter Your Email & Password', 'On the sign-up panel (right side), enter your email address and create a strong password. Your password must include at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.')}
      
      ${stepBox(2, 'Verify Your Email', 'A 6-digit verification code is sent to your email. Enter it within 20 minutes. If the code expires, click "Resend OTP" to get a new one.')}
      
      ${stepBox(3, 'Personal Details', 'Enter your first name, last name, phone number, occupation, and position title. Your address is entered with Google Places autocomplete for accuracy.')}
      
      ${stepBox(4, 'Profile Photo (Optional)', 'Upload a profile picture. You can crop and adjust the image. This step can be skipped.')}
      
      ${stepBox(5, 'Business Profile', 'Enter your company name, ABN, and entity type. The system checks if your business already exists on PayTrade — if so, you can request to join the existing profile instead of creating a duplicate.')}
      
      ${stepBox(6, 'Tax Information', 'Provide your tax-related details including TFN and GST registration status.')}
      
      ${stepBox(7, 'Company Verification', 'Upload supporting documents such as your QBCC license and business registration papers.')}

      ${warningBox('Your email address becomes your login credential. Make sure you use an email you have access to, as you will need it for password resets and security notifications.')}

      ${sectionHeading('What Happens After Registration')}
      <p>When you complete registration, the system automatically:</p>
      <ul>
        <li>Creates your user account</li>
        <li>Sets up your personal company profile</li>
        <li>Assigns you as the <strong>Primary Admin</strong> of your company</li>
        <li>Activates the <strong>Free (Basic)</strong> subscription plan</li>
        <li>Redirects you to your dashboard</li>
      </ul>

      ${tipBox('If you want to upgrade to a paid plan for more features like unlimited projects or Xero integration, you can do so at any time from your Subscription settings.')}
    `
  });

  guides.push({
    title: 'Understanding Your Dashboard',
    category_id: categoryMap['Getting Started'],
    tags: ['dashboard', 'overview', 'navigation', 'getting started'],
    content: `
      <h1 style="color: #333;">Understanding Your Dashboard</h1>
      <p style="font-size: 18px; color: #555;">Your dashboard is the central hub for all your business operations. Here's what every component means.</p>
      
      ${imgTag('user-dashboard', 'PayTrade user dashboard')}

      ${sectionHeading('Dashboard Components Explained')}
      
      ${componentExplainer([
        ['Welcome Message', 'Displays your name and a personalised greeting. Shows you are logged into the correct account.'],
        ['Quick Action Links', 'Shortcut buttons to the most common tasks: Add Client, Add Project, Add Contract, Add Trust Account, Add Claim, Audit Accounts, QBCC Eligibility Checker, and Reconciliation.'],
        ['Payments To Do (Counter)', 'Shows the number of unmatched or pending payments requiring your attention. Click to go directly to the Payments To Do page.'],
        ['Notices To Do (Counter)', 'Shows mandatory QBCC notices that need to be generated or sent. Red indicates urgent items.'],
        ['Compliance To Do (Counter)', 'Shows projects or accounts with compliance issues. Click to view the Compliance Overview.'],
        ['Cash Accounts Summary', 'Current balances across your general business (cash) bank accounts.'],
        ['Project Trust Accounts (PTA)', 'Summary of all PTA balances. Shows account names, bank balances, and any unmatched transactions.'],
        ['Retention Trust Accounts (RTA)', 'Summary of all RTA balances and unmatched items.'],
        ['Unmatched Transactions', 'Bank transactions that have been imported but not yet reconciled with claims or payments. These require action.'],
        ['Sidebar Menu', 'Navigation panel on the left providing access to all system modules: Projects, Contracts, Claims, Bank Accounts, Trust Accounting, Compliance, Notices, and more.']
      ])}

      ${sectionHeading('Navigation Guide')}
      <p>The sidebar menu provides access to all major sections:</p>
      <ul>
        <li><strong>Dashboard</strong> — Return to this overview page</li>
        <li><strong>Clients & Suppliers</strong> — Manage your business contacts</li>
        <li><strong>Projects</strong> — Create and manage construction projects</li>
        <li><strong>Contracts</strong> — Set up and track contracts</li>
        <li><strong>Pay Apps</strong> — Submit and manage payment claims</li>
        <li><strong>Bank Accounts</strong> — Manage operating and trust accounts</li>
        <li><strong>Trust Accounting</strong> — Journals, reconciliation, and audit</li>
        <li><strong>Compliance</strong> — Monitor regulatory compliance</li>
        <li><strong>Notices</strong> — Generate and send QBCC notices</li>
        <li><strong>Variations</strong> — Track contract variations</li>
        <li><strong>Community</strong> — Discussions and product ideas</li>
      </ul>

      ${tipBox('The dashboard counters update in real-time. Check them regularly to stay on top of pending tasks and compliance requirements.')}
    `
  });

  // ===== PROJECTS & CONTRACTS =====
  guides.push({
    title: 'Creating and Managing Projects',
    category_id: categoryMap['Projects & Contracts'],
    tags: ['projects', 'create project', 'PTA eligibility', 'project management'],
    content: `
      <h1 style="color: #333;">Creating and Managing Projects</h1>
      <p style="font-size: 18px; color: #555;">Learn how to create construction projects, check PTA eligibility, and manage project lifecycles.</p>
      
      ${imgTag('user-projects', 'Projects list page')}

      ${sectionHeading('Projects List Page')}
      ${componentExplainer([
        ['Project Name', 'The name you gave to the project when creating it'],
        ['Project Role', 'Your role in the project: Principal, Head Contractor, or Sub Contractor'],
        ['Head Contract Sum', 'The total value of the head contract for this project'],
        ['PTA Eligibility', 'Whether a Project Trust Account is required under the BIF Act ("Yes" or "No")'],
        ['RTA Eligibility', 'Whether a Retention Trust Account is required ("Yes" or "No")'],
        ['Status', 'Current project status: Draft, In Progress, Completed, or Archived'],
        ['Actions', 'Edit, view overview, or archive the project']
      ])}

      ${sectionHeading('How to Create a New Project')}
      ${stepBox(1, 'Navigate to Projects', 'Click "Projects" in the sidebar menu to open the projects list.')}
      ${stepBox(2, 'Click "Add Project"', 'Click the "Add Project" button in the top-right corner of the page.')}
      ${stepBox(3, 'Enter Project Details', 'Fill in the project name, description, your role (Principal, Head Contractor, or Sub Contractor), the site address, and the head contract sum.')}
      ${stepBox(4, 'Check PTA Eligibility', 'The system automatically checks if the project requires a Project Trust Account based on the contract value and type under the BIF Act. If the head contract sum exceeds the threshold, PTA eligibility is set to "Yes".')}
      ${stepBox(5, 'Save the Project', 'Click "Save" to create the project. It will appear in your projects list with "In Progress" status.')}

      ${warningBox('Your subscription plan limits the number of projects you can create. Basic and Standard plans allow 1 project, Advanced allows 10, and Pro Audit allows unlimited projects. Attempting to exceed your limit will prompt an upgrade message.')}

      ${sectionHeading('Project Overview')}
      <p>Click the project name or the "View" action to open the Project Overview. This dashboard shows:</p>
      <ul>
        <li>All contracts linked to this project</li>
        <li>Associated bank and trust accounts</li>
        <li>Compliance status for the project</li>
        <li>Payment claims summary</li>
        <li>Generated notices</li>
        <li>Financial overview</li>
      </ul>

      ${tipBox('Use the PTA Eligibility Checker when creating projects to determine if you need to set up a Project Trust Account. This is a key compliance requirement under the BIF Act.')}
    `
  });

  guides.push({
    title: 'Setting Up and Managing Contracts',
    category_id: categoryMap['Projects & Contracts'],
    tags: ['contracts', 'create contract', 'payment schedule', 'retention'],
    content: `
      <h1 style="color: #333;">Setting Up and Managing Contracts</h1>
      <p style="font-size: 18px; color: #555;">Contracts link your projects to clients, suppliers, and payment accounts. Here's how to set them up correctly.</p>
      
      ${imgTag('user-contracts', 'Contracts list page')}

      ${sectionHeading('Contracts List Page')}
      ${componentExplainer([
        ['Contract Name', 'The name you assigned to the contract (e.g., "Electrical Works Package")'],
        ['Project', 'The project this contract belongs to'],
        ['Client/Supplier Role', 'The role of the other party: Principal, Head Contractor, or Sub Contractor'],
        ['Initial Contract Sum', 'The original contract value before any variations'],
        ['Approved Variations', 'Total value of approved variations added to the contract'],
        ['Adjusted Contract Sum', 'Initial contract sum plus approved variations — the current total contract value'],
        ['Status', 'Draft, In Progress, Completed, or Terminated'],
        ['Actions', 'Edit, view overview, or manage the contract']
      ])}

      ${sectionHeading('Creating a New Contract')}
      ${stepBox(1, 'Navigate to Contracts', 'Click "Contracts" in the sidebar menu.')}
      ${stepBox(2, 'Click "Add Contract"', 'Click the "Add Contract" button in the top-right corner.')}
      ${stepBox(3, 'Select the Project', 'Choose which project this contract belongs to from the dropdown.')}
      ${stepBox(4, 'Select Client or Supplier', 'Choose the other party to the contract. If they are not in your contacts list, you will need to add them first under Clients & Suppliers.')}
      ${stepBox(5, 'Enter Contract Details', 'Fill in the contract name, initial contract sum, contract type, and retention percentage.')}
      ${stepBox(6, 'Link Payment Accounts', 'Select which bank account payments should come from and which trust account to use for retention funds.')}
      ${stepBox(7, 'Define Payment Schedule', 'Set the claim frequency (e.g., monthly) and payment due dates based on the contract terms.')}
      ${stepBox(8, 'Save', 'Click "Save" to create the contract. You can now start creating payment claims against it.')}

      ${warningBox('Make sure you link the correct trust accounts to each contract. Payments from Project Trust Accounts must match the project the contract belongs to, and retention must go to the appropriate Retention Trust Account.')}

      ${tipBox('The "Contract Overview" page gives you a complete picture of all financial activity under a contract, including all claims, payments, variations, and retention records.')}
    `
  });

  guides.push({
    title: 'Managing Clients and Suppliers',
    category_id: categoryMap['Projects & Contracts'],
    tags: ['clients', 'suppliers', 'contacts', 'ABN'],
    content: `
      <h1 style="color: #333;">Managing Clients and Suppliers</h1>
      <p style="font-size: 18px; color: #555;">Keep track of all your business relationships — principals, head contractors, subcontractors, and suppliers.</p>

      ${imgTag('user-clients-suppliers', 'Clients & Suppliers list page')}

      ${sectionHeading('Clients & Suppliers Page')}
      ${componentExplainer([
        ['Name', 'The contact name of the client or supplier'],
        ['Business Name', 'The registered business name'],
        ['Type', 'Whether this contact is a "Client" (they pay you) or "Supplier" (you pay them)'],
        ['ABN', 'Their Australian Business Number for tax and verification purposes'],
        ['Entity Type', 'Business, Sole Trader, or Personal'],
        ['Status', 'Draft (incomplete) or Completed (ready to use in contracts)'],
        ['Actions', 'View, edit, or archive the contact record']
      ])}

      ${sectionHeading('Adding a New Contact')}
      ${stepBox(1, 'Click "Add Client/Supplier"', 'Navigate to Clients & Suppliers and click the add button in the top-right corner.')}
      ${stepBox(2, 'Select Type', 'Choose whether this contact is a Client or Supplier.')}
      ${stepBox(3, 'Enter Details', 'Fill in the contact name, business name, email address, ABN, and entity type.')}
      ${stepBox(4, 'Save', 'Click "Save" to add them to your contacts. They will now be available when creating contracts.')}

      ${tipBox('If you have Xero integration enabled (Advanced or Pro Audit plan), you can import contacts directly from your Xero account, saving time on manual data entry.')}
    `
  });

  // ===== PAYMENTS & CLAIMS =====
  guides.push({
    title: 'Submitting and Managing Payment Claims',
    category_id: categoryMap['Payments & Claims'],
    tags: ['payment claims', 'pay apps', 'receivable', 'billable', 'S75'],
    content: `
      <h1 style="color: #333;">Submitting and Managing Payment Claims</h1>
      <p style="font-size: 18px; color: #555;">Payment claims (Pay Apps) are how you request payment for work done or receive claims from your subcontractors. This guide covers both sides of the process.</p>

      ${imgTag('user-claims', 'Payment Claims (Pay Apps) list page')}

      ${sectionHeading('Pay Apps Page')}
      ${componentExplainer([
        ['Receivable Tab', 'Claims you have submitted to receive payment — you are the claimant (subcontractor or head contractor claiming from a principal)'],
        ['Billable Tab', 'Claims submitted to you for payment — you are the payer (head contractor receiving claims from subcontractors)'],
        ['Claim Reference', 'A unique reference number for tracking the claim (e.g., PC-001)'],
        ['Contract', 'The contract this claim is made against'],
        ['Claim Amount', 'The total amount being claimed for the work period'],
        ['Retention Amount', 'The portion of the claim withheld as retention (based on contract retention percentage)'],
        ['Due Date', 'When the payment is due based on the contract payment schedule'],
        ['Status', 'Draft, Submitted, Payment Received, Unpaid, or Overdue'],
        ['Actions', 'View details, edit (if draft), add payment, or generate S75 statement']
      ])}

      ${sectionHeading('Submitting a Payment Claim (As Subcontractor or Head Contractor)')}
      ${stepBox(1, 'Navigate to Pay Apps', 'Click "Pay Apps" in the sidebar menu.')}
      ${stepBox(2, 'Click "Add Claim"', 'Click the "Add Claim" button in the top-right corner.')}
      ${stepBox(3, 'Select the Contract', 'Choose which contract this claim relates to from the dropdown. This automatically links the claim to the correct project, client/supplier, and payment accounts.')}
      ${stepBox(4, 'Enter Claim Details', 'Fill in the claim amount, description of work completed, and attach any supporting documents (invoices, progress photos, etc.).')}
      ${stepBox(5, 'Submit the Claim', 'Click "Save" to create the claim. The system generates a unique claim reference number. The claim appears in your Receivable tab and in the other party\'s Billable tab.')}

      ${sectionHeading('Reviewing a Claim (As Head Contractor or Principal)')}
      ${stepBox(1, 'Go to the Billable Tab', 'Navigate to Pay Apps and click the "Billable" tab to see claims submitted to you.')}
      ${stepBox(2, 'Open the Claim', 'Click the claim to view its full details including the amount, supporting documents, and contract terms.')}
      ${stepBox(3, 'Review and Respond', 'Approve the full amount, partially approve, or dispute the claim with reasons.')}

      ${sectionHeading('Recording a Payment')}
      ${stepBox(1, 'Open the Approved Claim', 'From the claim view page, click the "Add Payment" button.')}
      ${stepBox(2, 'Enter Payment Details', 'Record the payment amount, date, and bank reference number.')}
      ${stepBox(3, 'S75 Statement', 'For trust account claims, an S75 Supporting Statement is automatically generated. This is a legal requirement under the BIF Act.')}
      ${stepBox(4, 'Payment Recorded', 'The payment appears on the Payments List page and the claim status updates accordingly.')}

      ${warningBox('S75 Supporting Statements are mandatory when making payments from a Project Trust Account. The system generates them automatically, but you should review and send them to the relevant parties.')}
      
      ${tipBox('Use the "Payments To Do" page to see all outstanding payments across all contracts in one place. This helps ensure you never miss a payment deadline.')}
    `
  });

  guides.push({
    title: 'Payments To Do and Payment History',
    category_id: categoryMap['Payments & Claims'],
    tags: ['payments', 'payments to do', 'payment list', 'payment history'],
    content: `
      <h1 style="color: #333;">Payments To Do and Payment History</h1>
      <p style="font-size: 18px; color: #555;">Stay on top of your payment obligations and track your complete payment history.</p>

      ${imgTag('user-payments-to-do', 'Payments To Do page')}

      ${sectionHeading('Payments To Do')}
      ${componentExplainer([
        ['Payment ID', 'Unique identifier for the payment'],
        ['Contract', 'The contract this payment relates to'],
        ['Type', 'Whether this is a receivable or payable amount'],
        ['Amount', 'The payment amount due'],
        ['Due Date', 'When the payment needs to be made or received'],
        ['Status', 'Unpaid, Overdue, or Partially Paid'],
        ['Action Button', 'Click to process the payment — this takes you to the claim where you can record the payment']
      ])}
      <p>The Payments To Do page acts as your financial to-do list. It shows every pending payment across all your projects and contracts, sorted by urgency. Overdue payments are highlighted in red.</p>

      ${imgTag('user-payments-list', 'Payments List (History) page')}

      ${sectionHeading('Payments List (History)')}
      ${componentExplainer([
        ['Payment Reference', 'The bank reference or PayTrade-generated reference for the transaction'],
        ['Claim Reference', 'Links back to the original payment claim this payment satisfies'],
        ['Amount', 'The actual amount paid or received'],
        ['Date', 'When the payment was made'],
        ['Status', 'Confirmed, Pending, or Failed'],
        ['Filters', 'Filter by date range, contract, project, or payment status']
      ])}
      <p>The Payments List provides a complete audit trail of every payment made and received. Use the filters to narrow down results by date, project, or status.</p>

      ${tipBox('Check the Payments To Do page daily to ensure no payments are missed. Late payments can trigger compliance issues and generate automatic notices under the BIF Act.')}
    `
  });

  guides.push({
    title: 'Understanding and Managing Retention',
    category_id: categoryMap['Payments & Claims'],
    tags: ['retention', 'retention trust', 'RTA', 'retention claims', 'defects liability'],
    content: `
      <h1 style="color: #333;">Understanding and Managing Retention</h1>
      <p style="font-size: 18px; color: #555;">Retention is a percentage of each payment claim withheld as security. Here's how PayTrade tracks and manages it.</p>

      ${imgTag('user-retention-list', 'Retention List page')}

      ${sectionHeading('What is Retention?')}
      <p>In construction contracts, a percentage of each progress payment (typically 5-10%) is retained by the payer as security for defects. This retained money is released when contractual milestones are met, such as practical completion or the end of the defects liability period.</p>
      <p>Under the BIF Act, retention money for eligible projects must be held in a dedicated <strong>Retention Trust Account (RTA)</strong>.</p>

      ${sectionHeading('Retention List Page')}
      ${componentExplainer([
        ['Contract', 'The contract the retention relates to'],
        ['Total Retained', 'The cumulative retention amount withheld across all claims'],
        ['Released Amount', 'How much retention has been released back to the subcontractor'],
        ['Balance Held', 'Remaining retention still being held (Total Retained minus Released)'],
        ['Status', 'Held (still in trust) or Released (returned to the subcontractor)'],
        ['RTA Account', 'Which Retention Trust Account the funds are held in']
      ])}

      ${sectionHeading('How Retention is Tracked')}
      ${stepBox(1, 'Automatic Calculation', 'When a payment claim is created, the system automatically calculates the retention amount based on the contract\'s retention percentage.')}
      ${stepBox(2, 'Retention Withheld', 'The retention amount is separated from the claim payment and tracked in the Retention List.')}
      ${stepBox(3, 'Deposited in RTA', 'If the project requires an RTA, the retained funds must be deposited into the designated Retention Trust Account and reconciled.')}

      ${sectionHeading('Claiming Retention Release')}
      ${stepBox(1, 'Verify Conditions', 'Confirm that the contractual conditions for retention release have been met (e.g., practical completion, defects liability period expiry).')}
      ${stepBox(2, 'Create a Retention Claim', 'Navigate to Pay Apps and click "Add Claim". Create a claim specifically for the retention release amount, referencing the original contract.')}
      ${stepBox(3, 'Process the Release', 'Once approved, the retention payment is recorded, the retained amount is marked as released, and the RTA balance updates accordingly.')}
      ${stepBox(4, 'Reconcile', 'Match the retention release payment with the bank transaction through the standard reconciliation process.')}

      ${warningBox('Failure to deposit retention money into a Retention Trust Account when required is a serious compliance breach under the BIF Act. The Compliance dashboard monitors this automatically.')}
    `
  });

  // ===== BANK & TRUST ACCOUNTS =====
  guides.push({
    title: 'Setting Up Bank and Trust Accounts',
    category_id: categoryMap['Bank & Trust Accounts'],
    tags: ['bank accounts', 'trust accounts', 'PTA', 'RTA', 'cash account'],
    content: `
      <h1 style="color: #333;">Setting Up Bank and Trust Accounts</h1>
      <p style="font-size: 18px; color: #555;">PayTrade manages three types of accounts: Cash Accounts, Project Trust Accounts (PTA), and Retention Trust Accounts (RTA). Here's how to set them up.</p>

      ${imgTag('user-bank-accounts', 'Bank Accounts (Current) list page')}

      ${sectionHeading('Account Types')}
      ${componentExplainer([
        ['Cash Account', 'Your standard business operating account. Used for general payments and receipts that don\'t need to go through a trust.'],
        ['Project Trust Account (PTA)', 'A dedicated trust account required under the BIF Act for eligible construction projects. All payments related to the project must flow through this account.'],
        ['Retention Trust Account (RTA)', 'A dedicated trust account for holding retention money. Required when the project has retention obligations under the BIF Act.']
      ])}

      ${sectionHeading('Bank Accounts Page')}
      ${componentExplainer([
        ['Account Name', 'The name you assigned to the account (e.g., "Brisbane CBD Tower PTA")'],
        ['Account Type', 'Cash Account, Project Trust Account, or Retention Trust Account'],
        ['BSB / Account Number', 'Your bank\'s BSB and account number for identification'],
        ['Current Balance', 'The balance as per the most recent bank statement or transaction upload'],
        ['Status', 'Active, Draft, or Archived'],
        ['Current / Archived Tabs', 'Switch between active accounts and closed/archived ones'],
        ['Actions', 'View overview, edit details, upload transactions, or archive']
      ])}

      ${sectionHeading('Creating a New Account')}
      ${stepBox(1, 'Click "Add Account"', 'Navigate to Bank Accounts and click the add button.')}
      ${stepBox(2, 'Select Account Type', 'Choose Cash Account, Project Trust Account, or Retention Trust Account.')}
      ${stepBox(3, 'Enter Bank Details', 'Fill in the account name, BSB number, account number, and the financial institution.')}
      ${stepBox(4, 'Link to Project (Trust Accounts)', 'For PTA and RTA accounts, select which project this trust account belongs to.')}
      ${stepBox(5, 'Save', 'Click "Save" to create the account.')}

      ${warningBox('After creating a Project Trust Account, you must generate and send a QBCC TA1 (Account Opening) notice. The system will flag this as a compliance requirement.')}

      ${tipBox('Your subscription plan limits the number of trust accounts you can create. Basic and Standard plans allow 2, Advanced allows 10, and Pro Audit allows unlimited. Check your plan if you need more.')}
    `
  });

  guides.push({
    title: 'Uploading and Reconciling Bank Transactions',
    category_id: categoryMap['Bank & Trust Accounts'],
    tags: ['transactions', 'CSV upload', 'reconciliation', 'matching', 'bank statement'],
    content: `
      <h1 style="color: #333;">Uploading and Reconciling Bank Transactions</h1>
      <p style="font-size: 18px; color: #555;">Reconciliation ensures your trust account records match your actual bank statements. Here's the complete process.</p>

      ${sectionHeading('Why Reconciliation Matters')}
      <p>Under the BIF Act, trust account holders must perform monthly reconciliations to ensure the trust account ledger matches the bank statement. PayTrade simplifies this process by allowing you to upload bank transactions and match them against recorded claims and payments.</p>

      ${sectionHeading('Step 1: Upload Bank Transactions')}
      ${stepBox(1, 'Open the Account', 'Navigate to Bank Accounts, then click the account you want to reconcile to open its Overview page.')}
      ${stepBox(2, 'Click "Upload Transactions"', 'Click the upload button to go to the transaction upload page.')}
      ${stepBox(3, 'Select CSV File', 'Download your bank statement as a CSV file from your bank, then upload it here. The system parses each transaction row automatically.')}
      ${stepBox(4, 'Review Imported Transactions', 'Check that all transactions have been imported correctly. The system shows the date, description, amount, and running balance for each.')}

      ${sectionHeading('Step 2: Match Transactions')}
      ${stepBox(1, 'Navigate to Match Transactions', 'From the account overview, click "Match Transactions".')}
      ${stepBox(2, 'View Unmatched Items', 'The page shows two columns: unmatched bank transactions (from your CSV) and unmatched claims/payments (from your PayTrade records).')}
      ${stepBox(3, 'Select Matches', 'Click a bank transaction and the corresponding claim payment to match them together. The amounts should align.')}
      ${stepBox(4, 'Confirm Match', 'Click "Match" to confirm. The matched pair is removed from the unmatched list, and the trust account ledger is updated.')}

      ${sectionHeading('Step 3: Handle Mismatches')}
      <p>If a match was made incorrectly:</p>
      ${stepBox(1, 'Go to Unmatch Transactions', 'From the account overview, click "Unmatch Transactions".')}
      ${stepBox(2, 'Select the Incorrect Match', 'Find the incorrectly matched transaction pair.')}
      ${stepBox(3, 'Unmatch', 'Click "Unmatch" to reverse the match. Both items return to the unmatched list.')}

      ${warningBox('All bank transactions should be matched before the monthly reconciliation deadline. Unmatched transactions appear on your dashboard as alerts and may trigger compliance warnings.')}

      ${tipBox('If you have Bank Feeds enabled (Standard plan and above), your transactions can be imported automatically via Open Banking, eliminating the need for manual CSV uploads.')}
    `
  });

  // ===== TRUST ACCOUNTING =====
  guides.push({
    title: 'Trust Accounting Overview',
    category_id: categoryMap['Trust Accounting'],
    tags: ['trust accounting', 'journals', 'reconciliation', 'trial balance', 'ledger'],
    content: `
      <h1 style="color: #333;">Trust Accounting Overview</h1>
      <p style="font-size: 18px; color: #555;">Trust accounting is the backbone of BIF Act compliance. This guide explains every component of the Trust Accounting module.</p>

      ${imgTag('user-trust-accounting', 'Trust Accounting dashboard')}

      ${sectionHeading('Trust Accounting Pages')}
      ${componentExplainer([
        ['Trust Accounting Dashboard', 'Overview of all trust accounts, their balances, and compliance status'],
        ['Journals', 'Every financial entry recorded in the trust account — deposits, withdrawals, transfers. Each entry is a double-entry journal (debit and credit).'],
        ['Account Ledger', 'A detailed view of all transactions for a specific account, showing running balances. Used for auditing and reporting.'],
        ['Trial Balance', 'A financial statement listing all account balances for a reporting period. Debits must equal credits — if they don\'t, there is an error to investigate.'],
        ['Deposits', 'Track all deposits into trust accounts, including their source and purpose.'],
        ['Reconciliation Records', 'Monthly reconciliation records comparing the trust account bank balance against the ledger balance.'],
        ['Audit (Pro Audit Only)', 'External audit tracking as required by QBCC regulations. Record audit dates, findings, and outcomes.']
      ])}

      ${sectionHeading('Key Concepts')}
      <h3>Journal Entries</h3>
      <p>Journal entries are created automatically when:</p>
      <ul>
        <li>A payment claim is processed</li>
        <li>A bank transaction is matched</li>
        <li>A deposit is recorded</li>
        <li>Interest or charges are entered</li>
      </ul>

      <h3>Monthly Reconciliation</h3>
      <p>At the end of each month, you must create a reconciliation record that compares:</p>
      <ul>
        <li>The bank statement closing balance</li>
        <li>The trust account ledger closing balance</li>
        <li>Any outstanding (unmatched) items that explain the difference</li>
      </ul>

      <h3>7-Year Record Retention</h3>
      <p>Trust account records must be retained for 7 years under the BIF Act. PayTrade stores all records automatically and ensures compliance with this requirement.</p>

      ${warningBox('Monthly reconciliations are a legal requirement for all trust accounts. The Compliance module monitors whether reconciliations are up to date and alerts you if one is overdue.')}
    `
  });

  // ===== COMPLIANCE & NOTICES =====
  guides.push({
    title: 'Compliance Monitoring',
    category_id: categoryMap['Compliance & Notices'],
    tags: ['compliance', 'QBCC', 'BIF Act', 'monitoring', 'action required'],
    content: `
      <h1 style="color: #333;">Compliance Monitoring</h1>
      <p style="font-size: 18px; color: #555;">PayTrade automatically monitors your compliance with the BIF Act and QBCC requirements. This guide explains how to use the Compliance module.</p>

      ${imgTag('user-compliances', 'Compliance Overview page')}

      ${sectionHeading('Compliance Dashboard')}
      ${componentExplainer([
        ['Project Name', 'The project being monitored'],
        ['Account Type', 'PTA or RTA — which trust account is being checked'],
        ['Status', '"Ok" (compliant, shown in green) or "Action Required" (issues found, shown in red/orange)'],
        ['Issues Found', 'A description of the specific compliance problem detected'],
        ['Action Link', 'Click to go directly to the relevant page to resolve the issue']
      ])}

      ${sectionHeading('What Compliance Checks Monitor')}
      <ul>
        <li><strong>Trust Account Establishment:</strong> Is the PTA/RTA opened within the required timeframe?</li>
        <li><strong>Opening Notices:</strong> Has the QBCC TA1 notice been generated and sent?</li>
        <li><strong>Monthly Reconciliation:</strong> Is the trust account reconciled within the required period?</li>
        <li><strong>Payment Deadlines:</strong> Are payments being made within the contractual timeframe?</li>
        <li><strong>Notice Requirements:</strong> Are all required QBCC notices generated and sent?</li>
        <li><strong>Retention Trust:</strong> Is retention money deposited in the correct RTA?</li>
        <li><strong>Beneficiary Records:</strong> Are all trust beneficiaries correctly recorded?</li>
      </ul>

      ${sectionHeading('Resolving Compliance Issues')}
      ${stepBox(1, 'Review the Issue', 'Click on the "Action Required" item to see exactly what needs to be done.')}
      ${stepBox(2, 'Take the Required Action', 'The system links you directly to the relevant page — for example, if a reconciliation is overdue, it takes you to the Reconciliation Records page.')}
      ${stepBox(3, 'Verify Resolution', 'After completing the action, return to the Compliance Overview. The status should update to "Ok".')}

      ${tipBox('Check the Compliance dashboard regularly — at least weekly. The dashboard counter on your home screen also shows the total number of items needing attention.')}
    `
  });

  guides.push({
    title: 'Generating and Sending QBCC Notices',
    category_id: categoryMap['Compliance & Notices'],
    tags: ['notices', 'QBCC', 'TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'S75'],
    content: `
      <h1 style="color: #333;">Generating and Sending QBCC Notices</h1>
      <p style="font-size: 18px; color: #555;">QBCC notices are mandatory documents required under the BIF Act. PayTrade generates them as PDFs and sends them to the relevant parties.</p>

      ${imgTag('user-notices', 'Notices list page')}

      ${sectionHeading('Notice Types')}
      ${componentExplainer([
        ['QBCC TA1 — Account Opening', 'Notification that a Project Trust Account or Retention Trust Account has been opened. Must be sent when a new trust account is created.'],
        ['QBCC TA2 — Account Closing', 'Notification that a trust account has been closed. Sent when a project is completed and the trust account is being wound up.'],
        ['QBCC TA3 — Related Entities', 'Disclosure of related entities for the trust. Required when there are related party transactions.'],
        ['QBCC TA4 — Part Payment', 'Notification of a partial payment made from the trust account. Sent when not all beneficiaries receive their full entitlement.'],
        ['QBCC TA5 — Nil Return', 'Notification that no withdrawals were made from the trust account during the reporting period.'],
        ['S75 Supporting Statement', 'A supporting statement that must accompany payment claims made from a trust account. Generated automatically with each claim.']
      ])}

      ${sectionHeading('Generating a Notice')}
      ${stepBox(1, 'Navigate to Notices', 'Click "Notices" in the sidebar menu.')}
      ${stepBox(2, 'Click "Add Notice"', 'Click the add button to generate a new notice.')}
      ${stepBox(3, 'Select Notice Type', 'Choose the type of notice (TA1, TA2, TA3, TA4, or TA5).')}
      ${stepBox(4, 'Select Account and Details', 'Choose the trust account and fill in any required details.')}
      ${stepBox(5, 'Generate PDF', 'The system generates the notice as a PDF document. Review it for accuracy.')}
      ${stepBox(6, 'Send Notice', 'Send the notice to the relevant parties (QBCC, beneficiaries, etc.) via email. The PDF is attached automatically.')}

      ${warningBox('Basic plan users must generate notices manually. Standard, Advanced, and Pro Audit users get automated notice generation based on compliance triggers — the system creates notices when events occur that require them.')}

      ${tipBox('All generated notices are stored permanently and can be accessed from the Notices list at any time. This provides a complete audit trail for regulatory purposes.')}
    `
  });

  // ===== INTEGRATIONS =====
  guides.push({
    title: 'Connecting Xero to PayTrade',
    category_id: categoryMap['Integrations'],
    tags: ['xero', 'integration', 'accounting', 'sync'],
    content: `
      <h1 style="color: #333;">Connecting Xero to PayTrade</h1>
      <p style="font-size: 18px; color: #555;">Sync your accounting data between PayTrade and Xero automatically. Available on Advanced and Pro Audit plans.</p>

      ${imgTag('user-integrations', 'Integrations page')}

      ${sectionHeading('What Xero Integration Does')}
      <ul>
        <li><strong>Sync Contacts:</strong> Import your Xero contacts as PayTrade clients and suppliers</li>
        <li><strong>Sync Invoices:</strong> Keep invoices in sync between both platforms</li>
        <li><strong>Sync Bills:</strong> Bills from Xero appear in PayTrade for reconciliation</li>
        <li><strong>Map Bank Accounts:</strong> Link your Xero bank accounts to PayTrade trust accounts</li>
        <li><strong>Project Mapping:</strong> Associate Xero tracking categories with PayTrade projects</li>
      </ul>

      ${sectionHeading('How to Connect')}
      ${stepBox(1, 'Navigate to Integrations', 'Click "Integrations" in the sidebar menu.')}
      ${stepBox(2, 'Click "Connect Xero"', 'Click the Xero connection button.')}
      ${stepBox(3, 'Authorise in Xero', 'You will be redirected to Xero\'s login page. Sign in and authorise PayTrade to access your Xero organisation.')}
      ${stepBox(4, 'Map Your Accounts', 'After authorisation, go to the Xero settings page to map your bank accounts and contacts between the two systems.')}
      ${stepBox(5, 'Start Syncing', 'Once mapped, data will sync automatically. Use the Sync Log to monitor activity and troubleshoot any issues.')}

      ${warningBox('Xero integration is only available on Advanced and Pro Audit subscription plans. If you are on Basic or Standard, you will need to upgrade to access this feature.')}

      ${tipBox('Check the Sync Log regularly for any failed sync events. Common issues include contacts without ABNs or invoices with missing fields.')}
    `
  });

  // ===== COMMUNITY =====
  guides.push({
    title: 'Using the Community Forum',
    category_id: categoryMap['Community'],
    tags: ['community', 'discussions', 'product ideas', 'forum'],
    content: `
      <h1 style="color: #333;">Using the Community Forum</h1>
      <p style="font-size: 18px; color: #555;">Connect with other construction professionals, ask questions about trust accounting and the BIF Act, and suggest new features.</p>

      ${imgTag('community-page', 'Community home page')}

      ${sectionHeading('Community Sections')}
      ${componentExplainer([
        ['Discussions', 'A Q&A forum where users can ask questions and share answers about trust accounting, BIF Act compliance, and construction industry best practices.'],
        ['Product Ideas', 'A feature request board where users can submit ideas for improving PayTrade and vote on others\' suggestions.']
      ])}

      ${sectionHeading('Starting a Discussion')}
      ${stepBox(1, 'Navigate to Community', 'Click "Community" in the sidebar or the top navigation menu.')}
      ${stepBox(2, 'Click "Start a Discussion"', 'Click the button to create a new discussion topic.')}
      ${stepBox(3, 'Select a Category', 'Choose the most relevant category for your question.')}
      ${stepBox(4, 'Write Your Question', 'Enter a clear title and detailed description. Include any relevant context about your project or situation.')}
      ${stepBox(5, 'Submit', 'Click "Submit" to post your discussion. Other users can now see and respond to it.')}

      ${sectionHeading('Interacting with Content')}
      <ul>
        <li><strong>Answer:</strong> Reply to a discussion with your answer or insight</li>
        <li><strong>Like:</strong> Show appreciation for helpful answers by clicking the like button</li>
        <li><strong>Best Answer:</strong> The answer with the most likes is automatically highlighted as the "Best Answer"</li>
        <li><strong>Vote (Product Ideas):</strong> Upvote feature requests you want to see implemented</li>
        <li><strong>Report:</strong> Flag inappropriate content as "Inappropriate" or "Spam"</li>
      </ul>

      ${tipBox('The Community is available on all plans, including the free Basic plan. It\'s a great resource for getting answers about BIF Act compliance from experienced professionals.')}
    `
  });

  // ===== ADMIN PANEL =====
  guides.push({
    title: 'Admin Dashboard and Navigation',
    category_id: categoryMap['Admin Panel'],
    tags: ['admin', 'dashboard', 'admin panel', 'navigation'],
    content: `
      <h1 style="color: #333;">Admin Dashboard and Navigation</h1>
      <p style="font-size: 18px; color: #555;">The admin panel provides full control over the PayTrade platform. This guide is for Portal Admins and Restricted Portal Admins only.</p>

      ${imgTag('admin-dashboard', 'Admin dashboard page')}

      ${sectionHeading('Admin Dashboard')}
      ${componentExplainer([
        ['New Users Count', 'Number of users who registered recently'],
        ['New Businesses Count', 'Number of new business profiles created'],
        ['Notices Pending', 'System-wide count of notices that need attention'],
        ['Compliance Issues', 'Platform-wide compliance problems requiring review'],
        ['Failed Transactions', 'Subscription payment failures that need investigation'],
        ['Trust Accounting Issues', 'Trust accounts with reconciliation or balance problems'],
        ['Quick Access Links', 'Shortcuts to all major admin sections']
      ])}

      ${sectionHeading('Admin Navigation')}
      <p>The admin sidebar provides access to all management functions:</p>
      <ul>
        <li><strong>Users</strong> — Manage platform users, block/unblock, reset passwords</li>
        <li><strong>Businesses</strong> — View and manage registered businesses</li>
        <li><strong>Admin Users</strong> — Manage admin accounts and permissions</li>
        <li><strong>Groups</strong> — Define permission groups for admin roles</li>
        <li><strong>Subscriptions</strong> — Manage plans, items, coupons, and billing</li>
        <li><strong>Content Management</strong> — FAQ, email templates</li>
        <li><strong>Blog</strong> — Create and manage blog posts</li>
        <li><strong>Resource Guides</strong> — Manage educational resources</li>
        <li><strong>How-to Guides</strong> — Manage platform guides (like this one!)</li>
        <li><strong>Community</strong> — Moderate discussions and product ideas</li>
        <li><strong>Notices</strong> — View all platform notices</li>
        <li><strong>Compliance</strong> — Platform-wide compliance overview</li>
        <li><strong>Communication</strong> — Send system-wide emails</li>
        <li><strong>Masters</strong> — Manage dropdown values and system constants</li>
        <li><strong>Holidays</strong> — Configure public holidays that affect payment deadlines</li>
        <li><strong>Activity Log</strong> — Full audit trail of admin actions</li>
      </ul>
    `
  });

  guides.push({
    title: 'Managing Users and Businesses (Admin)',
    category_id: categoryMap['Admin Panel'],
    tags: ['admin', 'users', 'businesses', 'block', 'reset password'],
    content: `
      <h1 style="color: #333;">Managing Users and Businesses</h1>
      <p style="font-size: 18px; color: #555;">A guide for admins on managing platform users and business profiles.</p>

      ${imgTag('admin-users', 'Admin Users management page')}

      ${sectionHeading('Users Management Page')}
      ${componentExplainer([
        ['User Name', 'First and last name of the registered user'],
        ['Email', 'The user\'s login email address'],
        ['Phone', 'Contact phone number'],
        ['Company', 'The primary company the user belongs to'],
        ['Status', 'Active, Blocked, or Unverified'],
        ['Subscription', 'Which plan the user\'s company is on (Basic, Standard, Advanced, Pro Audit)'],
        ['Contacted', 'Whether an admin has marked this user as contacted (useful for sales follow-up)'],
        ['Actions', 'Edit, block/unblock, reset password, login as user, generate bot users']
      ])}

      ${sectionHeading('Key Admin Actions')}
      
      <h3>Editing a User</h3>
      <p>Click "Edit" to update a user's details, change their status, or modify their subscription settings.</p>

      <h3>Blocking/Unblocking</h3>
      <p>Click "Block" to prevent a user from logging in. They will see an error message when attempting to access their account. Click "Unblock" to restore access.</p>

      <h3>Resetting a Password</h3>
      <p>Click "Reset Password" to generate a new password and send it to the user's email address. The user can then change it after logging in.</p>

      <h3>Login As User (Portal Admin Only)</h3>
      <p>This powerful feature lets a Portal Admin log in as any user to troubleshoot issues. You will be prompted to enter your admin password for security. Use this carefully — all actions taken will be logged.</p>

      ${imgTag('admin-business', 'Admin Business management page')}

      ${sectionHeading('Business Management')}
      ${componentExplainer([
        ['Business Name', 'The registered company name'],
        ['ABN', 'Australian Business Number'],
        ['Entity Type', 'Business, Sole Trader, or Personal'],
        ['QBCC Number', 'QBCC license number (if applicable)'],
        ['Verified', 'Whether the business has been verified by admin'],
        ['Actions', 'Edit details, view linked users, manage verification status']
      ])}

      ${warningBox('The "Login As User" feature should only be used for legitimate troubleshooting. All actions taken while logged in as a user are recorded in the activity log.')}
    `
  });

  guides.push({
    title: 'Managing Subscriptions and Billing (Admin)',
    category_id: categoryMap['Admin Panel'],
    tags: ['admin', 'subscriptions', 'plans', 'coupons', 'billing', 'stripe'],
    content: `
      <h1 style="color: #333;">Managing Subscriptions and Billing</h1>
      <p style="font-size: 18px; color: #555;">Control subscription plans, plan items, coupons, and view billing history across the platform.</p>

      ${imgTag('admin-subscriptions', 'Admin Subscriptions management page')}

      ${sectionHeading('Subscription Plans')}
      ${componentExplainer([
        ['Plan Name', 'The name of the subscription tier (Basic, Standard, Advanced, Pro Audit)'],
        ['Price (Monthly/Yearly)', 'The cost of the plan per billing period'],
        ['Status', 'Active or Archived'],
        ['Trial Period', 'Number of days for the free trial period (if applicable)'],
        ['Actions', 'Edit pricing, view plan details, archive/restore']
      ])}

      ${sectionHeading('Plan Items')}
      <p>Plan items define what features and limits each plan includes:</p>

      ${imgTag('admin-subscription-items', 'Admin Subscription Items management page')}

      ${componentExplainer([
        ['Item Name', 'The feature name (e.g., "Users", "Projects", "Trusts")'],
        ['Plan', 'Which subscription plan this item belongs to'],
        ['Limit Value', 'The numeric limit for this feature (e.g., 5 users, 10 projects)'],
        ['Is Unlimited', 'If checked, no limit is enforced for this feature on this plan'],
        ['Status', 'Active or Archived']
      ])}

      ${sectionHeading('Managing Coupons')}
      <p>Coupons provide discounts on subscription plans. They are synced with Stripe.</p>
      ${stepBox(1, 'Navigate to Manage Coupons', 'Go to Subscriptions > Manage Coupons.')}
      ${stepBox(2, 'Create a Coupon', 'Enter the coupon code, discount type (percentage or fixed), discount amount, and expiry date.')}
      ${stepBox(3, 'The coupon syncs to Stripe', 'When saved, the coupon is created in Stripe and can be applied during checkout.')}

      ${sectionHeading('Billing History')}
      <p>View all subscription transactions, including successful payments, failed charges, and refunds. Use this to investigate billing issues reported by users.</p>

      ${tipBox('When changing plan pricing, note that existing subscribers on the old price will not be automatically updated. They will see the new price at their next renewal unless manually adjusted.')}
    `
  });

  guides.push({
    title: 'Content Management and Community Moderation (Admin)',
    category_id: categoryMap['Admin Panel'],
    tags: ['admin', 'content', 'FAQ', 'blog', 'community', 'moderation', 'bot'],
    content: `
      <h1 style="color: #333;">Content Management and Community Moderation</h1>
      <p style="font-size: 18px; color: #555;">Manage all platform content including FAQs, blog posts, resource guides, how-to guides, and community moderation.</p>

      ${sectionHeading('FAQ Management')}
      ${imgTag('admin-content-faq', 'Admin FAQ management page')}
      <p>Create and manage FAQ entries that appear on the public FAQ page. Each FAQ has a question, answer (rich text), category, and publish status.</p>

      ${sectionHeading('Blog Management')}
      ${imgTag('admin-blog', 'Admin Blog management page')}
      <p>Create and manage blog articles. Each post has a title, content (rich text editor), category, banner image, tags, and publish status. Published posts appear at /blog.</p>

      ${sectionHeading('Community Moderation')}
      ${imgTag('admin-community-discussions', 'Admin Community Discussions page')}
      
      ${componentExplainer([
        ['Discussion Title', 'The title of the discussion thread'],
        ['Author', 'Who started the discussion'],
        ['Category', 'The topic category'],
        ['Answers', 'Number of answers/responses'],
        ['Status', 'Active, Reported, or Deleted'],
        ['Actions', 'View, delete, review reported content, generate bot answers']
      ])}

      <h3>Community Bot Controls</h3>
      <p>Admins have special buttons to generate AI-powered content:</p>
      <ul>
        <li><strong>"Generate Bot Users"</strong> (Users page) — Creates AI-generated user personas with realistic Australian construction industry profiles</li>
        <li><strong>"Generate Bot Question"</strong> (Discussions page header) — Uses OpenAI GPT-4o to generate a realistic discussion with question and answer</li>
        <li><strong>"Generate Bot Answers"</strong> (per discussion row) — Generates AI answers for a specific active discussion</li>
      </ul>

      ${tipBox('The community bot also runs automatically on Monday, Wednesday, and Friday at 9 AM UTC, generating new questions and answers to keep the community active.')}
    `
  });

  // ===== USER FLOWS =====
  guides.push({
    title: 'End-to-End Payment Flow',
    category_id: categoryMap['User Flows'],
    tags: ['user flow', 'payment flow', 'end to end', 'walkthrough'],
    content: `
      <h1 style="color: #333;">End-to-End Payment Flow</h1>
      <p style="font-size: 18px; color: #555;">A complete walkthrough of the payment process from claim submission through to bank reconciliation.</p>

      ${sectionHeading('Overview')}
      <p>This guide follows a typical payment scenario: a subcontractor claims payment from a head contractor for completed work, and the head contractor processes the payment through a Project Trust Account.</p>

      ${sectionHeading('Phase 1: Setup (Prerequisites)')}
      <p>Before any payment can flow, the following must already exist:</p>
      <ul>
        <li>A <strong>Project</strong> has been created with PTA eligibility determined</li>
        <li>A <strong>Contract</strong> links the project to the client/supplier with payment terms defined</li>
        <li>A <strong>Project Trust Account (PTA)</strong> has been opened and linked to the project</li>
        <li>If retention applies, a <strong>Retention Trust Account (RTA)</strong> is also set up</li>
        <li>QBCC TA1 (Account Opening) notices have been generated and sent</li>
      </ul>

      ${sectionHeading('Phase 2: Claim Submission')}
      ${stepBox(1, 'Subcontractor Creates a Claim', 'The subcontractor navigates to Pay Apps > Add Claim, selects the contract, enters the claim amount and description, and submits.')}
      ${stepBox(2, 'System Calculates Retention', 'Based on the contract\'s retention percentage, the system automatically calculates and displays the retention amount that will be withheld.')}
      ${stepBox(3, 'Claim Appears for Head Contractor', 'The claim shows up in the head contractor\'s Billable tab, and in their Payments To Do dashboard widget.')}

      ${sectionHeading('Phase 3: Claim Review & Payment')}
      ${stepBox(4, 'Head Contractor Reviews', 'The head contractor opens the claim from their Billable tab, reviews the amount and supporting documents.')}
      ${stepBox(5, 'Payment Recorded', 'From the claim view, the head contractor clicks "Add Payment", enters the payment details (amount, date, reference), and saves.')}
      ${stepBox(6, 'S75 Generated', 'An S75 Supporting Statement is automatically generated. This must accompany the payment as a legal requirement.')}
      ${stepBox(7, 'Retention Withheld', 'The retention portion is separated and tracked in the Retention List. If an RTA exists, the retained amount should be deposited there.')}

      ${sectionHeading('Phase 4: Bank Reconciliation')}
      ${stepBox(8, 'Upload Bank Statement', 'Once the payment clears the bank, the head contractor downloads a CSV bank statement and uploads it via Bank Accounts > Upload Transactions.')}
      ${stepBox(9, 'Match Transaction', 'Navigate to Match Transactions. Find the bank transaction that corresponds to the claim payment and match them together.')}
      ${stepBox(10, 'Ledger Updated', 'The trust account ledger updates automatically. The transaction is no longer "unmatched" on the dashboard.')}

      ${sectionHeading('Phase 5: Monthly Reconciliation')}
      ${stepBox(11, 'Create Reconciliation Record', 'At month end, navigate to Trust Accounting > Reconciliation Records > Add. Enter the bank statement closing balance.')}
      ${stepBox(12, 'Compare Balances', 'The system compares the bank balance with the ledger balance. Any differences are explained by outstanding unmatched items.')}
      ${stepBox(13, 'Save and Confirm', 'Save the reconciliation. The Compliance dashboard updates to show the trust account is reconciled for this period.')}

      ${warningBox('Every step in this flow is tracked for compliance purposes. Skipping steps (like failing to reconcile or not sending S75 statements) will trigger compliance alerts.')}
    `
  });

  guides.push({
    title: 'Trust Account Lifecycle',
    category_id: categoryMap['User Flows'],
    tags: ['user flow', 'trust account', 'lifecycle', 'PTA', 'opening', 'closing'],
    content: `
      <h1 style="color: #333;">Trust Account Lifecycle</h1>
      <p style="font-size: 18px; color: #555;">From opening to closing — the complete lifecycle of a trust account in PayTrade.</p>

      ${sectionHeading('Phase 1: Eligibility Check')}
      ${stepBox(1, 'Create a Project', 'When creating a project, the system checks if the head contract sum exceeds the BIF Act threshold for a PTA.')}
      ${stepBox(2, 'PTA Eligibility Determined', 'If eligible, the project is marked "PTA Eligibility: Yes". The compliance module begins monitoring.')}

      ${sectionHeading('Phase 2: Account Opening')}
      ${stepBox(3, 'Open the Trust Account', 'Navigate to Bank Accounts > Add Account. Select "Project Trust Account" or "Retention Trust Account" and enter your bank details.')}
      ${stepBox(4, 'Link to Project', 'Associate the trust account with the relevant project.')}
      ${stepBox(5, 'Generate TA1 Notice', 'Navigate to Notices > Add Notice. Generate a QBCC TA1 (Account Opening) notice. This is mandatory.')}
      ${stepBox(6, 'Send TA1', 'Send the TA1 notice to QBCC and all relevant beneficiaries via email.')}

      ${sectionHeading('Phase 3: Active Use')}
      <p>During the project lifecycle, the trust account is used for:</p>
      <ul>
        <li>Receiving project payments from the principal</li>
        <li>Making payments to subcontractors and suppliers</li>
        <li>Holding retention money (if RTA)</li>
        <li>Monthly reconciliations</li>
        <li>Generating journal entries and ledger records</li>
        <li>Generating TA4 (Part Payment) and TA5 (Nil Return) notices as needed</li>
      </ul>

      ${sectionHeading('Phase 4: Account Closure')}
      ${stepBox(7, 'Complete All Payments', 'Ensure all claims are paid and all retention released.')}
      ${stepBox(8, 'Final Reconciliation', 'Perform a final monthly reconciliation ensuring the balance is zero.')}
      ${stepBox(9, 'Generate TA2 Notice', 'Generate a QBCC TA2 (Account Closing) notice.')}
      ${stepBox(10, 'Archive the Account', 'Move the trust account to "Archived" status. All records are retained for 7 years.')}

      ${tipBox('Even after a trust account is archived, its full history — journals, reconciliations, notices, and audit trail — remains accessible for the statutory 7-year retention period.')}
    `
  });

  guides.push({
    title: 'New User Onboarding Flow',
    category_id: categoryMap['User Flows'],
    tags: ['user flow', 'onboarding', 'new user', 'setup', 'first steps'],
    content: `
      <h1 style="color: #333;">New User Onboarding Flow</h1>
      <p style="font-size: 18px; color: #555;">A complete guide for new users — from registration to creating your first project and processing your first payment.</p>

      ${imgTag('home-page', 'PayTrade home page — your starting point')}

      ${sectionHeading('Week 1: Registration & Setup')}
      
      <h3>Day 1: Create Your Account</h3>
      ${stepBox(1, 'Sign Up', 'Visit paytrade.app and click "Sign up for free". Complete the multi-step registration process.')}
      ${stepBox(2, 'Set Up Your Business Profile', 'Enter your company details, ABN, and QBCC license number. Upload your logo.')}
      ${stepBox(3, 'Explore the Dashboard', 'Familiarise yourself with the dashboard layout, sidebar navigation, and quick action links.')}

      <h3>Day 2-3: Add Your Contacts</h3>
      ${stepBox(4, 'Add Clients & Suppliers', 'Go to Clients & Suppliers > Add. Enter your principals, head contractors, subcontractors, and suppliers.')}
      ${stepBox(5, 'Consider Upgrading', 'If you need more than 1 project or 2 trust accounts, review the pricing plans and upgrade your subscription.')}

      ${sectionHeading('Week 2: First Project')}
      
      ${stepBox(6, 'Create Your First Project', 'Go to Projects > Add Project. Enter the project details and check PTA eligibility.')}
      ${stepBox(7, 'Set Up Contracts', 'Go to Contracts > Add Contract. Link the contract to your project and the relevant client/supplier.')}
      ${stepBox(8, 'Open Trust Accounts', 'If PTA/RTA eligible, create the required trust accounts under Bank Accounts.')}
      ${stepBox(9, 'Generate Opening Notices', 'Create and send QBCC TA1 notices for each new trust account.')}

      ${sectionHeading('Week 3+: Ongoing Operations')}
      
      ${stepBox(10, 'Submit Payment Claims', 'As work is completed, create payment claims under Pay Apps.')}
      ${stepBox(11, 'Record Payments', 'When payments are made or received, record them against the relevant claims.')}
      ${stepBox(12, 'Upload & Reconcile', 'Download your bank statement CSV and upload it. Match transactions to claims.')}
      ${stepBox(13, 'Monthly Reconciliation', 'At month end, create a reconciliation record for each trust account.')}
      ${stepBox(14, 'Monitor Compliance', 'Check the Compliance dashboard regularly to ensure everything is in order.')}

      ${tipBox('Don\'t try to set up everything at once. Start with one project and learn the workflow, then expand to additional projects as you become comfortable with the system.')}
    `
  });

  guides.push({
    title: 'Managing Variations',
    category_id: categoryMap['Projects & Contracts'],
    tags: ['variations', 'contract changes', 'scope change'],
    content: `
      <h1 style="color: #333;">Managing Variations</h1>
      <p style="font-size: 18px; color: #555;">Variations track changes to contract scope and value. This guide explains how to create and manage them.</p>

      ${imgTag('user-variations', 'Variations list page')}

      ${sectionHeading('What Are Variations?')}
      <p>In construction, a variation is a change to the original contract — it could be additional work, reduced scope, or modified specifications. Variations affect the contract sum and need to be formally tracked.</p>

      ${sectionHeading('Variations List Page')}
      ${componentExplainer([
        ['Variation Name/Reference', 'A unique identifier for the variation'],
        ['Contract', 'The contract this variation modifies'],
        ['Amount', 'The financial impact — positive for additional work, negative for reduced scope'],
        ['Status', 'Draft, Submitted, Approved, Rejected, or Completed'],
        ['Actions', 'View, edit, or approve the variation']
      ])}

      ${sectionHeading('Creating a Variation')}
      ${stepBox(1, 'Navigate to Variations', 'Click "Variations" in the sidebar menu.')}
      ${stepBox(2, 'Click "Add Variation"', 'Click the add button in the top-right corner.')}
      ${stepBox(3, 'Select the Contract', 'Choose which contract this variation applies to.')}
      ${stepBox(4, 'Enter Details', 'Fill in the variation description, the financial amount (positive or negative), and any supporting documentation.')}
      ${stepBox(5, 'Submit for Approval', 'Save the variation and submit it for approval by the relevant party.')}

      <p>Once a variation is approved, the contract\'s "Adjusted Contract Sum" automatically updates to reflect the change.</p>

      ${tipBox('Keep variations well-documented with descriptions and supporting files. This creates a clear audit trail and helps prevent disputes about scope changes.')}
    `
  });

  guides.push({
    title: 'User Access and Invitations',
    category_id: categoryMap['Getting Started'],
    tags: ['user access', 'invitations', 'team', 'roles', 'permissions'],
    content: `
      <h1 style="color: #333;">User Access and Invitations</h1>
      <p style="font-size: 18px; color: #555;">Invite team members to your company, manage their roles, and control what they can access.</p>

      ${sectionHeading('User Roles Within a Company')}
      ${componentExplainer([
        ['Primary Admin', 'The person who created the company profile. Has full control over all settings, users, and data.'],
        ['Admin', 'Elevated permissions — can manage users, projects, and most business functions. Cannot delete the company or change billing.'],
        ['Standard User', 'Regular team member with access to day-to-day operations like creating claims and viewing projects. Cannot manage other users.'],
        ['Basic User', 'Limited access — can view their own data and perform basic tasks only.']
      ])}

      ${sectionHeading('Inviting Team Members')}
      ${stepBox(1, 'Navigate to User Access', 'Go to Company > User Access in the sidebar.')}
      ${stepBox(2, 'Click "Add User"', 'Click the add button to invite a new team member.')}
      ${stepBox(3, 'Enter Their Details', 'Provide their email address, name, and the role you want to assign.')}
      ${stepBox(4, 'Set Permissions', 'Configure granular permissions: manage projects, manage trust payments, manage users, manage company, manage subscriptions.')}
      ${stepBox(5, 'Send Invitation', 'The system sends an email invitation. The user can sign up (if new) or accept the invitation (if they have an existing PayTrade account).')}

      ${sectionHeading('Managing Invitations')}
      <p>Go to Company > Invitations to view pending invitations. You can:</p>
      <ul>
        <li>See which invitations are still pending</li>
        <li>Resend invitation emails</li>
        <li>Revoke invitations that are no longer needed</li>
      </ul>

      ${warningBox('Your subscription plan limits the number of users. Basic plans allow 1 user, Standard allows 5, and Advanced/Pro Audit allow unlimited users. You will receive an upgrade prompt if you try to exceed your limit.')}
    `
  });

  guides.push({
    title: 'Personal Settings and Security',
    category_id: categoryMap['Getting Started'],
    tags: ['settings', 'security', 'password', 'profile', 'personal info'],
    content: `
      <h1 style="color: #333;">Personal Settings and Security</h1>
      <p style="font-size: 18px; color: #555;">Update your profile information, change your password, and review your account activity.</p>

      ${imgTag('user-personal-info', 'Personal Information page')}

      ${sectionHeading('Personal Information')}
      <p>Navigate to your profile icon in the top-right corner and select "Personal Info" to update:</p>
      <ul>
        <li>First name and last name</li>
        <li>Phone number</li>
        <li>Address (with Google Places autocomplete)</li>
        <li>Occupation and position title</li>
        <li>Profile photo</li>
      </ul>

      ${imgTag('user-security', 'Sign-in & Security page')}

      ${sectionHeading('Sign-in & Security')}
      <p>Navigate to "Sign-in & Security" to manage your login credentials:</p>
      
      <h3>Changing Your Password</h3>
      ${stepBox(1, 'Enter Current Password', 'For security, you must verify your identity by entering your current password.')}
      ${stepBox(2, 'Enter New Password', 'Create a new password meeting the complexity requirements: 8+ characters, uppercase, lowercase, number, and special character.')}
      ${stepBox(3, 'Confirm and Save', 'Re-enter the new password and click Save. You will remain logged in.')}

      ${imgTag('user-activity-log', 'Activity Log page')}

      ${sectionHeading('Activity Log')}
      <p>The Activity Log shows a complete audit trail of all actions taken on your account:</p>
      ${componentExplainer([
        ['Timestamp', 'When the action occurred'],
        ['Action', 'What was done (e.g., "Created project", "Submitted claim", "Updated contract")'],
        ['Details', 'Specific details about the action'],
        ['IP Address', 'The IP address the action was performed from']
      ])}

      ${tipBox('Review your Activity Log periodically to check for any unexpected actions, especially if you share account access with team members.')}
    `
  });

  guides.push({
    title: 'Subscription Plans and Upgrading',
    category_id: categoryMap['Getting Started'],
    tags: ['subscription', 'pricing', 'upgrade', 'plans', 'basic', 'standard', 'advanced', 'pro audit'],
    content: `
      <h1 style="color: #333;">Subscription Plans and Upgrading</h1>
      <p style="font-size: 18px; color: #555;">Understand the differences between PayTrade plans and how to upgrade for more features.</p>

      ${imgTag('pricing-page', 'PayTrade pricing page')}

      ${sectionHeading('Plan Comparison')}
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #1a73e8; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ccc;">Feature</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ccc;">Basic (Free)</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ccc;">Standard</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ccc;">Advanced</th>
            <th style="padding: 12px; text-align: center; border: 1px solid #ccc;">Pro Audit</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 10px; border: 1px solid #ccc;">Users</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">1</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">5</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Unlimited</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Unlimited</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ccc;">Projects</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">1</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">1</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">10</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Unlimited</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ccc;">Trust Accounts</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">2</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">2</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">10</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Unlimited</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ccc;">Notices</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Manual</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Automated</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Automated</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Automated</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ccc;">ABA Generation</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ccc;">Bank Feeds</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ccc;">Delegate Authority</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ccc;">Xero Integration</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ccc;">Audit Export</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">Yes</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ccc;">Onboarding Support</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">-</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">1 hour</td><td style="padding: 10px; text-align: center; border: 1px solid #ccc;">3 hours</td></tr>
        </tbody>
      </table>

      ${sectionHeading('How to Upgrade')}
      ${stepBox(1, 'Navigate to Subscription Settings', 'Click your profile icon > Manage Subscriptions, or go directly to the Upgrade Plan page.')}
      ${stepBox(2, 'Choose a Plan', 'Review the plan comparison and select the tier that meets your needs.')}
      ${stepBox(3, 'Select Billing Period', 'Choose monthly or yearly billing. Yearly billing typically offers a discount.')}
      ${stepBox(4, 'Complete Payment', 'Enter your payment details via Stripe\'s secure checkout. The upgrade takes effect immediately.')}

      ${tipBox('Start with the Basic (Free) plan to explore the platform. Upgrade when you need more projects, users, or advanced features like Xero integration or automated notices.')}
    `
  });

  return guides;
}

async function seedGuides(guides) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const adminId = '25472ecc-2de4-413a-b20c-2cc9c0c533d8';
  let seeded = 0;

  for (const guide of guides) {
    try {
      const slugTitle = guide.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const catResult = await client.query('SELECT value FROM master_types WHERE id = $1', [guide.category_id]);
      const catName = catResult.rows[0]?.value || 'general';
      const slugCat = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const urlSlug = `${slugCat}-${slugTitle}`;

      const existing = await client.query('SELECT id FROM blog_resource WHERE title = $1', [guide.title]);
      if (existing.rows.length > 0) {
        console.log(`  Skipping (exists): ${guide.title}`);
        continue;
      }

      await client.query(
        `INSERT INTO blog_resource (title, content, content_type, blog_status, published_on, "urlSlug", tags, enable_comments, author_id, category_id, created_group, updated_group)
         VALUES ($1, $2, 'howToGuide', 'Published', NOW(), $3, $4, true, $5, $6, 'ADMIN', 'ADMIN')`,
        [guide.title, guide.content, urlSlug, guide.tags, adminId, guide.category_id]
      );
      seeded++;
      console.log(`  ✓ Seeded: ${guide.title}`);
    } catch (e) {
      console.log(`  ✗ Failed: ${guide.title} — ${e.message}`);
    }
  }

  await client.end();
  return seeded;
}

async function main() {
  console.log('=== PayTrade How-To Guide Generator ===\n');

  console.log('Step 1: Capturing screenshots...');
  await captureScreenshots();

  console.log('\nStep 2: Building guide content...');
  const catResult = await (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query("SELECT id, value FROM master_types WHERE master_type = 'How To Guide Category'");
    await client.end();
    const map = {};
    for (const row of res.rows) map[row.value] = row.id;
    return map;
  })();
  console.log('Categories:', Object.keys(catResult).join(', '));

  const guides = generateGuides(catResult);
  console.log(`Generated ${guides.length} guide definitions\n`);

  console.log('Step 3: Seeding guides into database...');
  const count = await seedGuides(guides);
  console.log(`\n✓ Complete! Seeded ${count} how-to guides.`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
