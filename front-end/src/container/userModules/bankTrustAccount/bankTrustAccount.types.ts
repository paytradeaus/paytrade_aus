export interface IBankTrustAccountDetails {
  account_name: string;
  account_type: string;
  created_on: string; // Assuming this is a string representation of a date
  current_balance: number | null; // Assuming balance can be null or a number
  bank_account_id: string;
  last_updated_type: string;
  status: string;
  previous_status: string;
  updated_on: string; // Assuming this is a string representation of a date
  projects_count?: number;
}
export interface ITransactions {
  description: string;
  id: string;
  matched_to: string | null;
  received_amount: number | null;
  spent_amount: number | null;
  status: string;
  txn_date: string;
  unique_txn_id: number;
  bank_account_id?: number | null;
  is_receivable?: boolean | null;
}
export type InterestFieldData = {
  cash_retention_type: any;
  list_status: string | null;
  client_supplier_id: any;
  compulsory_attachment_ids: any[];
  contract_date: any;
  contract_id: any;
  contract_name: any;
  is_retention_confirmed: any;
  matched_transactions: any[];
  memo: any;
  optional_attachment_ids: any[];
  payment_amount: any;
  payment_claim_id: any;
  payment_date: any;
  payment_from_account: any;
  payment_id: any;
  payment_to: any;
  payment_to_account: any;
  payment_type: any;
  project_date: any;
  project_id: any;
  project_name: any;
  retention_account: any;
  retention_amount: any;
  retention_release_date: any;
  status: any;
  third_party_payment_reason: any;
  total_amount: any;
  __typename: any;
};
