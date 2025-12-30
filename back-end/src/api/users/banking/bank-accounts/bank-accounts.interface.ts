import { BankAccounts } from 'src/entities/banking.entity';

export interface ExtendedBankAccounts extends BankAccounts {
  projects_count: number;
  unmatched_transactions_count: number;
  remaining_days: number;
  last_updated_days?: number;
  formatted_bank_account_balance: string;
  is_cash_associated?: boolean;
}
