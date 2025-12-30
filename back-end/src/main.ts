import { NestFactory } from '@nestjs/core';
import {
  NestExpressApplication,
  ExpressAdapter,
} from '@nestjs/platform-express';
import { graphqlUploadExpress } from 'graphql-upload';
import { LoggerMiddleware } from './middleware/logger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { json } from 'express';
import * as multer from 'multer';
import { ExpressAdapter as BullBoardExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import * as basicAuth from 'express-basic-auth';

const upload = multer({ storage: multer.memoryStorage() });

const cors = require('cors');
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  accessControlAllowOrigin: '*',
  accessControlAllowCredentials: true,
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    { cors: true },
  );
  const emailQueue = app.get<Queue>('BullQueue_mailQueue'); // Get your queue

  app.use(cors(corsOptions));

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [
            `'self'`,
            'data:',
            'apollo-server-landing-page.cdn.apollographql.com',
            'validator.swagger.io',
          ],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          manifestSrc: [
            `'self'`,
            'apollo-server-landing-page.cdn.apollographql.com',
          ],
          frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
        },
      },
    }),
  );

  app.use(LoggerMiddleware);

  app.use('/stripe-webhook', bodyParser.raw({ type: 'application/json' }));

  app.use('/support-ticket/webhook', bodyParser.urlencoded({ extended: true }));

  // Add multer for multipart/form-data (attachments etc.)
  app.use('/support-ticket/webhook', upload.any());

  // app.use('/xero-webhook', bodyParser.raw({ type: 'application/json' }));

  app.use(
    '/xero-webhook',
    bodyParser.json({
      verify: (req, res, buf) => {
        // This line attaches the raw buffer to the request object.
        // It's cast to `any` because `rawBody` isn't a standard Express `Request` property,
        // but it's a common pattern for webhook handlers.
        (req as any).rawBody = buf;
      },
    }),
  );
  // --- END Xero Webhook Specific Changes ---

  const serverAdapter = new BullBoardExpressAdapter();
  serverAdapter.setBasePath('/admin/mailQueues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use(
    '/admin/mailQueues',
    basicAuth({
      users: { [process.env.BULL_USER]: process.env.BULL_PASSWORD },
      challenge: true,
    }),
    serverAdapter.getRouter(),
  );

  app.use(
    '/support-mail-brevo',
    bodyParser.json({
      verify: (req, res, buf) => {
        (req as any).rawBody = buf; // save raw buffer for HMAC
      },
    }),
  );

  // Apply a general JSON body parser for all other routes that expect JSON.
  // This should come after specific raw/json parsers for webhooks.
  app.use(json());

  app.use(
    '/graphql',
    graphqlUploadExpress({ maxFileSize: 100000000, maxFiles: 10 }),
  );

  await app.init();

  await app.listen(process.env.PORT);
  console.log(`PayTrade Service is listening to port ${process.env.PORT}!`);
}
bootstrap();
