export interface ISubPayment {
  amount: number;
  id: string;
  payment_date: string;
  payment_from_account: number;
  payment_from_account_name: string;
  payment_id: number;
  payment_to_account: number;
  payment_to_account_bsb_number: string;
  payment_to_account_name: string;
  payment_to_account_number: string;
  status: string;
  sub_payment_id: number;
  sub_payment_type: string;
  payment_claim_id: number;
  project_name: string;
  contract_name: string;
  claim_amount: number;
  spent_amount?: number;
  received_amount?: number;
  payment_type?: string;
}
