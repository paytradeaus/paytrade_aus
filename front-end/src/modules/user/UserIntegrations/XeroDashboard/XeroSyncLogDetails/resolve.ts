import {
  checkAndCreateOverPaymentAndRefunds,
  CreateBankAccountsInXero,
  CreateBillsInPaytrade,
  CreateClaimInPaytrade,
  CreateContactInXero,
  CreateContractInXero,
  CreateCreditNotesInXero,
  CreateInvoiceOrBillInXero,
  CreateOrUpdateContractInPaytrade,
  CreateOrUpdateProjectInPaytrade,
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
import { viewXeroSyncLog } from "../../integration.functions";
import {
  createContactInPaytradeThroughWebhookFromXeroData,
  CreateOrUpdateContactInPaytrade,
} from "@/modules/user/ClientsAndSuppliers/AddClientsAndSuppliers/AddClientsAndSuppliers.functions";

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

const xeroContactRestoreUrl = async (contactId: string) => {
  try {
    const short_code = await GetOrganisation();
    return `https://go.xero.com/app/${short_code}/contacts/contact/${contactId}`;
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
      const err = data?.error_message ?? "";

      // 🔍 Partial match keywords
      const errorKeywords = [
        "Account code",
        "not a valid code",
        "TaxType code NONE",
        "cannot be used for this type of transaction",
      ];

      // 🔥 Check if any keyword exists inside the error message
      const hasInvalidAccountOrTaxError = errorKeywords.some((keyword) =>
        err.includes(keyword)
      );

      if (hasInvalidAccountOrTaxError) {
        console.log("⚠️ Invalid account/tax error detected");

        return {
          redirectTo: `/user/integrations/xero/settings?syncId=${data?.id}`,
        };
      }
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
    case "SCHEDULER_PROJECT_MISSING_FIELDS":
    case "PROJECT_MISSING_FIELDS": {
      return {
        redirectTo: `/user/projects/add?syncId=${data?.id}&errorCode=${data?.error_code}`,
      };
    }
    case "SCHEDULER_CONTRACT_MISSING_FIELDS":
    case "CONTRACT_MISSING_FIELDS": {
      return {
        redirectTo: `/user/contracts/add?projectid=&projectname=&projectrole=&overview=&syncId=${data?.id}&errorCode=${data?.error_code}`,
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
    case "SCHEDULER_ATLEAST_ONE_LINE_ITEM":
    case "WH_TRACKING_ID_MISSING":
    case "SCHEDULER_TRACKING_ID_MISSING":
    case "WH_VALID_LINE_ITEM":
    case "SCHEDULER_VALID_LINE_ITEM":
    case "WH_CONTACT_NOT_FOUND":
    case "SCHEDULER_CONTACT_NOT_FOUND":
    case "WH_CONTRACT_NOT_FOUND":
    case "SCHEDULER_CONTRACT_NOT_FOUND":
    case "SCHEDULER_PROJECT_NOT_FOUND":
    case "WH_PROJECT_NOT_FOUND":
    case "WH_MISMATCH_IN_CONTACT":
    case "SCHEDULER_MISMATCH_IN_CONTACT":
    case "WH_MISMATCH_IN_PROJECT":
    case "SCHEDULER_MISMATCH_IN_PROJECT":
    case "WH_CONTRACT_NOT_IN_PROGRESS":
    case "SCHEDULER_CONTRACT_NOT_IN_PROGRESS":
    case "WH_MUST_BE_2_LINES":
    case "SCHEDULER_MUST_BE_2_LINES":
    case "WH_CONTRACT_SIZE_EXCEEDS":
    case "SCHEDULER_CONTRACT_SIZE_EXCEEDS":
    case "WH_RESOURCE_NOT_FOUND":
    case "SCHEDULER_RESOURCE_NOT_FOUND":
    case "WH_CLAIM_RECEIVED_DATE_IN_FUTURE":
    case "SCHEDULER_CLAIM_RECEIVED_DATE_IN_FUTURE":
    case "SCHEDULER_CLAIM_DUE_DATE_IN_PAST":
    case "WH_CLAIM_SENT_DATE_IN_FUTURE":
    case "SCHEDULER_CLAIM_SENT_DATE_IN_FUTURE":
    case "WH_CLAIM_DUE_DATE_IN_PAST": {
      const response = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
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
    case "SCHEDULER_MULTIPLE_CREDIT_NOTES_IDENTIFIED":
    case "WH_PAYMENT_NOT_FOUND":
    case "SCHEDULER_PAYMENT_NOT_FOUND":
    case "WH_PAYMENT_ACCOUNT_NOT_FOUND":
    case "WH_MULTIPLE_RETENTIONS_IDENTIFIED":
    case "SCHEDULER_PAYMENT_ACCOUNT_NOT_FOUND":
    case "SCHEDULER_MULTIPLE_RETENTIONS_IDENTIFIED":
    case "WH_NO_BANK_TRANSFER_IDENTIFIED":
    case "SCHEDULER_NO_BANK_TRANSFER_IDENTIFIED":
    case "WH_RETENTION_ACCOUNT_NOT_FOUND":
    case "SCHEDULER_RETENTION_ACCOUNT_NOT_FOUND":
    case "SCHEDULER_MULTIPLE_CREDIT_NOTES_IDENTIFIED":
    case "WH_MULTIPLE_CREDIT_NOTES_IDENTIFIED": {
      const response = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      if (!response) {
        if (data?.api_payload?.type == "bill") {
          window.open(xeroViewBillUrl(data?.api_payload?.invoice_id), "_blank");
        }
      }
      return false;
    }
    case "SCHEDULER_PAYMENT_CANNOT_CREATE":
    case "WH_PAYMENT_CANNOT_CREATE": {
      const { api_payload, id, xero_records } = data || {};
      const record = xero_records?.[0] || {};
      const response = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: api_payload?.invoice_id || null,
        tenantId: api_payload?.tenant_id || null,
        syncId: id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      if (response) break;
      const companyId = localStorage.getItem("companyId") || 0;
      const { payment_account, retention_account } = record;
      const accountId = payment_account || retention_account;
      if (accountId) {
        const redirectTo = `/user/bank-accounts/overview/${accountId}/${companyId}`;
        return { redirectTo };
      }

      break;
    }
    case "SCHEDULER_PAYMENT_CANNOT_BE_DELETED":
    case "WH_PAYMENT_CANNOT_BE_DELETED": {
      const record = data?.xero_records?.[0];
      // Extract payment ID safely
      const paymentId = record?.checkedPayments?.[0]?.payment_id;

      // Extract claim
      const isDelete = data?.api_payload?.delete_paytrade_only;

      const isUnmapping = data?.api_payload?.unmapping_payment_id;

      // --- Unmatch Payment Routing ---
      const unmatchData = record?.unmatchTransactions?.[0] ?? null;

      const paymenttype = data?.api_payload?.payment_type;

      // List of special payment types
      const otherPayments = [
        "Interest Received",
        "Bank Charge Applied",
        "Bank Charge Top Up",
        "Interest Withdrawal",
        "Top Up",
        "Top Up Retention",
        "Overpayment refund from supplier",
        "Overpayment refund to client",
        "Overpayment to supplier",
        "Underpayment to supplier",
        "Overpayment from client",
        "Underpayment from client",
        "Withdrawal",
      ];

      const claimParam = isDelete ? `&delete=${isDelete}` : "";
      const unmatchParam =
        isUnmapping !== undefined && isUnmapping !== null && isUnmapping !== 0
          ? `&unmapid=${isUnmapping}`
          : "";

      // 👉 If payment type matches any otherPayments → redirect to interest-charges edit
      if (otherPayments.includes(paymenttype)) {
        return {
          redirectTo: `/user/bank-accounts/overview/interest-charges/edit/${paymentId}?${claimParam}${unmatchParam}&syncId=${data?.id}`,
        };
      }

      // 👉 Else normal payment redirection
      // 👉 1. Payment redirect (if payment exists)
      if (paymentId) {
        return {
          redirectTo: `/user/claims/payments/add?payment=${paymentId}&mode=view${claimParam}${unmatchParam}&syncId=${data?.id}`,
        };
      }

      if (unmatchData) {
        const matchedTxn = unmatchData?.matched_transactions?.[0];

        if (matchedTxn) {
          // 🔐 Encrypt the data like you showed
          const encryptedData = CryptoJS.AES.encrypt(
            JSON.stringify({
              TransactionIDS: [matchedTxn],
              bankAccountId: unmatchData?.account_id,
              triggerFrom: "xeroWebhooks",
            }),
            "transactions-IDS" // secret key (same as your example)
          ).toString();

          return {
            redirectTo: `/user/bank-accounts/unmatch-transactions/${encryptedData}?syncId=${data?.id}&errorCode=${data?.error_code}`,
          };
        }
      }

      return false;
    }
    case "SCHEDULER_NO_RETENTIONS_IDENTIFIED":
    case "WH_NO_RETENTIONS_IDENTIFIED": {
      await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      const viewLogData = await viewXeroSyncLog({
        viewXeroSyncLogId: data?.id,
      });
      if (
        viewLogData.error_code == "WH_NO_RETENTIONS_IDENTIFIED" ||
        viewLogData?.error_code == "SCHEDULER_NO_RETENTIONS_IDENTIFIED"
      ) {
        window.open(
          xeroBankAccountURl(data?.api_payload?.transfer_bank_account_id),
          "_blank"
        );
        return false;
      }
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
          amount:
            data?.api_payload?.amount != null
              ? Number(data?.api_payload?.amount)
              : null,
          bank_account_id: +data?.api_payload?.bank_account_id,
          cash_retention: data?.api_payload?.cash_retention ?? null,
          payment_date: data?.api_payload?.payment_date ?? null,
          payment_id:
            data?.api_payload?.payment_id != null
              ? Number(data?.api_payload?.payment_id)
              : null,
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
    case "SCHEDULER_MISSING_PROJECT_CATEGORY_ID":
    case "WH_MISSING_CONTRACT_CATEGORY_ID":
    case "SCHEDULER_MISSING_CONTRACT_CATEGORY_ID":
    case "WH_PROJECT_CATEGORY_ID_MISMATCH":
    case "SCHEDULER_PROJECT_CATEGORY_ID_MISMATCH":
    case "WH_CONTRACT_CATEGORY_ID_MISMATCH":
    case "SCHEDULER_CONTRACT_CATEGORY_ID_MISMATCH":
    case "WH_MISSING_ACCOUNT_FIELDS":
    case "SCHEDULER_MISSING_ACCOUNT_FIELDS":
    case "WH_ACCOUNT_FIELDS_MISMATCH":
    case "SCHEDULER_ACCOUNT_FIELDS_MISMATCH":
    case "WH_MISSING_TAX_FIELDS":
    case "SCHEDULER_MISSING_TAX_FIELDS":
    case "SCHEDULER_TAX_FIELDS_MISMATCH":
    case "WH_TAX_FIELDS_MISMATCH": {
      return {
        redirectTo: `/user/integrations/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}&invoiceId=${data?.api_payload?.invoice_id}&tenantId=${data?.api_payload?.tenant_id}&synctype=${data?.api_payload?.sync_run_type}`,
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
    case "SCHEDULER_BANK_MISSING_FIELDS":
    case "BANK_MISSING_FIELDS": {
      return {
        redirectTo: `/user/bank-accounts/add?syncId=${data?.id}&errorCode=${data?.error_code}`,
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
    case "SCHEDULER_PROJECT_NAME_CANNOT_BE_EDITED":
    case "SCHEDULER_PROJECT_CANNOT_BE_DELETED": {
      const response = await CreateOrUpdateProjectInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        syncId: data?.id,
        projectId: data?.api_payload?.project_id,
        projectStatus: data?.api_payload?.project_status,
      });
      if (!response) {
        window.open("https://go.xero.com/Setup/Tracking.aspx", "_blank");
      }
      return false;
    }
    case "SCHEDULER_CONTRACT_NAME_CANNOT_BE_EDITED":
    case "SCHEDULER_CONTRACT_CANNOT_BE_DELETED": {
      const response = await CreateOrUpdateContractInPaytrade({
        companyId: +(localStorage.getItem("companyId") || 0),
        syncId: data?.id,
        contractId: data?.api_payload?.contract_id,
        contractStatus: data?.api_payload?.contract_status,
      });
      if (!response) {
        window.open("https://go.xero.com/Setup/Tracking.aspx", "_blank");
      }
      return false;
    }

    case "SCHEDULER_OVERPAYMENT_UNFOUND":
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
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      return false;
    }
    case "CONTACT_MISSING_FIELDS":
    case "SCHEDULER_CONTACT_MISSING_FIELDS":
    case "WH_CONTACT_MISSING_FIELDS": {
      return {
        redirectTo: `${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?syncId=${data?.id}`,
      };
    }
    case "SCHEDULER_OVERPAYMENT_REFUND_CANNOT_BE_DELETED":
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
          syncRunType: data?.api_payload?.sync_run_type || null,
        });
      }
      return false;
    }
    case "WH_CONTACT_CANNOT_BE_DELETED": {
      const response = await createContactInPaytradeThroughWebhookFromXeroData({
        syncId: data?.id ?? null,
        companyId: Number(localStorage.getItem("companyId")),
        contactId: data?.api_payload?.contact_id,
        tenantId: data?.api_payload?.tenant_id,
      });
      if (!response || response?.status === false) {
        window.open(
          await xeroContactRestoreUrl(data?.api_payload?.contact_id),
          "_blank"
        );
      }
      return false;
    }
    case "SCHEDULER_CONTACT_CANNOT_BE_DELETED": {
      const response = await CreateOrUpdateContactInPaytrade({
        syncId: data?.id ?? null,
        companyId: Number(localStorage.getItem("companyId")),
        contactId: data?.api_payload?.contact_id,
        tenantId: data?.api_payload?.tenant_id,
        contactStatus: data?.api_payload?.contact_status,
      });
      if (!response || response?.status === false) {
        window.open(
          await xeroContactRestoreUrl(data?.api_payload?.contact_id),
          "_blank"
        );
      }
      return false;
    }
    case "SCHEDULER_CONTACT_FINANCIAL_NOT_SYNCED_TO_PT":
    case "SCHEDULER_CONTACT_FINANCIAL_NOT_SYNCED_TO_XERO": {
      window.location.href =
        AppRoutes.USER_INTEGRATION +
        `/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}`;
      return true;
    }
    case "SMART_CONTRACT_CONTACT_INCOMPLETE":
    case "SMART_CONTRACT_NO_SUPPLIER_FINANCIALS":
    case "SMART_CONTRACT_TYPE_MISMATCH": {
      const contactRetry = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      if (!contactRetry) {
        const csUuid = data?.api_payload?.client_supplier_uuid
          || data?.paytrade_records?.[0]?.id;
        if (csUuid) {
          window.location.href =
            AppRoutes.USER_EDIT_CLIENTS_AND_SUPPLIERS +
            `/${csUuid}?tab=current&syncId=${data?.id}&errorCode=${data?.error_code}`;
        } else {
          window.location.href =
            AppRoutes.USER_INTEGRATION +
            `/xero/settings?syncId=${data?.id}&errorCode=${data?.error_code}&invoiceId=${data?.api_payload?.invoice_id}&synctype=claim`;
        }
      }
      return false;
    }
    case "SMART_CONTRACT_NO_PTA":
    case "SMART_CONTRACT_NO_RTA": {
      const bankRetry = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      if (!bankRetry) {
        window.location.href =
          AppRoutes.USER_BANK_ACCOUNTS_CURRENT +
          `?syncId=${data?.id}&errorCode=${data?.error_code}`;
      }
      return false;
    }
    case "SMART_CONTRACT_RELATED_ENTITY":
    case "SMART_CONTRACT_TYPE_ERROR":
    case "SMART_CONTRACT_NAME_CONFLICT":
    case "SMART_CONTRACT_INVALID_ROLE": {
      const structRetry = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      if (!structRetry) {
        window.location.href =
          AppRoutes.USER_ADD_CONTRACTS +
          `?syncId=${data?.id}&errorCode=${data?.error_code}&contactId=${data?.api_payload?.client_supplier_id || ""}`;
      }
      return false;
    }
    case "SMART_CONTRACT_GENERAL_ERROR": {
      const generalRetry = await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: data?.api_payload?.invoice_id || null,
        tenantId: data?.api_payload?.tenant_id || null,
        syncId: data?.id,
        syncRunType: data?.api_payload?.sync_run_type || null,
      });
      if (!generalRetry) {
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
    default: {
      return false;
    }
  }
}
