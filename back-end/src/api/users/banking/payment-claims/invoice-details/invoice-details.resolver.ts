// import { UseGuards } from '@nestjs/common';
// import { Mutation, Context, Args, Resolver } from '@nestjs/graphql';
// import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
// import { Role } from 'src/api/auth/role-guard/role.enum';
// import { Roles } from 'src/api/auth/role-guard/roles.decorator';
// import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
// import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
// import { framedResponse } from 'src/libs/@response-framer/response-framer';
// import {
//   AddInvoiceDetailsOfAPaymentClaimInput,
//   EditInvoiceDetailsOfAPaymentClaimInput,
// } from './invoice-details.input';
// import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
// import {
//   AddInvoiceDetailsOfAPaymentClaimResponse,
//   EditInvoiceDetailsOfAPaymentClaimResponse,
// } from './invoice-details.response';
// import { InvoiceDetailsOfAPaymentClaimService } from './invoice-details.service';
// import { InvoiceDetailsOfAPaymentClaimValidator } from './invoice-details.validator';

// @Resolver()
// export class InvoiceDetailsOfAPaymentClaimResolver {
//   private logger: PaytradeLogger;
//   constructor(
//     private readonly jwtInternalService: JwtInternalService,
//     private readonly invoiceDetailsService: InvoiceDetailsOfAPaymentClaimService,
//     private readonly invoiceDetailsValidator: InvoiceDetailsOfAPaymentClaimValidator,
//   ) {
//     this.logger = new PaytradeLogger(
//       'INVOICE_DETAILS_OF_A_PAYMENT_CLAIM_RESOLVER',
//     );
//   }

//   private log(message: string) {
//     this.logger.log(`${message}`);
//   }

//   private logError(message: string) {
//     this.logger.error(`${message}`);
//   }

//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
//   @Mutation(() => AddInvoiceDetailsOfAPaymentClaimResponse, {
//     name: 'addInvoiceDetailsOfAPaymentClaim',
//   })
//   async addInvoiceDetailsOfAPaymentClaim(
//     @Context() context,
//     @Args('payload') payload: AddInvoiceDetailsOfAPaymentClaimInput,
//   ) {
//     try {
//       this.logger.log(
//         `Request received for adding invoice details of a payment claim with details: ${JSON.stringify(payload)}`,
//       );

//       const validatedInvoiceDetails =
//         await this.invoiceDetailsValidator.validateAddInvoiceDetailsOfAPaymentClaim(
//           payload,
//         );
//       const decoded =
//         await this.jwtInternalService.decodeJwtToken(context);
//       return this.invoiceDetailsService.addInvoiceDetailsOfAPaymentClaim(
//         validatedInvoiceDetails,
//         decoded?.emailId,
//       );
//     } catch (error) {
//       this.logger.error(
//         `Errored while adding invoice details of a payment claim with message: ${error.message}`,
//       );
//       return framedResponse(
//         'ERROR',
//         `Errored while adding invoice details of a payment claim with message: ${error.message}`,
//       );
//     }
//   }

//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(Role.STANDARD_USER, Role.ADMIN, Role.PRIMARY_ADMIN)
//   @Mutation(() => EditInvoiceDetailsOfAPaymentClaimResponse, {
//     name: 'editInvoiceDetailsOfAPaymentClaim',
//   })
//   async editInvoiceDetailsOfAPaymentClaim(
//     @Context() context,
//     @Args('payload') payload: EditInvoiceDetailsOfAPaymentClaimInput,
//   ) {
//     try {
//       this.logger.log(
//         `Request received for editing invoice details of a payment claim with details: ${JSON.stringify(payload)}`,
//       );

//       const validatedInvoiceDetailsToBeEdited =
//         await this.invoiceDetailsValidator.validateEditInvoiceDetailsOfAPaymentClaim(
//           payload,
//         );
//       const decoded =
//         await this.jwtInternalService.decodeJwtToken(context);
//       return this.invoiceDetailsService.editInvoiceDetailsOfAPaymentClaim(
//         validatedInvoiceDetailsToBeEdited,
//         decoded?.emailId,
//       );
//     } catch (error) {
//       this.logger.error(
//         `Errored while editing invoice details of a payment claim with message: ${error.message}`,
//       );
//       return framedResponse(
//         'ERROR',
//         `Errored while editing invoice details of a payment claim with message: ${error.message}`,
//       );
//     }
//   }
// }
