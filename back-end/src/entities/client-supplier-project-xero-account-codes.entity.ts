import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * Task #41 — Variable bill code per supplier.
 *
 * Per-(supplier × project) override of the Xero expense account code used
 * on the base "service" line of an outbound bill / inbound bill webhook.
 *
 * Resolution order (see `resolveSupplierBillCode`):
 *   1. project override row (this table)
 *   2. supplier default override (`client_suppliers_details.xero_default_account_code`)
 *   3. naming-convention auto-discovery (inbound only, Xero CoA)
 *   4. company-level fallback (`xero_integration_details.bill_code`)
 *      — only when `bill_code_is_variable=false` OR
 *        `bill_code_allow_fallback=true`.
 *
 * `account_code` is free-form text matching whatever Xero has in the
 * chart of accounts (e.g. "453", "BUILD-04").
 */
@Entity({ name: 'client_supplier_project_xero_account_codes' })
@Unique('uq_csp_xero_acct_supplier_project', [
  'client_supplier_id',
  'project_id',
])
@Index('ix_csp_xero_acct_company', ['company_id'])
export class ClientSupplierProjectXeroAccountCodes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  company_id: number;

  @Column({ type: 'integer' })
  client_supplier_id: number;

  @Column({ type: 'integer' })
  project_id: number;

  @Column({ type: 'text' })
  account_code: string;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_on: Date;

  @Column({ type: 'integer', nullable: true })
  updated_by: number;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  updated_on: Date;
}
