// import { Injectable } from '@nestjs/common';
// import * as pdfMake from 'pdfmake/build/pdfmake';
// import * as pdfFonts from 'pdfmake/build/vfs_fonts';
// import { PDFDocument, rgb, PDFDict, PDFName, PDFArray } from 'pdf-lib';
// import { readFile, writeFile } from 'fs/promises';
// import { createSign } from 'crypto';
// import { readFileSync, writeFileSync } from 'fs';
// // import { SignPdf } from 'node-signpdf';
// import sign from '@signpdf/signpdf';
// import signer from 'node-signpdf';
// import { baseImage } from './constant';
// var fs = require('fs');
// var path = require('path');
// // import plainAddPlaceholder from '@signpdf/placeholder-plain'
// var plainAddPlaceholder =
//   require('@signpdf/placeholder-plain').plainAddPlaceholder;
// var { SignPdf } = require('node-signpdf');
// var signpdf = require('@signpdf/signpdf').default;
// var forge = require('node-forge');
// var P12Signer = require('@signpdf/signer-p12').P12Signer;

// var fonts = {
//   Courier: {
//     normal: 'Courier',
//     bold: 'Courier-Bold',
//     italics: 'Courier-Oblique',
//     bolditalics: 'Courier-BoldOblique',
//   },
//   Helvetica: {
//     normal: 'Helvetica',
//     bold: 'Helvetica-Bold',
//     italics: 'Helvetica-Oblique',
//     bolditalics: 'Helvetica-BoldOblique',
//   },
//   Times: {
//     normal: 'Times-Roman',
//     bold: 'Times-Bold',
//     italics: 'Times-Italic',
//     bolditalics: 'Times-BoldItalic',
//   },
//   Symbol: {
//     normal: 'Symbol',
//   },
//   ZapfDingbats: {
//     normal: 'ZapfDingbats',
//   },
// };

// @Injectable()
// export class PdfService {
//   async generatePdf() {
//     var PdfPrinter = require('pdfmake');
//     var printer = new PdfPrinter(fonts);
//     var fs = require('fs');

//     var inputBox = [],
//       widthArray = [],
//       heightArray = [],
//       boxLength = 22; // Define the length of each input box here
//     var name = 'AYESWARIYAAYESWARIYAAYESWARIYAAYESWARIYA';
//     var chunkSize = 22;

//     // Divide the name into chunks
//     var chunks = name.match(new RegExp('.{1,' + chunkSize + '}', 'g'));

//     // Process each chunk
//     chunks.forEach((chunk) => {
//       var chunkWidths = [],
//         chunkHeights = [];
//       var chunkInputBox = [];

//       // Split the chunk into individual characters
//       chunk.split('').forEach((char) => {
//         chunkInputBox.push({
//           stack: [
//             {
//               text: char,
//               margin: [0, 3, 0, 0],
//               alignment: 'center',
//               fontSize: 14,
//             },
//           ],
//         });
//         chunkWidths.push(15); // Set width for each character box
//         chunkHeights.push(12); // Set height for each character box
//       });

//       // Pad the chunk with empty characters to ensure it has a length of 22
//       for (let i = chunkInputBox.length; i < boxLength; i++) {
//         chunkInputBox.push({
//           stack: [
//             {
//               text: '',
//               margin: [0, 3, 0, 0],
//               alignment: 'center',
//               fontSize: 14,
//             },
//           ],
//         });
//         chunkWidths.push(15); // Set width for each empty character box
//         chunkHeights.push(12); // Set height for each empty character box
//       }

//       inputBox.push(chunkInputBox);
//       widthArray.push(chunkWidths);
//       heightArray.push(chunkHeights);
//     });

//     // Ensure there are 3 rows
//     while (inputBox.length < 3) {
//       var emptyRow = [];
//       var emptyWidths = [];
//       var emptyHeights = [];

//       // Add empty boxes to fill the row
//       for (let i = 0; i < boxLength; i++) {
//         emptyRow.push({
//           stack: [
//             {
//               text: '',
//               margin: [0, 0, 0, 0],
//               alignment: 'center',
//               fontSize: 14,
//             },
//           ],
//         });
//         emptyWidths.push(15); // Set width for each empty character box
//         emptyHeights.push(15); // Set height for each empty character box
//       }
//       inputBox.push(emptyRow);
//       widthArray.push(emptyWidths);
//       heightArray.push(emptyHeights);
//     }

//     // Define the document content
//     var documentDefinition: any = {
//       content: [
//         {
//           alignment: 'justify',
//           columns: [
//             {
//               image: baseImage,
//               // 'assets/queensland-building-and-construction-commission-qbcc-logo-vector.png',
//               width: 204,
//               height: 63,
//               margin: [0, 0, 0, 4],
//             },
//             { text: 'NOTIFICATION FORM', style: 'rightHeader' },
//           ],
//         },
//         {
//           canvas: [
//             {
//               type: 'line',
//               x1: 3,
//               y1: 7,
//               x2: 544,
//               y2: 7,
//               lineWidth: 1,
//               color: '#5E5F61',
//             },
//           ],
//         },
//         { text: 'TRUST ACCOUNTS', style: 'title' },
//         {
//           text: 'FORM TA1 - NOTICE OF OPENING A PROJECT TRUST ACCOUNT',
//           style: 'subTitle1',
//         },
//         { text: 'AND/OR RETENTION TRUST ACCOUNT', style: 'subTitle2' },
//         //  { text: 'Digital Signature Placeholder:', style: 'signaturePlaceholder' },
//         // { text: 'Hello, April!', style: { font: 'Courier' } },
//         // {
//         //   image:
//         //     'assets/queensland-building-and-construction-commission-qbcc-logo-vector.png', // Path to your pentagon-shaped image
//         //   width: 200, // Adjust width as needed
//         //   height: 200, // Adjust height as needed
//         //   absolutePosition: { x: 100, y: 100 }, // Adjust position as needed
//         // },
//         // {
//         //   text: 'Your text here',
//         //   fontSize: 14,
//         //   color: 'black',
//         //   absolutePosition: { x: 150, y: 150 }, // Adjust position to overlay text on the image
//         // },
//         // { text: '', pageBreak: 'before' },
//         { text: '', pageBreak: 'before' },
//       ],

//       styles: {
//         rightHeader: {
//           width: '*',
//           margin: [90, 20, 0, 10], // [left, top, right, bottom]
//           fontSize: 24,
//           color: '#0090B9',
//           //   font: 'Times',
//         },
//         title: {
//           width: '*',
//           margin: [4, 18, 0, 10], // [left, top, right, bottom]
//           fontSize: 24,
//           color: '#545759',
//           //   font: 'Times',
//         },
//         subTitle1: {
//           width: '*',
//           margin: [4, 4, 0, 10], // [left, top, right, bottom]
//           fontSize: 14,
//           color: '#545759',
//           //   font: 'Times',
//         },
//         subTitle2: {
//           width: '*',
//           margin: [4, -6, 0, 10], // [left, top, right, bottom]
//           fontSize: 14,
//           color: '#545759',
//           //   font: 'Times',
//         },
//         signaturePlaceholder: {
//           margin: [0, 10, 0, 0], // [left, top, right, bottom]
//         },
//       },
//       defaultStyle: {
//         //font: 'Helvetica', // setting default font for the entire document
//         columnGap: 20,
//       },
//       footer: function (currentPage, pageCount) {
//         if (currentPage === 1) {
//           var table = {
//             table: {
//               heights: [8], // Set the height of each row in the table
//               widths: [75, 125, '*', 70],
//               body: [
//                 [
//                   { text: '', fillColor: 'red' },
//                   { text: '', fillColor: 'green' },
//                   { text: '', fillColor: 'blue' },
//                   { text: '', fillColor: 'yellow' },
//                 ],
//               ],
//             },
//             layout: {
//               defaultBorder: false, // Remove table borders
//             }, // Center-align the table within the footer
//             margin: [0, 11, 0, 0], // Set margins for the table
//           };
//           return table;
//         } else {
//           return {
//             text: 'Page ' + currentPage + ' of ' + pageCount,
//             alignment: 'right',
//             margin: [0, -11, 25, 0], // Adjust the right margin here
//           };
//         } // Return the table directly
//       },
//       pageMargins: [25, 25, 25, 25], // [left, top, right, bottom]
//     };

//     // Add rows and cells to the table
//     inputBox.forEach((chunkInputBox, index) => {
//       documentDefinition.content.push([
//         {
//           table: {
//             widths: widthArray[index],
//             heights: heightArray[index],
//             alignment: 'center',
//             body: [chunkInputBox],
//             layout: {
//               fillColor: function (rowIndex, node, columnIndex) {
//                 return rowIndex % 2 === 0 ? '#CCCCCC' : null;
//               },
//             },
//           },
//         },
//         { text: '\n', margin: [0, -8, 0, 0] },
//       ]);
//     });

//     // var pdfDocGenerator = printer.createPdfKitDocument(documentDefinition);
//     // pdfDocGenerator.pipe(fs.createWriteStream('document.pdf'));
//     // pdfDocGenerator.end();

//     // const pdfBytes = await readFile('document.pdf');

//     const pdfchunks: Uint8Array[] = [];

//     const pdfDocGenerator = printer.createPdfKitDocument(documentDefinition);
//     pdfDocGenerator.on('data', (pdfchunk: Uint8Array) => {
//       pdfchunks.push(pdfchunk);
//     });

//     pdfDocGenerator.on('end', async () => {
//       const pdfBytes = Buffer.concat(pdfchunks);
//       // Now you can use pdfBytes as needed
//       // For example, sign the PDF or embed a signature
//       const privateKeyPath = 'assets/private-key.pem'; // Path to your private key
//       const privateKeyPassword = 'paytrade'; // Password for private key

//       var certificatePath = 'assets/certificate.p12';
//       var certificateBuffer = fs.readFileSync(certificatePath);

//       // Load PKCS#12 file
//       var p12Asn1 = forge.asn1.fromDer(
//         Buffer.from(certificateBuffer).toString('binary'),
//       );
//       console.log('p12Asn1: ', p12Asn1);
//       var p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, privateKeyPassword);
//       console.log('p12: ', p12);
//       // Get private key and certificate
//       var privateKeyBag = p12.getBags({
//         bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
//       })[forge.pki.oids.pkcs8ShroudedKeyBag][0];
//       console.log('privateKeyBag: ', privateKeyBag);
//       var certificateBag = p12.getBags({ bagType: forge.pki.oids.certBag })[
//         forge.pki.oids.certBag
//       ][0];
//       console.log('certificateBag: ', certificateBag);
//       // Create signer object
//       var signer = {
//         key: forge.pki.privateKeyToPem(privateKeyBag.key),
//         cert: forge.pki.certificateToPem(certificateBag.cert),
//       };
//       console.log('signer: ', signer);
//       // The PDF needs to have a placeholder for a signature to be signed.
//       var pdfWithPlaceholder = plainAddPlaceholder({
//         pdfBuffer: pdfBytes,
//         reason: 'The user is declaring consent through JavaScript.',
//         contactInfo: 'signpdf@example.com',
//         name: 'John Doe',
//         location: 'Free Text Str., Free World',
//       });
//       console.log('pdfWithPlaceholder: ', pdfWithPlaceholder);
//       // Sign the PDF
//       try {
//         const pdfSigner = new SignPdf();
//         // const signedPdf = pdfSigner.sign(
//         //   pdfWithPlaceholder,
//         //   signer.key,
//         //   signer.cert,
//         // );
//         const signedPdf = pdfSigner.sign(
//           pdfWithPlaceholder,
//           certificateBuffer, // Pass the certificateBuffer directly
//           privateKeyPassword, // Use the private key password
//         );
//         console.log('signedPdf: ', signedPdf);
//         // signedPdf is a Buffer of an electronically signed PDF. Store it.
//         var targetPath = 'assets/signedpdf.pdf';
//         fs.writeFileSync(targetPath, signedPdf);
//       } catch (error) {
//         console.error('Error signing PDF:', error);
//       }
//     });
//     // pdfDocGenerator.on('end', async () => {
//     //   const pdfBytes = Buffer.concat(pdfchunks);
//     //   // Now you can use pdfBytes as needed
//     //   // For example, sign the PDF or embed a signature
//     //   const privateKeyPath = 'assets/private-key.pem'; // Path to your private key
//     //   const privateKeyPassword = 'paytrade'; // Password for private key
//     //   const signature = await this.signPdf(
//     //     pdfBytes,
//     //     privateKeyPath,
//     //     privateKeyPassword,
//     //   );
//     //   const signedPdfBytes = await this.embedSignature(pdfBytes, signature);
//     //   const response = await writeFile('signed-document.pdf', signedPdfBytes);
//     //   console.log('response: ', signedPdfBytes);
//     // });
//     // pdfDocGenerator.on('end', async () => {
//     //   const pdfBytes = Buffer.concat(pdfchunks);
//     //   const signature = 'Ayeswariya'; // Signature text

//     //   try {
//     //     const signedPdfBytes = await this.addSignatureToPdf(
//     //       pdfBytes,
//     //       signature,
//     //     );
//     //     console.log('signedPdfBytes: ', signedPdfBytes);
//     //     const response = await writeFile('signed-document.pdf', signedPdfBytes);
//     //   } catch (error) {
//     //     console.error('Error adding signature to PDF:', error);
//     //   }
//     // });

//     pdfDocGenerator.end();

//     // Create the PDF document
//     // const pdfDocGenerator = pdfMake.createPdf(documentDefinition);

//     // Return the PDF as a buffer
//     // return new Promise<Buffer>((resolve, reject) => {
//     //   pdfDocGenerator.getBuffer((buffer: any) => {
//     //     const pdfBuffer = Buffer.from(buffer);
//     //     resolve(pdfBuffer);
//     //   });
//     // });
//   }

//   // async signPdf(
//   //   pdfBytes: Uint8Array,
//   //   privateKeyPath: string,
//   //   privateKeyPassword: string,
//   // ): Promise<Uint8Array> {
//   //   const privateKeyContent = await readFile(privateKeyPath, {
//   //     encoding: 'utf8',
//   //   });
//   //   const signer = createSign('RSA-SHA256');
//   //   signer.update(pdfBytes);
//   //   const signature = signer.sign({
//   //     key: privateKeyContent,
//   //     passphrase: privateKeyPassword,
//   //   });
//   //   console.log('signature: ', signature);
//   //   return signature;
//   // }

//   // async embedSignature(
//   //   pdfBytes: Uint8Array,
//   //   signature: Uint8Array,
//   // ): Promise<Uint8Array> {
//   //   const pdfDoc = await PDFDocument.load(pdfBytes);
//   //   const pages = pdfDoc.getPages();
//   //   console.log('pages: ', pages);
//   //   const firstPage = pages[0];

//   //   // Define the coordinates for the signature field
//   //   const signatureX = 100; // X-coordinate of the signature field
//   //   const signatureY = 100; // Y-coordinate of the signature field
//   //   const signatureWidth = 200; // Width of the signature field
//   //   const signatureHeight = 50; // Height of the signature field

//   //   const signatureAnnotation = pdfDoc.context.obj({
//   //     Type: 'Annot',
//   //     Subtype: 'Widget',
//   //     FT: 'Sig', // Field Type indicating this is a signature field
//   //     Rect: [
//   //       100, 100, 300, 150,
//   //       // signatureX,
//   //       // signatureY,
//   //       // signatureX + signatureWidth,
//   //       // signatureY + signatureHeight,
//   //     ],
//   //     F: 4, // Flags indicating the signature field is visible
//   //     P: firstPage.ref, // Reference to the page containing the signature field
//   //     V: {
//   //       Type: 'Sig',
//   //       Filter: 'Adobe.PPKLite', // Filter indicating the signature is Adobe PPKLite
//   //       SubFilter: 'adbe.pkcs7.detached', // Subfilter indicating PKCS#7 detached signature
//   //       ByteRange: [0, 0, 0, 0], // ByteRange placeholder
//   //       Contents: signature, // Actual signature bytes
//   //     },
//   //   });
//   //   console.log('signatureAnnotation: ', signatureAnnotation);

//   //   let annotations = firstPage.node.get(PDFName.of('Annots')) as
//   //     | PDFArray
//   //     | undefined;
//   //   console.log('annotations: ', annotations);
//   //   // If the annotations array doesn't exist, create a new one
//   //   if (!annotations) {
//   //     annotations = pdfDoc.context.obj([]);
//   //     firstPage.node.set(PDFName.of('Annots'), annotations);
//   //   }
//   //   console.log('annotations1: ', annotations);
//   //   // Add the signature widget annotation to the annotations array
//   //   annotations.push(signatureAnnotation);
//   //   console.log('annotations2: ', annotations);
//   //   // Serialize the PDF
//   //   return pdfDoc.save();
//   // }

//   // async addSignatureToPdf(
//   //   pdfBytes: Buffer,
//   //   signature: string,
//   // ): Promise<Buffer> {
//   //   try {
//   //     // Read the p12 certificate file as a Buffer

//   //     const signedPdf = signer.sign(
//   //       pdfBytes,
//   //       readFileSync('assets/certificate.p12'),
//   //     );
//   //     const p12Buffer = readFileSync('assets/certificate.p12');
//   //     const signatureOptions = {
//   //       p12: p12Buffer,
//   //       passphrase: 'paytrade', // If the p12 file is password protected
//   //       reason: 'I am the author of this document',
//   //       location: 'New York, USA',
//   //       contactInfo: 'john.doe@example.com',
//   //       signatureLength: 8192,
//   //       signatureCoordinates: {
//   //         left: 50,
//   //         bottom: 50,
//   //         right: 250,
//   //         top: 150,
//   //       },
//   //     };

//   //     const signedPdfBuffer = sign(pdfBytes, signature, signatureOptions);

//   //     // If you need to embed the signature text into the PDF
//   //     const pdfDoc = await PDFDocument.load(signedPdfBuffer);
//   //     const firstPage = pdfDoc.getPages()[0];
//   //     const { width, height } = firstPage.getSize();
//   //     const fontSize = 12;

//   //     firstPage.drawText(signature, {
//   //       x: width / 2 - (signature.length * fontSize) / 4,
//   //       y: height / 2,
//   //       size: fontSize,
//   //       font: await pdfDoc.embedFont('Helvetica'),
//   //       color: rgb(0, 0, 0), // Black color
//   //     });

//   //     const modifiedPdfBuffer = await pdfDoc.save();

//   //     return modifiedPdfBuffer;
//   //   } catch (error) {
//   //     console.error('Error adding signature to PDF:', error);
//   //     throw error;
//   //   }

//   // }
// }
