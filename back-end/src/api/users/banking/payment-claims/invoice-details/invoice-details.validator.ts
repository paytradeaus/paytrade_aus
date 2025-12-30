import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import {
  AddInvoiceDetailsOfAPaymentClaimInput,
  EditInvoiceDetailsOfAPaymentClaimInput,
} from './invoice-details.input';
import { Repository } from 'typeorm';

@Injectable()
export class InvoiceDetailsOfAPaymentClaimValidator {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(PaymentClaimInvoices)
    private invoicesRepo: Repository<PaymentClaimInvoices>,
  ) {
    this.logger = new PaytradeLogger(
      'INVOICE_DETAILS_OF_A_PAYMENT_CLAIM_VALIDATOR',
    );
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async validateAddInvoiceDetailsOfAPaymentClaim(
    data: AddInvoiceDetailsOfAPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for validating add invoice details of a payment claim with data: ${JSON.stringify(data)}`,
      );
      const {
        description,
        quantity,
        unit_price,
        gst,
        total_amount_including_gst,
      } = data;

      //GST should be the 10% of calculated total amount.
      const gstOfTheTotalAmount = (quantity * unit_price) / 10;
      if (gst != gstOfTheTotalAmount)
        throw new Error(
          `Invalid data. Provided GST is invalid. Please calculate it again.`,
        );

      //Total amount should be inclusive of GST.
      const validTotalAmount = gstOfTheTotalAmount + quantity * unit_price;
      if (validTotalAmount != total_amount_including_gst)
        throw new Error(
          `Invalid data. Provided amount inclusive of GST in invalid. Please calculate it again.`,
        );

      //Accepting only alpha numeric characters in description.
      const regexForMemo = /^[a-zA-Z0-9. ]*$/;
      if (!regexForMemo.test(description))
        throw new Error(
          `Invalid input. Expecting only alpha numberic characters including a-zA-Z0-9 in Description.`,
        );

      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating add invoice details with message: ${error.message}`,
      );
      throw new Error(
        `Errored while validating add invoice details with message: ${error.message}`,
      );
    }
  }

  async validateEditInvoiceDetailsOfAPaymentClaim(
    data: EditInvoiceDetailsOfAPaymentClaimInput,
  ) {
    try {
      this.logger.log(
        `Request received for validating add invoice details with data: ${JSON.stringify(data)}`,
      );
      const { description, quantity, unit_price, gst } = data;

      //GST should be 10% of calculated total amount.
      if (gst && quantity && unit_price) {
        const totalAmountExclusiveOfGST = quantity * unit_price;
        const gstOfTheTotalAmount = totalAmountExclusiveOfGST / 10;
        if (gst != gstOfTheTotalAmount)
          throw new Error(
            `Invalid data. Provided GST is invalid. Please calculate it again.`,
          );
      }

      //Accepting only alpha numeric characters in description.
      if (description) {
        const regexForMemo = /^[a-zA-Z0-9. ]*$/;
        if (!regexForMemo.test(description))
          throw new Error(
            `Invalid input. Expecting only alpha numberic characters including a-zA-Z0-9 in Description.`,
          );
      }

      return data;
    } catch (error) {
      this.logger.error(
        `Errored while validating add invoice details with message: ${error.message}`,
      );
      throw new Error(
        `Errored while validating add invoice details with message: ${error.message}`,
      );
    }
  }
}
