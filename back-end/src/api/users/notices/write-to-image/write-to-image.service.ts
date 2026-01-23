import { Injectable, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import { exec } from 'child_process';
const fs = require('fs');
import { NoticeTypes } from 'src/libs/@paytrade-types/paytrade-types';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class ImageService {
  private logger: PaytradeLogger;

  constructor() {
    this.logger = new PaytradeLogger('IMAGE_SERVICE');
  }

  async runJsScript(
    notice_type: NoticeTypes,
    data: any,
    outputFilePath: string,
  ): Promise<string> {
    this.logger.log(`notice_type in qbcc: ${notice_type}`);

    // Write the data to a temporary JSON file
    try {
      fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
      this.logger.log('JSON file has been written successfully.');
    } catch (err) {
      this.logger.error(`Error writing data.json file: ${err}`);
      throw new Error('Failed to write data.json file.');
    }

    const jsFilePath = path.resolve(
      process.cwd(),
      'src/api/users/notices/write-to-image/write-to-image.mjs',
    );

    // Wrap the exec call in a Promise
    return new Promise((resolve, reject) => {
      exec(
        `node ${jsFilePath} "${notice_type}" ./data.json "${outputFilePath}"`,
        (error, stdout, stderr) => {
          if (error) {
            this.logger.error(`Error executing JavaScript file: ${error}`);
            // Delete the file after writing
            fs.unlink('data.json', (unlinkErr) => {
              if (unlinkErr) {
                this.logger.error(`Error deleting file: ${unlinkErr}`);
              } else {
                this.logger.log('File has been deleted successfully.');
              }
            });
            return reject(new Error(error.message));
          }
          if (stderr) {
            this.logger.error(`JavaScript file error output: ${stderr}`);
            // Delete the file after writing
            fs.unlink('data.json', (unlinkErr) => {
              if (unlinkErr) {
                this.logger.error(`Error deleting file: ${unlinkErr}`);
              } else {
                this.logger.log('File has been deleted successfully.');
              }
            });
            return reject(new Error(stderr));
          }
          this.logger.log(`JavaScript file output: ${stdout}`);
          return resolve(stdout.trim()); //Return the script's output as the success message
        },
      );
    });
  }
}
