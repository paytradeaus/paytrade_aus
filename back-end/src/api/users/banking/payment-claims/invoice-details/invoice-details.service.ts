// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import {
//   PaymentClaimInvoices,
//   PaymentClaims,
// } from 'src/entities/banking.entity';
// import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
// import { Repository } from 'typeorm';
// import { framedResponse } from 'src/libs/@response-framer/response-framer';
// import {
//   AddInvoiceDetailsOfAPaymentClaimInput,
//   EditInvoiceDetailsOfAPaymentClaimInput,
// } from './invoice-details.input';

// @Injectable()
// export class InvoiceDetailsOfAPaymentClaimService {
//   private logger: PaytradeLogger;
//   constructor(
//     @InjectRepository(PaymentClaimInvoices)
//     private invoiceDetailsRepo: Repository<PaymentClaimInvoices>,
//     @InjectRepository(PaymentClaims)
//     private paymentClaimsRepo: Repository<PaymentClaims>,
//   ) {
//     this.logger = new PaytradeLogger(
//       'INVOICE_DETAILS_OF_A_PAYMENT_CLAIM_SERVICE',
//     );
//   }

//   private log(message: string) {
//     this.logger.log(`${message}`);
//   }

//   private logError(message: string) {
//     this.logger.error(`${message}`);
//   }

//   async addInvoiceDetailsOfAPaymentClaim(
//     data: AddInvoiceDetailsOfAPaymentClaimInput,
//     created_by?: string,
//   ) {
//     try {
//       this.logger.log(
//         `Request received for adding invoice details of a payment claim with details: ${JSON.stringify({ ...data, ...{ created_by } })}`,
//       );

//       const { gst, total_amount_including_gst, total_amount_excluding_gst } =
//         data;
//       const invoiceDetails = await this.invoiceDetailsRepo.create({
//         ...data,
//         ...{ created_by },
//       });
//       const savedInvoiceDetails =
//         await this.invoiceDetailsRepo.save(invoiceDetails);
//       const invoice_id = 10 + Number(savedInvoiceDetails.invoice_id);
//       await this.invoiceDetailsRepo
//         .createQueryBuilder()
//         .update(PaymentClaimInvoices)
//         .set({ invoice_id })
//         .where(`invoice_id = :invoice_id`, { invoice_id:  })
//         .execute();
//       // const checkExistenceOfInvoices = await this.invoiceDetailsRepo.find({
//       //   where: { invoice_id },
//       //   select: [
//       //     'total_amount_excluding_gst',
//       //     'gst',
//       //     'total_amount_including_gst',
//       //   ],
//       // });
//       // console.log('checkExistenceOfInvoices', checkExistenceOfInvoices);

//       // let response;
//       // if (!checkExistenceOfInvoices.length) {
//       //   response = {
//       //     invoice_id,
//       //     sub_total: total_amount_excluding_gst,
//       //     gst: gst,
//       //     total: total_amount_including_gst,
//       //   };
//       //   console.log('response1', response);
//       // } else if (checkExistenceOfInvoices.length) {
//       //   const subTotalSummaries = [];
//       //   const gsts = [];
//       //   const total = [];
//       //   for (let invoice of checkExistenceOfInvoices) {
//       //     subTotalSummaries.push(invoice.total_amount_excluding_gst);
//       //     gsts.push(invoice.gst);
//       //     total.push(invoice.total_amount_including_gst);
//       //   }
//       //   response = {
//       //     invoice_id,
//       //     sub_total: subTotalSummaries.reduce((acc, curr) => acc + curr, 0),
//       //     gst: gsts.reduce((acc, curr) => acc + curr, 0),
//       //     total: total.reduce((acc, curr) => acc + curr, 0),
//       //   };
//       //   console.log('response2', response);
//       // }
//       return framedResponse(
//         'SUCCESS',
//         `Invoice details of a payment claim has added successfully.`,
//         response,
//       );
//     } catch (error) {
//       this.logger.error(
//         `Errored while adding invoice details of a payment claim with message: ${error.message}`,
//       );
//       throw new Error(`${error.message}`);
//     }
//   }

//   async editInvoiceDetailsOfAPaymentClaim(
//     data: EditInvoiceDetailsOfAPaymentClaimInput,
//     updated_by?: string,
//   ) {
//     try {
//       this.logger.log(
//         `Request received for editing invoice details of a payment claim with details: ${JSON.stringify({ ...data, ...{ updated_by } })}`,
//       );

//       const { invoice_id } = data;

//       delete data.payment_claim_id;
//       delete data.invoice_id;

//       await this.invoiceDetailsRepo
//         .createQueryBuilder()
//         .update(PaymentClaimInvoices)
//         .set({
//           ...data,
//           ...{ updated_by },
//         })
//         .where('id = :invoice_id', { invoice_id })
//         .execute();
//       this.logger.log(
//         `Details of payment claim with id: ${data.invoice_id} has been edited successfully.`,
//       );

//       return framedResponse(
//         'SUCCESS',
//         `Details of a payment claim has been edited successfully.`,
//       );
//     } catch (error) {
//       this.logger.error(
//         `Errored while editing details of a payment claim with message: ${error.message}`,
//       );
//       throw new Error(`${error.message}`);
//     }
//   }
// }
