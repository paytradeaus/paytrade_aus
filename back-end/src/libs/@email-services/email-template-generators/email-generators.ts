import { IEmailDetails } from 'src/api/admin/communication-management/response/interfaces/emails.interfaces';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

export class EmailGenerator {
  private logger: PaytradeLogger;
  constructor() {
    this.logger = new PaytradeLogger('EMAIL_GENERATOR');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }
  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async systemEmailByAdminGenerator(emailDetails: IEmailDetails) {
    try {
      this.logger.log(
        `Request received for generating a system email with data: ${emailDetails}`,
      );

      const template = `
              <html lang='en'>
                  <head>
                      <meta charset='UTF-8' />
                      <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                      <title>Hello !</title>
                      <style>
                          body {
                              font-family: Arial, sans-serif;
                              margin: 0;
                              padding: 20px;
                              background-color: #f5f5f5;
                          }
                      </style>
                  </head>
                  <body>
                <table style="margin:0 auto;border:3px solid #121b96;" width="600" cellspacing="0" cellpadding="0" border="0"
                    bgcolor="#ffffff" align="center">
                    <tbody>
                      <-- Table content -->
                    </tbody>
                </table>
              </body>
              </html>
          `;

      // Replace the content with the body
      const replacedTemplate = template.replace(
        '<-- Table content -->',
        emailDetails.body,
      );
      return replacedTemplate;
    } catch (error) {
      this.logger.error(
        `Errored while generating a system email with message: ${error}`,
      );
      throw `Errored while generating a system email with message: ${error}`;
    }
  }

  async generateAcknowledgementEmailToContact(body: string) {
    try {
      this.logger.log(
        `Request received for generating an acknowledgement email with body: ${body}`,
      );

      const template = `
                <html lang='en'>
                    <head>
                        <meta charset='UTF-8' />
                        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                        <title>Welcome to Pay-trade !</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background-color: #f5f5f5;
                            }
                        </style>
                    </head>
                    <body>
                  <table style="margin:0 auto;border:3px solid #121b96;" width="600" cellspacing="0" cellpadding="0" border="0"
                      bgcolor="#ffffff" align="center">
                      <tbody>
                          <-- Table content -->
                      </tbody>
                  </table>
                </body>
                </html>
            `;

      // Replace the content with the body
      const replacedTemplate = template.replace('<-- Table content -->', body);
      return replacedTemplate;
    } catch (error) {
      this.logger.error(
        `Errored while generating an acknowledgement email with message: ${error}`,
      );
      throw `Errored while generating an acknowledgement email with message: ${error}`;
    }
  }

  async notificationEmailToAdminOnContactSubmission(body: string) {
    try {
      this.logger.log(
        `Request received for generating an acknowledgement email with body: ${body}`,
      );

      const template = `
                <html lang='en'>
                    <head>
                        <meta charset='UTF-8' />
                        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                        <title>Welcome to Pay-trade !</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background-color: #f5f5f5;
                            }
                        </style>
                    </head>
                    <body>
                  <table style="margin:0 auto;border:3px solid #121b96;" width="600" cellspacing="0" cellpadding="0" border="0"
                      bgcolor="#ffffff" align="center">
                      <tbody>
                        <-- Table content -->
                      </tbody>
                  </table>
                </body>
                </html>
            `;

      // Replace the content with the body
      const replacedTemplate = template.replace('<-- Table content -->', body);
      return replacedTemplate;
    } catch (error) {
      this.logger.error(
        `Errored while generating an acknowledgement email with message: ${error}`,
      );
      throw `Errored while generating an acknowledgement email with message: ${error}`;
    }
  }
}
