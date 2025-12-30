export interface IClientsAndSuppliersDetails {
  client_supplier_status: string;
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
