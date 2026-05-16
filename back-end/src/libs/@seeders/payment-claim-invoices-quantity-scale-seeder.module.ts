import { Module } from '@nestjs/common';
import { PaymentClaimInvoicesQuantityScaleSeederService } from './payment-claim-invoices-quantity-scale-seeder.service';

@Module({
  providers: [PaymentClaimInvoicesQuantityScaleSeederService],
})
export class PaymentClaimInvoicesQuantityScaleSeederModule {}
