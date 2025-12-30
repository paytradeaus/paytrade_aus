export interface IPaymentClaimInvoices {
  description: string;
  quantity: number;
  unit_price: number;
  gst: number;
  total_amount_including_gst: number;
  payment_claim_id?: number;
}
