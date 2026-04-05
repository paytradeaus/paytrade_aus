import { Jimp, loadFont } from 'jimp';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import {
  SANS_64_BLACK,
  SANS_32_BLACK,
  SANS_16_BLACK,
  SANS_14_BLACK,
  SANS_12_BLACK,
} from 'jimp/fonts';
import { ta1_coordinates } from '../coordinates/qbcc-ta1.coordinates.mjs';
import { ta2_coordinates } from '../coordinates/qbcc-ta2.coordinates.mjs';
import { ta3_coordinates } from '../coordinates/qbcc-ta3.coordinates.mjs';
import { ta4_coordinates } from '../coordinates/qbcc-ta4.coordinates.mjs';
import { ta5_coordinates } from '../coordinates/qbcc-ta5.coordinates.mjs';

// Main async function to encapsulate the code and ensure synchronous execution
async function main(notice_type, data, outputFilePath) {
  return new Promise(async (resolve, reject) => {
    try {
      let inputFolder, pdfCoordinates;
      switch (notice_type) {
        case 'QBCC TA1 Project Trust Account Notice':
          {
            inputFolder =
              'assets/notices/QBCC TA1 Project Trust Account notice';
            pdfCoordinates = ta1_coordinates;
          }
          break;
        case 'QBCC TA1 Retention Trust Account Notice':
          {
            inputFolder =
              'assets/notices/QBCC TA1 Retention Trust Account notice';
            pdfCoordinates = ta1_coordinates;
          }
          break;
        case 'QBCC TA2 Account Closing Notice':
          {
            inputFolder = 'assets/notices/QBCC TA2 Account Closing notice';
            pdfCoordinates = ta2_coordinates;
          }
          break;
        case 'QBCC TA2 Retention Account Closing Notice':
          {
            inputFolder =
              'assets/notices/QBCC TA2 Retention Account Closing notice';
            pdfCoordinates = ta2_coordinates;
          }
          break;
        case 'QBCC TA3 Notice Of Related Entities':
          {
            inputFolder = 'assets/notices/QBCC TA3 Notice Of Related Entities';
            pdfCoordinates = ta3_coordinates;
          }
          break;
        case 'QBCC TA4 Part Payment Notice':
          {
            inputFolder = 'assets/notices/QBCC TA4 Part Payment notice';
            pdfCoordinates = ta4_coordinates;
          }
          break;
        case 'QBCC TA5 Nil Return Notice':
          {
            inputFolder = 'assets/notices/QBCC TA5 nill return notice';
            pdfCoordinates = ta5_coordinates;
          }
          break;
        default:
          // console.log('This Notice type is not defined for QBCC.');
          return reject('This Notice type is not defined for QBCC.');
      }
      // console.log('Running script with input folder: ', inputFolder);
      // console.log('Output PDF path: ', outputFilePath);
      if (!inputFolder || !outputFilePath || !pdfCoordinates) {
        return reject('Required inputs are missing.');
      }

      const inputDir = path.resolve(process.cwd(), inputFolder);
      const outputPDFPath = path.resolve(process.cwd(), outputFilePath);

      // const noticeData = JSON.parse(data); // Parse JSON string to object
      const noticeData = JSON.parse(fs.readFileSync(data, 'utf-8'));
      // console.log('Notice data received: ', noticeData);
      // Ensure output directory exists
      const outputDir = path.dirname(outputPDFPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Load fonts and images synchronously
      const font32 = await loadFont(SANS_32_BLACK);
      // const font16 = await loadFont(SANS_16_BLACK);

      // const font16 = await loadFont('assets/opensans24.ttf.fnt');
      // const font16 = await loadFont('assets/font/Sans24Lig/openSans24Light.fnt');
      const font16 = await loadFont('assets/font/Sans32Lig/sans32Lig.fnt');
      const tickImg = await Jimp.read('assets/notices/small_tick.png');

      // A4 page size in pixels (at 72 DPI)
      const A4_WIDTH = 595.276; // 210mm in px
      const A4_HEIGHT = 841.89; // 297mm in px

      // Create a new PDF document using pdf-lib
      const pdfDoc = await PDFDocument.create();

      // Process each image in the input directory
      const imageFiles = fs
        .readdirSync(inputDir)
        .filter((file) => path.extname(file).toLowerCase() === '.jpg');

      if (imageFiles.length === 0) {
        // console.log(`No .jpg files found in the input folder: ${inputDir}`);
        return reject(`No .jpg files found in the input folder: ${inputDir}`);
      }

      for (const [index, file] of imageFiles.entries()) {
        const filePath = path.join(inputDir, file);

        try {
          // Load image using Jimp
          const image = await Jimp.read(filePath);
          const coordinates = pdfCoordinates.pages[index]?.coordinates;
          // Apply text and images to the current page if coordinates exist
          if (!noticeData || Object.keys(noticeData).length === 0) {
            console.warn('No data found for this notice.');
            return reject(`No data found for this notice.`);
          }
          if (coordinates) {
            await applyTextToImage(
              image,
              coordinates,
              noticeData,
              // font32,
              font16,
              tickImg,
            );
            // console.log(`Processed file ${file} with text overlay`);
          } else {
            // console.log(
            //   `No coordinates for page ${index + 1}. Including the page without text overlay.`,
            // );
          }

          // Convert image to buffer (Jimp to JPEG)
          const imageBuffer = await image.getBuffer('image/jpeg');

          // Embed the image into the PDF document
          const pdfImage = await pdfDoc.embedJpg(imageBuffer);

          // Create a page with A4 size
          const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

          // Draw the image on the A4 page, scaled to fit the page
          const imageWidth = Math.min(A4_WIDTH, pdfImage.width);
          const imageHeight = Math.min(A4_HEIGHT, pdfImage.height);

          page.drawImage(pdfImage, {
            x: (A4_WIDTH - imageWidth) / 2, // Center the image horizontally
            y: (A4_HEIGHT - imageHeight) / 2, // Center the image vertically
            width: imageWidth,
            height: imageHeight,
          });

          // console.log(`Processed and added to PDF`);
        } catch (error) {
          // console.error(`Error processing file ${filePath}: ${error.message}`);
          return reject(`Error processing file ${filePath}: ${error.message}`);
        }
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPDFPath, pdfBytes);

      // Delete the file after writing
      fs.unlink('data.json', (unlinkErr) => {
        if (unlinkErr) {
          // console.error('Error deleting file:', unlinkErr);
        } else {
          // console.log('File has been deleted successfully.');
        }
      });

      // console.log(`PDF created successfully at ${outputPDFPath}`);
      return resolve(true);
    } catch (error) {
      // console.error('An error occurred:', error.message);
      return reject(`An error occurred: ${error.message}`);
    }
  });
}

// Function to add text to image based on coordinates
async function setValueToImage(value, co, image, font) {
  if (co) {
    for (let i = 0; i < co.length; i++) {
      await image.print({
        ...co[i],
        font: font,
        text: value[i]?.toUpperCase() || '',
      });
    }
  }
}

// Function to split text into paragraphs that fit within a maximum length
// async function splitTextWithParagraphs(text, maxLength) {
//   const MAX_LINE_LENGTH = 60;
//   let result = [];
//   let paragraphs = text.split('\n');
//   let currentLength = 0;

//   paragraphs.forEach((paragraph) => {
//     let currentPart = '';
//     let words = paragraph.split(' ');
//     for (let word of words) {
//       if ((currentPart + ' ' + word).trim().length > MAX_LINE_LENGTH) {
//         result.push(currentPart.trim());
//         currentPart = word;

//         if (currentLength >= maxLength) {
//           return result;
//         }
//       }
//       else {
//         currentPart += ' ' + word;
//       }
//       if (result.join(' ').length + currentPart.trim().length > maxLength) {
//         if (currentPart.trim()) {
//           result.push(currentPart.trim());
//         }
//         result.push(''); // Separate paragraphs
//         currentPart = '';
//       }
//     }
//     if (currentPart.trim()) {
//       result.push(currentPart.trim());
//     }
//     result.push('');
//   });
//   return result.filter((part) => part.length > 0);
// }

async function splitTextWithParagraphs(text, maxLength) {
  const MAX_LINE_LENGTH = 65;
  let result = [];
  let paragraphs = text.split('\n');
  let currentLength = 0;

  for (let paragraph of paragraphs) {
    let currentPart = '';
    let words = paragraph.split(' ');

    for (let word of words) {
      if ((currentPart + ' ' + word).trim().length > MAX_LINE_LENGTH) {
        result.push(currentPart.trim());
        currentLength += currentPart.trim().length;
        currentPart = word;

        // Stop if maxLength is reached
        if (currentLength >= maxLength) return result;
      } else {
        currentPart += ' ' + word;
      }

      if (currentLength + currentPart.trim().length > maxLength) {
        if (currentPart.trim()) {
          result.push(currentPart.trim());
          currentLength += currentPart.trim().length;
        }
        result.push('');
        currentLength++; // Account for the paragraph separator

        // Stop if maxLength is reached
        if (currentLength >= maxLength) return result;

        currentPart = '';
      }
    }

    if (currentPart.trim()) {
      result.push(currentPart.trim());
      currentLength += currentPart.trim().length;

      // Stop if maxLength is reached
      if (currentLength >= maxLength) return result;
    }

    result.push('');
    currentLength++; // Account for the paragraph separator

    // Stop if maxLength is reached
    if (currentLength >= maxLength) return result;
  }

  return result.filter((part) => part.length > 0);
}

async function getSignatureBuffer(base64String) {
  // Remove the Base64 prefix if it exists
  const base64Data = base64String.replace(/^data:image\/png;base64,/, '');

  // Convert the Base64 string into a Buffer
  return Buffer.from(base64Data, 'base64');
}

// Function to apply all text fields to the image in one call
async function applyTextToImage(
  image,
  coordinates,
  noticeData,
  // font32,
  font16,
  tickImg,
) {
  if (!coordinates || Object.keys(coordinates).length === 0) {
    console.warn('No coordinates found for this page. Skipping.');
    return;
  }

  for (const [key, coord] of Object.entries(coordinates)) {
    // Check if the key exists in noticeData and its value is not empty
    if (key in noticeData && noticeData[key]) {
      switch (key) {
        case 'haveNoContractSiteAddress':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'haveMultipleProjects':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'declarationCheckbox1':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'declarationCheckbox2':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'declarationCheckbox3':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'declarationCheckbox4':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'declarationCheckbox5':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'declarationCheckbox6':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'contractedCheckBox':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'contractingCheckBox':
          if (coord?.x && coord?.y) {
            await image.composite(tickImg, coord.x, coord.y);
          }
          break;

        case 'signature':
          if (coord?.x && coord?.y) {
            const imageBuffer = await getSignatureBuffer(noticeData[key]);
            const signature = await Jimp.read(imageBuffer);
            await image.composite(signature, coord.x, coord.y);
          }
          break;

        case 'projectDescription':
          const splitData = await splitTextWithParagraphs(noticeData[key], 230);
          await setValueToImage(splitData, coord, image, font16);
          break;

        case 'ta5_trusteeName':
          const trusteeName = await splitTextWithParagraphs(
            noticeData[key],
            60,
          );
          await setValueToImage(trusteeName, coord, image, font16);
          break;

        case 'ta5_trusteeBusinessAddress':
          const trusteeBusiness = await splitTextWithParagraphs(
            noticeData[key],
            60,
          );
          await setValueToImage(trusteeBusiness, coord, image, font16);
          break;

        case 'ta5_trusteeSubUrb':
          const trusteeSub = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(trusteeSub, coord, image, font16);
          break;

        case 'ta5_trusteeState':
          const trusteeState = await splitTextWithParagraphs(
            noticeData[key],
            60,
          );
          await setValueToImage(trusteeState, coord, image, font16);
          break;

        case 'ta5_trusteePhone':
          const trusteePh = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(trusteePh, coord, image, font16);
          break;

        case 'ta5_trusteeEmail':
          const trusteemail = await splitTextWithParagraphs(
            noticeData[key],
            60,
          );
          await setValueToImage(trusteemail, coord, image, font16);
          break;

        case 'ta5_rtnAccountName':
          const trusteertn = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(trusteertn, coord, image, font16);
          break;

        case 'ta5_rtnFinancialInstituitionName':
          const trusteeFinins = await splitTextWithParagraphs(
            noticeData[key],
            60,
          );
          await setValueToImage(trusteeFinins, coord, image, font16);
          break;
        case 'ta5_trusteeBsb':
          const trusteebsb = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(trusteebsb, coord, image, font16);
          break;
        case 'ta5_trusteeAccountNumber':
          const trusteeaccno = await splitTextWithParagraphs(
            noticeData[key],
            60,
          );
          await setValueToImage(trusteeaccno, coord, image, font16);
          break;
        case 'ta5_declarationName':
          const decname = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(decname, coord, image, font16);
          break;
        case 'ta5_declarationPosition':
          const decposi = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(decposi, coord, image, font16);
          break;
        case 'ta5_onBehalfOfName':
          const onbehf = await splitTextWithParagraphs(noticeData[key], 60);
          await setValueToImage(onbehf, coord, image, font16);
          break;
        default:
          await setValueToImage(noticeData[key], coord, image, font16);
          break;
      }
    }
  }
}

// Invoke main function
main(process.argv[2], process.argv[3], process.argv[4])
  .then((data) => {
    // Explicitly output the result to stdout
    console.log(data);
  })
  .catch((error) => {
    // Explicitly output the error to stderr
    console.error(error.message);
    // Exit with non-zero status to indicate failure
    process.exit(1);
  });
