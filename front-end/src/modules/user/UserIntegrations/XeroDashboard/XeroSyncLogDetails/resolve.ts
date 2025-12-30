import {
  checkAndCreateOverPaymentAndRefunds,
  CreateBankAccountsInXero,
  CreateBillsInPaytrade,
  CreateClaimInPaytrade,
  CreateContactInXero,
  CreateContractInXero,
  CreateCreditNotesInXero,
  CreateInvoiceOrBillInXero,
  CreateOverPaymentRefundInXero,
  CreatePaymentInXero,
  CreateProjectInXero,
  DeleteAccountInXero,
  DeleteContactInXero,
  DeleteContractInXero,
  DeleteCreditNotesInXero,
  DeleteInvoiceOrBillInXero,
  DeleteOverPaymentInXero,
  DeleteOverPaymentRefundInXero,
  DeletePaymentInXero,
  DeleteProjectInXero,
  EditAccountInXero,
  EditContactInXero,
  GetOrganisation,
} from "./syncLog.functions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CryptoJS from "crypto-js";

const xeroEditBillUrl = (invoiceId: string) =>
  "https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=" +
  invoiceId +
  "&edit=true";

const xeroEditInvoiceUrl = async (invoiceId: string) => {
  try {
    const short_code = await GetOrganisation();
    return `https://go.xero.com/app/${short_code}/invoicing/edit/${invoiceId}`;
  } catch {}
};

const xeroViewBillUrl = (invoiceId: string) =>
  "https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=" +
  invoiceId +
  "&edit=true";

const xeroContactEdit = async (contactId: string) => {
  try {
    const short_code = await GetOrganisation();
    return `https://go.xero.com/app/${short_code}/contacts/edit/${contactId}`;
  } catch {}
};

const xeroBankAccountURl = (accountID: string) =>
  "https://go.xero.com/Bank/Transfer.aspx?accountID=" + accountID;

export async function resolveList(data: any) {
  switch (data?.error_code) {
    case "SYNC_ADD_BANK_TO_XERO": {
      return await CreateBankAccountsInXero({
        bankAccountId: data?.api_payload?.bank_account_id,
        syncId: data?.id,
      });
    }
    case "SYNC_EDIT_BANK_TO_XERO":
    case "EDIT_BANK_NOT_FOUND": {
      return await EditAccountInXero({
        bankAccountId: +data?.api_payload?.bank_account_id,
        syncId: data?.id,
      });
    }
    case "SYNC_DELETE_BANK_TO_XERO":
    case "DELETE_BANK_NOT_FOUND": {
      return await DeleteAccountInXero({
        bankAccountId: +data?.api_payload?.bank_account_id,
        syncId: data?.id,
      });
    }
    case "SYNC_ADD_CONTACT_TO_XERO": {
      return await CreateContactInXero({
        clientSupplierId: +data?.api_payload?.client_supplier_id,
        syncId: data?.id,
      });
    }
    case "SYNC_ADD_PROJECT_TO_XERO": {
      return await CreateProjectInXero({
        projectId: +data?.api_payload?.project_id,
        syncId: data?.id,
      });
    }
    case "SYNC_ADD_CONTRACT_TO_XERO": {
      return await CreateContractInXero({
        contractId: +data?.api_payload?.contract_id,
        syncId: data?.id,
      });
    }
    case "SYNC_EDIT_CONTACT_TO_XERO":
    case "EDIT_CONTACT_NOT_FOUND": {
      return await EditContactInXero({
        clientSupplierId: +data?.api_payload?.client_supplier_id,
        syncId: data?.id,
      });
    }
    case "SYNC_DELETE_CONTACT_TO_XERO":
    case "DELETE_CONTACT_NOT_FOUND": {
      return await DeleteContactInXero({
        clientSupplierId: +data?.api_payload?.client_supplier_id,
        syncId: data?.id,
      });
    }
    case "SYNC_DELETE_PROJECT_TO_XERO":
    case "DELETE_PROJECT_NOT_FOUND": {
      return await DeleteProjectInXero({
        projectId: +data?.api_payload?.project_id,
        syncId: data?.id,
      });
    }
    case "SYNC_DELETE_CONTRACT_TO_XERO":
    case "DELETE_CONTRACT_NOT_FOUND":
    case "UNDO_DELETE_CONTRACT_NOT_FOUND": {
      return await DeleteContractInXero({
        contractId: +data?.api_payload?.contract_id,
        syncId: data?.id,
      });
    }
    case "SYNC_ADD_BILL_TO_XERO":
    case "SYNC_ADD_INVOICE_TO_XERO": {
      await CreateInvoiceOrBillInXero({
        paymentClaimId: +data?.api_payload?.payment_claim_id,
        syncId: data?.id,
      });
      return false;
    }
    case "SYNC_EDIT_BILL_TO_XERO":
    case "EDIT_BILL_NOT_FOUND":
    case "EDIT_BILL_NOT_UPDATED":
    case "SYNC_EDIT_INVOICE_TO_XERO":
    case "EDIT_INVOICE_NOT_FOUND":
    case "EDIT_INVOICE_NOT_UPDATED": {
      return {
        redirectTo: `/user/claims/edit/${data?.api_payload?.payment_claim_id}?syncId=${data?.id}`,
      };
    }
    case "PROJECT_MISSING_FIELDS": {
      return {
        redirectTo: `/user/projects/add?syncId=${data?.id}`,
      };
    }
    case "CONTRACT_MISSING_FIELDS": {
      return {
        redirectTo: `/user/contracts/add?projectid=&projectname=&projectrole=&overview=&syncId=${data?.id}`,
      };
    }
    case "DELETE_INVOICE_NOT_UPDATED":
    case "DELETE_INVOICE_NOT_FOUND":
    case "SYNC_DELETE_INVOICE_TO_XERO":
    case "DELETE_BILL_NOT_UPDATED":
    case "DELETE_BILL_NOT_FOUND":
    case "SYNC_DELETE_BILL_TO_XERO": {
      await DeleteInvoiceOrBillInXero({
        paymentClaimId: +data?.api_payload?.payment_claim_id,
        syncId: data?.id,
      });
      return false;
    }
    case "XP_ADD_BILL_MISSING_TRACKING_ID_IN_LINE_ITEM":
    case "XP_ADD_BILL_ATLEAST_ONE_LINE_ITEM":
    case "XP_ADD_BILL_CONTRACT_NOT_FOUND":
    case "XP_ADD_BILL_MISMATCH_IN_CLIENT_SUPPLIER":
    case "XP_ADD_BILL_MISMATCH_IN_PROJECT":
    case "XP_ADD_BILL_CONTRACT_NOT_IN_PROGRESS":
    case "XP_ADD_BILL_TWO_PAIRS_MUST_FOR_RETENTION":
    case "XP_ADD_BILL_CONTRACT_SIZE_EXCEEDS":
    case "XP_ADD_BILL_PROJECT_NOT_FOUND":
    case "XP_ADD_BILL_CLAIM_RECEIVED_DATE_IN_FUTURE":
    case "XP_ADD_BILL_CLAIM_DUE_DATE_IN_PAST": {
      const response = await CreateBillsInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        invoiceId: data?.api_payload?.invoice_id,
      });
      if (!response) {
        window.open(xeroEditBillUrl(data?.api_payload?.invoice_id), "_blank");
      }
      return false;
    }
    case "XP_ADD_INVOICE_MISSING_TRACKING_ID_IN_LINE_ITEM":
    case "XP_ADD_INVOICE_ATLEAST_ONE_LINE_ITEM":
    case "XP_ADD_INVOICE_CONTRACT_NOT_FOUND":
    case "XP_ADD_INVOICE_MISMATCH_IN_CLIENT_SUPPLIER":
    case "XP_ADD_INVOICE_MISMATCH_IN_PROJECT":
    case "XP_ADD_INVOICE_CONTRACT_NOT_IN_PROGRESS":
    case "XP_ADD_INVOICE_TWO_PAIRS_MUST_FOR_RETENTION":
    case "XP_ADD_INVOICE_CONTRACT_SIZE_EXCEEDS":
    case "XP_ADD_INVOICE_PROJECT_NOT_FOUND":
    case "XP_ADD_INVOICE_CLAIM_SENT_DATE_IN_FUTURE":
    case "XP_ADD_INVOICE_CLAIM_DUE_DATE_IN_PAST": {
      const response = await CreateBillsInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        invoiceId: data?.api_payload?.invoice_id,
      });
      if (!response) {
        window.open(
          await xeroEditInvoiceUrl(data?.api_payload?.invoice_id),
          "_blank"
        );
      }
      return false;
    }
    case "WH_ATLEAST_ONE_LINE_ITEM":
    case "WH_TRACKING_ID_MISSING":
    case "WH_VALID_LINE_ITEM":
    case "WH_CONTACT_NOT_FOUND":
    case "WH_CONTRACT_NOT_FOUND":
    case "WH_PROJECT_NOT_FOUND":
    case "WH_MISMATCH_IN_CONTACT":
    case "WH_MISMATCH_IN_PROJECT":
    case "WH_CONTRACT_NOT_IN_PROGRESS":
    case "WH_MUST_BE_2_LINES":
    case "WH_CONTRACT_SIZE_EXCEEDS":
    case "WH_RESOURCE_NOT_FOUND":
    case "WH_CLAIM_RECEIVED_DATE_IN_FUTURE":
    case "WH_CLAIM_SENT_DATE_IN_FUTURE":
    case "WH_CLAIM_DUE_DATE_IN_PAST": {
      const response = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
      });
      if (!response) {
        if (data?.api_payload?.type == "bill") {
          window.open(xeroEditBillUrl(data?.api_payload?.invoice_id), "_blank");
        } else {
          window.open(
            await xeroEditInvoiceUrl(data?.api_payload?.invoice_id),
            "_blank"
          );
        }
      }
      return false;
    }
    case "WH_MULTIPLE_CREDIT_NOTES_IDENTIFIED":
    case "WH_PAYMENT_CANNOT_CREATE":
    case "WH_PAYMENT_NOT_FOUND":
    case "WH_PAYMENT_ACCOUNT_NOT_FOUND":
    case "WH_MULTIPLE_RETENTIONS_IDENTIFIED":
    case "WH_NO_BANK_TRANSFER_IDENTIFIED":
    case "WH_RETENTION_ACCOUNT_NOT_FOUND":
    case "WH_MULTIPLE_CREDIT_NOTES_IDENTIFIED":
    case "WH_PAYMENT_CANNOT_CREATE": {
      const response = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
      });
      if (!response) {
        if (data?.api_payload?.type == "bill") {
          window.open(xeroViewBillUrl(data?.api_payload?.invoice_id), "_blank");
        }
      }
      return false;
    }
    case "WH_NO_RETENTIONS_IDENTIFIED": {
      window.open(
        xeroBankAccountURl(data?.api_payload?.transfer_bank_account_id),
        "_blank"
      );
      return false;
    }
    case "CONTACT_NAME_EXISTS":
    case "WH_CONTACT_NAME_EXISTS": {
      window.open(
        await xeroContactEdit(data?.api_payload?.contact_id),
        "_blank"
      );
    }
    case "PD_ADD_PAYMENT_TO_XERO": {
      await CreatePaymentInXero({
        payload: {
          amount: data?.api_payload?.amount ?? null,
          bank_account_id: +data?.api_payload?.bank_account_id,
          cash_retention: data?.api_payload?.cash_retention ?? null,
          payment_date: data?.api_payload?.payment_date ?? null,
          payment_id: data?.api_payload?.payment_id ?? null,
          retention_account: +data?.api_payload?.retention_account || null,
          retention_amount: +data?.api_payload?.retention_amount,
          sync_id: data?.id ?? null,
        },
      });
      return false;
    }
    case "OPR_ADD_OVERPAYMENT_REFUND_TO_XERO": {
      await CreateOverPaymentRefundInXero({
        payload: {
          overpayment_id: +data?.api_payload?.overpayment_id,
          payment_id: +data?.api_payload?.payment_id,
          sync_id: data?.id,
        },
      });
      return false;
    }
    case "DELETE_PAYMENT_TO_XERO": {
      await DeletePaymentInXero({
        payload: {
          bank_account_id: +data?.api_payload?.bank_account_id,
          cash_retention: data?.api_payload?.cash_retention ?? null,
          payment_id: data?.api_payload?.payment_id ?? null,
          retention_account: +data?.api_payload?.retention_account || null,
          retention_amount: +data?.api_payload?.retention_amount,
          sync_id: data?.id ?? null,
        },
      });
      return false;
    }
    case "DELETE_OVERPAYMENT_TO_XERO": {
      await DeleteOverPaymentInXero({
        payload: {
          sync_id: data?.id,
          payment_id: +data?.api_payload?.payment_id,
        },
      });
      return false;
    }
    case "DELETE_REFUND_TO_XERO": {
      await DeleteOverPaymentRefundInXero({
        payload: {
          sync_id: data?.id,
          payment_id: +data?.api_payload?.payment_id,
        },
      });
      return false;
    }
    case "CN_ADD_CREDIT_NOTE_TO_XERO": {
      await CreateCreditNotesInXero({
        payload: {
          client_supplier_id: +data?.api_payload?.client_supplier_id,
          company_id: +data?.api_payload?.company_id,
          sync_id: data?.id,
          retained_amount: +data?.api_payload?.retained_amount,
          pt_payment_id: +data?.api_payload?.pt_payment_id,
          payment_id: data?.api_payload?.payment_id,
          payment_claim_id: +data?.api_payload?.payment_claim_id,
          is_gst_optional: data?.api_payload?.is_gst_optional,
          description: data?.api_payload?.description,
        },
      });
      return false;
    }
    case "DELETE_CREDIT_NOTE_TO_XERO": {
      await DeleteCreditNotesInXero({
        payload: {
          payment_id: +data?.api_payload?.payment_id,
          sync_id: data?.id,
        },
      });
      return false;
    }
    case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_INVOICE":
    case "MISMATCH_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_INVOICE":
    case "MISMATCH_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_INVOICE":
    case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_BILL":
    case "MISMATCH_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_BILL":
    case "MISMATCH_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_BILL":
    case "MISSING_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_SYNC_BILL":
    case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_SYNC_BILL":
    case "XP_ADD_BILL_MISMATCH_TAX_FIELD":
    case "XP_ADD_BILL_MISMATCH_ACCOUNT_FIELD":
    case "XP_ADD_INVOICE_MISMATCH_ACCOUNT_FIELD": {
      return {
        redirectTo: `/user/integrations/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}&invoiceId=${data?.api_payload?.invoice_id}`,
      };
    }
    case "PD_SYNC_MISSING_PROJECT_TRACKING_CATEGORY_ID":
    case "PD_SYNC_MISSING_CONTRACT_TRACKING_CATEGORY_ID": {
      return {
        redirectTo: `/user/integrations/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}`,
      };
    }
    case "WH_MISSING_PROJECT_CATEGORY_ID":
    case "WH_MISSING_CONTRACT_CATEGORY_ID":
    case "WH_PROJECT_CATEGORY_ID_MISMATCH":
    case "WH_CONTRACT_CATEGORY_ID_MISMATCH":
    case "WH_MISSING_ACCOUNT_FIELDS":
    case "WH_ACCOUNT_FIELDS_MISMATCH":
    case "WH_MISSING_TAX_FIELDS":
    case "WH_TAX_FIELDS_MISMATCH": {
      return {
        redirectTo: `/user/integrations/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}&invoiceId=${data?.api_payload?.invoice_id}&tenantId=${data?.api_payload?.tenant_id}`,
      };
    }
    case "PD_MISSING_PROJECT_TRACKING_CATEGORY_ID":
    case "PD_MISSING_CONTRACT_TRACKING_CATEGORY_ID":
    case "PD_MISSING_ACCOUNT_FIELD":
    case "PD_MISSING_TAX_FIELD": {
      const queryString = Object.entries(data?.api_payload)
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${
              v === null || v === undefined ? "" : encodeURIComponent(String(v))
            }`
        )
        .join("&");
      return {
        redirectTo:
          `/user/integrations/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}&` +
          queryString,
      };
    }
    case "BANK_MISSING_FIELDS": {
      return {
        redirectTo: `/user/bank-accounts/add?syncId=${data?.id}`,
      };
    }
    case "PD_ADD_PAYMENT_TO_XERO": {
      await CreatePaymentInXero({
        payload: {
          amount: data?.api_payload?.amount ?? null,
          bank_account_id: data?.api_payload?.bank_account_id ?? null,
          cash_retention: data?.api_payload?.cash_retention ?? null,
          payment_date: data?.api_payload?.payment_date ?? null,
          payment_id: data?.api_payload?.payment_id ?? null,
          retention_account: data?.api_payload?.retention_account ?? null,
          retention_amount: data?.api_payload?.retention_amount ?? null,
          syncId: data?.id ?? null,
        },
      });
      return false;
    }
    case "WH_OVERPAYMENT_UNFOUND": {
      await checkAndCreateOverPaymentAndRefunds({
        contactId: data?.api_payload?.contact_id ?? null,
        tenantId: data?.api_payload?.tenant_id ?? null,
        associatedOverpaymentId:
          data?.api_payload?.associated_overpayment_id ?? null,
        overpaymentId: data?.api_payload?.overpayment_id ?? null,
        associatedPaymentId: data?.api_payload?.associated_payment_id ?? null,
        paymentClaimId: data?.api_payload?.payment_claim_id ?? null,
        projectId: data?.api_payload?.project_id ?? null,
        syncId: data?.id ?? null,
      });
      return false;
    }
    case "CONTACT_MISSING_FIELDS":
    case "WH_CONTACT_MISSING_FIELDS": {
      return {
        redirectTo: `${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?syncId=${data?.id}`,
      };
    }
    case "WH_OVERPAYMENT_REFUND_CANNOT_BE_DELETED": {
      if (data?.api_payload?.transaction_id) {
        const encryptedData = CryptoJS.AES.encrypt(
          JSON.stringify({
            TransactionIDS: [data?.api_payload?.transaction_id],
            bankAccountId: "",
            triggerFrom: "",
          }),
          "transactions-IDS"
        ).toString();
        return {
          redirectTo: `${AppRoutes.USER_UNMATCH_TRANSACTIONS}/${encryptedData}?syncId=${data?.id}`,
        };
      } else {
        await checkAndCreateOverPaymentAndRefunds({
          contactId: data?.api_payload?.contact_id ?? null,
          tenantId: data?.api_payload?.tenant_id ?? null,
          associatedOverpaymentId:
            data?.api_payload?.associated_overpayment_id ?? null,
          overpaymentId: data?.api_payload?.overpayment_id ?? null,
          associatedPaymentId: data?.api_payload?.associated_payment_id ?? null,
          paymentClaimId: data?.api_payload?.payment_claim_id ?? null,
          projectId: data?.api_payload?.project_id ?? null,
          syncId: data?.id ?? null,
        });
      }
      return false;
    }
    default: {
      return false;
    }
  }
}
