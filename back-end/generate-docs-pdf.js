const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const htmlPath = path.join(__dirname, 'public/index.html');
  const pdfPath = path.join(__dirname, 'uploads', 'API-docs.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('Docs not found at:', htmlPath);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

  //   const browser = await puppeteer.launch({
  //   headless: true,
  //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
  //   });

  //   const page = await browser.newPage();
  //   await page.setViewport({ width: 1920, height: 1080 });

  //   await page.goto(`file://${htmlPath}`, {
  //   waitUntil: 'load',
  //   timeout: 0,
  //   });

  //   await page.pdf({ path: pdfPath, format: 'A4' });

  const html = fs.readFileSync(htmlPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'load' });

  // Load SpectaQL CSS manually
  await page.addStyleTag({
    path: path.join(__dirname, 'public/stylesheets/spectaql.min.css'),
  });

  // Inject print layout fix
  await page.addStyleTag({
    content: `
    @media print {
      .sidebar, nav {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }

      body, html {
        overflow: visible !important;
        width: 100% !important;
      }

      .layout, .main, .container, .content {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .sidebar {
        margin-bottom: 20px !important;
      }

      pre, code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
      }

      @page {
        size: A3;
        margin: 15mm;
      }
    }
    `,
  });

  await new Promise((r) => setTimeout(r, 2000));

  await page.pdf({
    path: pdfPath,
    format: 'A3',
    // landscape: true,
    printBackground: true,
    scale: 0.9,
    preferCSSPageSize: true,
  });

  await browser.close();

  console.log(`PDF generated at: ${pdfPath}`);
})();

// without page number

// (async () => {
//   const htmlPath = path.join(__dirname, 'public/index.html');
//   const pdfPath = path.join(__dirname, 'uploads', 'API-docs.pdf');

//   if (!fs.existsSync(htmlPath)) {
//     console.error('Docs not found at:', htmlPath);
//     process.exit(1);
//   }

//   fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

//   const html = fs.readFileSync(htmlPath, 'utf8');

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-dev-shm-usage'],
//   });

//   const page = await browser.newPage();

//   await page.setContent(html, { waitUntil: 'load' });

//   await page.addStyleTag({
//     path: path.join(__dirname, 'public/stylesheets/spectaql.min.css'),
//   });

//   await page.evaluate(() => {
//     const headings = [...document.querySelectorAll('h1, h2, h3')];

//     const tocWrapper = document.createElement('div');
//     tocWrapper.id = 'table-of-contents';
//     tocWrapper.innerHTML = `<h1>Table of Contents</h1>`;

//     const tocList = document.createElement('ul');
//     tocList.style.listStyle = 'none';
//     tocList.style.paddingLeft = '0';

//     headings.forEach((heading, index) => {
//       const id = `section-${index}`;
//       heading.id = id;

//       const item = document.createElement('li');
//       item.style.marginBottom = '6px';
//       item.style.paddingLeft =
//         heading.tagName === 'H2'
//           ? '20px'
//           : heading.tagName === 'H3'
//             ? '40px'
//             : '0';

//       item.innerHTML = `<a href="#${id}">${heading.innerText}</a>`;

//       tocList.appendChild(item);
//     });

//     tocWrapper.appendChild(tocList);

//     document.body.prepend(tocWrapper);
//   });

//   await page.addStyleTag({
//     content: `
//       #table-of-contents {
//         page-break-after: always;
//       }

//       #table-of-contents h1 {
//         font-size: 28px;
//         margin-bottom: 15px;
//       }

//       #table-of-contents a {
//         text-decoration: none;
//         color: #000;
//       }

//       @media print {
//         .sidebar, nav {
//           position: static !important;
//           width: 100% !important;
//           max-width: 100% !important;
//           height: auto !important;
//           overflow: visible !important;
//         }

//         body, html {
//           overflow: visible !important;
//           width: 100% !important;
//         }

//         .layout, .main, .container, .content {
//           display: block !important;
//           width: 100% !important;
//           max-width: 100% !important;
//         }

//         .sidebar {
//           margin-bottom: 20px !important;
//         }

//         pre, code {
//           white-space: pre-wrap !important;
//           word-break: break-word !important;
//         }

//         @page {
//           size: A3;
//           margin: 15mm;
//         }
//       }
//     `,
//   });

//   await new Promise((r) => setTimeout(r, 2000));

//   await page.pdf({
//     path: pdfPath,
//     format: 'A3',
//     printBackground: true,
//     scale: 0.9,
//     preferCSSPageSize: true,
//     displayHeaderFooter: true,
//     headerTemplate: `<div></div>`,
//     footerTemplate: `
//       <div style="
//         width:100%;
//         font-size:12px;
//         padding-right:20px;
//         text-align:right;
//         color:#777;
//       ">
//         Page <span class="pageNumber"></span> of <span class="totalPages"></span>
//       </div>
//     `,
//   });

//   await browser.close();

//   console.log(`✅ PDF generated with TOC: ${pdfPath}`);
// })();

//with page number manual calculation

// (async () => {
//   const htmlPath = path.join(__dirname, 'public/index.html');
//   const pdfPath = path.join(__dirname, 'uploads', 'API-docs.pdf');

//   if (!fs.existsSync(htmlPath)) {
//     console.error('Docs not found at:', htmlPath);
//     process.exit(1);
//   }

//   fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

//   const html = fs.readFileSync(htmlPath, 'utf8');

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-dev-shm-usage'],
//   });

//   const page = await browser.newPage();

//   await page.setContent(html, { waitUntil: 'load' });

//   await page.addStyleTag({
//     path: path.join(__dirname, 'public/stylesheets/spectaql.min.css'),
//   });

//   // Layout & print fixes
//   await page.addStyleTag({
//     content: `
//       @media print {
//         .sidebar, nav {
//           position: static !important;
//           width: 100% !important;
//           max-width: 100% !important;
//           height: auto !important;
//           overflow: visible !important;
//         }

//         body, html {
//           overflow: visible !important;
//           width: 100% !important;
//         }

//         .layout, .main, .container, .content {
//           display: block !important;
//           width: 100% !important;
//           max-width: 100% !important;
//         }

//         .sidebar {
//           margin-bottom: 20px !important;
//         }

//         pre, code {
//           white-space: pre-wrap !important;
//           word-break: break-word !important;
//         }

//       table {
//         display: block;
//         overflow-x: auto;
//       }

//       h1, h2, h3 {
//         page-break-after: avoid;
//       }

//       @page {
//         size: A3;
//         margin: 15mm;
//       }
//     }
//     `,
//   });

//   // ============ BUILD TABLE OF CONTENTS ============
//   await page.evaluate(() => {
//     const headings = [...document.querySelectorAll('h1, h2, h3')];

//     const toc = document.createElement('div');
//     toc.id = 'table-of-contents';
//     toc.style.pageBreakAfter = 'always';
//     toc.innerHTML = `<h1>Table of Contents</h1>`;

//     const list = document.createElement('ul');
//     list.style.listStyle = 'none';

//     headings.forEach((h, i) => {
//       const id = `section-${i}`;
//       h.id = id;

//       const li = document.createElement('li');
//       li.style.display = 'flex';
//       li.style.justifyContent = 'space-between';
//       li.style.marginBottom = '6px';

//       if (h.tagName === 'H2') li.style.paddingLeft = '20px';
//       if (h.tagName === 'H3') li.style.paddingLeft = '40px';

//       li.innerHTML = `
//         <span><a href="#${id}">${h.innerText}</a></span>
//         <span class="toc-page">Page ...</span>
//       `;

//       list.appendChild(li);
//     });

//     toc.appendChild(list);
//     document.body.prepend(toc);
//   });

//   await new Promise((r) => setTimeout(r, 2000));

//   // ============ CALCULATE PAGE NUMBERS ============
//   const pageHeight = 1122; // A3 height approx
//   const pageNumbers = await page.evaluate((pageHeight) => {
//     const headings = [...document.querySelectorAll('h1, h2, h3')];

//     return headings.map((h) => {
//       const top = h.getBoundingClientRect().top + window.scrollY;
//       return Math.floor(top / pageHeight) + 1;
//     });
//   }, pageHeight);

//   // ============ INSERT PAGE NUMBERS INTO TOC ============
//   await page.evaluate((pages) => {
//     document.querySelectorAll('.toc-page').forEach((el, i) => {
//       el.innerText = `Page ${pages[i]}`;
//     });
//   }, pageNumbers);

//   await new Promise((r) => setTimeout(r, 2000));

//   // ============ PDF GENERATION ============
//   await page.pdf({
//     path: pdfPath,
//     format: 'A3',
//     printBackground: true,
//     scale: 0.9,
//     preferCSSPageSize: true,
//     displayHeaderFooter: true,
//     headerTemplate: `<div></div>`,
//     footerTemplate: `
//       <div style="
//         width:100%;
//         font-size:12px;
//         padding-right:20px;
//         text-align:right;
//         color:#777;
//       ">
//         Page <span class="pageNumber"></span> of <span class="totalPages"></span>
//       </div>
//     `,
//   });

//   await browser.close();
//   console.log(`✅ PDF Generated with TOC & Page Numbers: ${pdfPath}`);
// })();

// updated with page number auto calculation

// (async () => {
//   const htmlPath = path.join(__dirname, 'public/index.html');
//   const pdfPath = path.join(__dirname, 'uploads', 'API-docs.pdf');

//   if (!fs.existsSync(htmlPath)) {
//     console.error('Docs not found at:', htmlPath);
//     process.exit(1);
//   }

//   fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

//   const html = fs.readFileSync(htmlPath, 'utf8');

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-dev-shm-usage'],
//   });

//   const page = await browser.newPage();
//   page.setDefaultNavigationTimeout(0);

//   await page.setRequestInterception(true);

//   await page.goto(`file://${htmlPath}`, {
//     waitUntil: 'domcontentloaded',
//     timeout: 0,
//   });

//   //   await page.setContent(html, { waitUntil: 'load' });

//   await page.addStyleTag({
//     path: path.join(__dirname, 'public/stylesheets/spectaql.min.css'),
//   });

//   // Layout & print fixes
//   await page.addStyleTag({
//     content: `
//       @media print {
//         .sidebar, nav {
//           position: static !important;
//           width: 100% !important;
//           max-width: 100% !important;
//           height: auto !important;
//           overflow: visible !important;
//         }

//         body, html {
//           overflow: visible !important;
//           width: 100% !important;
//         }

//         .layout, .main, .container, .content {
//           display: block !important;
//           width: 100% !important;
//           max-width: 100% !important;
//         }

//         .sidebar {
//           margin-bottom: 20px !important;
//         }

//         pre, code {
//           white-space: pre-wrap !important;
//           word-break: break-word !important;
//         }

//         table {
//           page-break-inside: avoid;
// 	      /* display: block; */
//           /* overflow-x: auto; */
//         }

//         h1, h2, h3 {
//           page-break-after: avoid;
//         }

//         @page {
//           size: A3;
//           margin: 15mm;
//         }

//         /* TOC PAGE NUMBER MAGIC */
//         .toc-page::after {
//           content: target-counter(attr(href), page);
//           font-weight: bold;
//         }
//       }

//       #table-of-contents ul {
//         list-style: none;
//         padding-left: 0;
//       }

//       #table-of-contents li {
//         display: flex;
//         justify-content: space-between;
//         margin-bottom: 6px;
//       }

//       #table-of-contents a {
//         text-decoration: none;
//         color: black;
//       }
//     `,
//   });

//   // ============ BUILD TABLE OF CONTENTS ============
//   await page.evaluate(() => {
//     const headers = [...document.querySelectorAll('h1,h2,h3')];

//     const toc = document.createElement('div');
//     toc.id = 'table-of-contents';
//     toc.innerHTML = '<h1>Table of Contents</h1>';
//     toc.style.pageBreakAfter = 'always';

//     const list = document.createElement('ul');

//     headers.forEach((h, i) => {
//       const id = `section-${i}`;
//       h.id = id;

//       const li = document.createElement('li');
//       li.innerHTML = `<a href="#${id}">${h.textContent}</a><span class="toc-page"></span>`;
//       list.appendChild(li);
//     });

//     toc.appendChild(list);
//     document.body.prepend(toc);
//   });

//   await new Promise((r) => setTimeout(r, 2000));

//   // ============ PDF GENERATION ============
//   await page.pdf({
//     path: pdfPath,
//     format: 'A3',
//     printBackground: true,
//     scale: 0.9,
//     preferCSSPageSize: true,
//     displayHeaderFooter: true,
//     footerTemplate: `<div style="width:100%;text-align:right;font-size:12px;">
//       Page <span class="pageNumber"></span> / <span class="totalPages"></span>
//     </div>`,
//     margin: {
//       top: '15mm',
//       bottom: '20mm',
//     },
//   });

//   await browser.close();
//   console.log(`✅ PDF Generated with TOC & Page Numbers: ${pdfPath}`);
// })();

// (async () => {
//   const htmlPath = path.join(__dirname, 'public/index.html');
//   const pdfPath = path.join(__dirname, 'uploads/API-docs.pdf');

//   if (!fs.existsSync(htmlPath)) {
//     console.error('HTML not found');
//     process.exit(1);
//   }

//   fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-dev-shm-usage'],
//   });

//   const page = await browser.newPage();
//   page.setDefaultNavigationTimeout(0);

//   // ✅ LOAD DOC PROPERLY
//   await page.goto(`file://${htmlPath}`, {
//     waitUntil: 'domcontentloaded',
//     timeout: 0,
//   });

//   // ✅ LOAD CSS MANUALLY
//   await page.addStyleTag({
//     path: path.join(__dirname, 'public/stylesheets/spectaql.min.css'),
//   });

//   // ✅ PRINT LAYOUT + PAGE COUNT FIX
//   await page.addStyleTag({
//     content: `
//     @media print {
//       .sidebar, nav {
//         position: static !important;
//         width: 100% !important;
//       }

//       pre { white-space: pre-wrap }

//       .toc-page::after {
//         content: target-counter(attr(href), page);
//         font-weight: bold;
//       }

//       @page { size: A3; margin: 15mm; }
//     }

//     #table-of-contents li {
//       display: flex;
//       justify-content: space-between;
//     }
//     `,
//   });

//   // ✅ INSERT TABLE OF CONTENTS
//   await page.evaluate(() => {
//     const headers = [...document.querySelectorAll('h1,h2,h3')];

//     const toc = document.createElement('div');
//     toc.id = 'table-of-contents';
//     toc.innerHTML = '<h1>Table of Contents</h1>';
//     toc.style.pageBreakAfter = 'always';

//     const list = document.createElement('ul');

//     headers.forEach((h, i) => {
//       const id = `sec-${i}`;
//       h.id = id;
//       const li = document.createElement('li');
//       li.innerHTML = `<a href="#${id}">${h.innerText}</a><span class="toc-page"></span>`;
//       list.appendChild(li);
//     });

//     toc.appendChild(list);
//     document.body.prepend(toc);
//   });

//   await new Promise((r) => setTimeout(r, 2000));

//   // ✅ PDF EXPORT
//   await page.pdf({
//     path: pdfPath,
//     format: 'A3',
//     printBackground: true,
//     displayHeaderFooter: true,
//     footerTemplate: `
//       <div style="font-size:12px;text-align:right;width:100%">
//         Page <span class="pageNumber"></span> / <span class="totalPages"></span>
//       </div>
//     `,
//     margin: { top: '15mm', bottom: '20mm' },
//     preferCSSPageSize: true,
//   });

//   await browser.close();

//   console.log('✅ PDF GENERATED WITH TOC & PAGINATION');
// })();
