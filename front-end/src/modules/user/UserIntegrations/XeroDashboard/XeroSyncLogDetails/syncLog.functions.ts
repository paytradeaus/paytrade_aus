import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { handleXeroReauthRequired } from "../../integration.functions";

export async function CreateBankAccountsInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateAccountInXero($syncId: String, $bankAccountId: Float!) {
          createAccountInXero(
            sync_id: $syncId
            bank_account_id: $bankAccountId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createAccountInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function EditAccountInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation EditAccountInXero($bankAccountId: Float!, $syncId: String) {
          editAccountInXero(bank_account_id: $bankAccountId, sync_id: $syncId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.editAccountInXero;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function DeleteAccountInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteAccountInXero($bankAccountId: Float!, $syncId: String) {
          deleteAccountInXero(
            bank_account_id: $bankAccountId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteAccountInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateContactInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContactInXero(
          $clientSupplierId: Float!
          $syncId: String
        ) {
          createContactInXero(
            client_supplier_id: $clientSupplierId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createContactInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function CreateProjectInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateProjectInXero($projectId: Float!, $syncId: String) {
          createProjectInXero(project_id: $projectId, sync_id: $syncId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createProjectInXero;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function CreateContractInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContractInXero($contractId: Float!, $syncId: String) {
          createContractInXero(contract_id: $contractId, sync_id: $syncId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createContractInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function EditContactInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation EditContactInXero($clientSupplierId: Float!, $syncId: String) {
          editContactInXero(
            client_supplier_id: $clientSupplierId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.editContactInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function DeleteContactInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteContactInXero(
          $clientSupplierId: Float!
          $syncId: String
        ) {
          deleteContactInXero(
            client_supplier_id: $clientSupplierId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteContactInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}
export async function DeleteProjectInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteProjectInXero($projectId: Float!, $syncId: String) {
          deleteProjectInXero(project_id: $projectId, sync_id: $syncId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteProjectInXero;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function DeleteContractInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteContractInXero($contractId: Float!, $syncId: String) {
          deleteContractInXero(contract_id: $contractId, sync_id: $syncId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteContractInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateInvoiceOrBillInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInXero(
          $paymentClaimId: Float!
          $syncId: String
        ) {
          createInvoiceOrBillInXero(
            payment_claim_id: $paymentClaimId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createInvoiceOrBillInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function EditInvoiceOrBillInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation EditInvoiceOrBillInXero(
          $paymentClaimId: Float!
          $syncId: String
        ) {
          editInvoiceOrBillInXero(
            payment_claim_id: $paymentClaimId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.editInvoiceOrBillInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function DeleteInvoiceOrBillInXero(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteInvoiceOrBillInXero(
          $paymentClaimId: Float!
          $syncId: String
        ) {
          deleteInvoiceOrBillInXero(
            payment_claim_id: $paymentClaimId
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteInvoiceOrBillInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(res?.message);
      setLoading && setLoading(false);
    }
  } catch (error: any) {
    showErrorToast(error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateBillsInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInPaytrade(
          $companyId: Float!
          $invoiceId: String!
        ) {
          createInvoiceOrBillInPaytrade(
            company_id: $companyId
            invoice_id: $invoiceId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createInvoiceOrBillInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}

export async function SyncAllInvoicesOrBillsByCompanyId(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllInvoicesOrBillsByCompanyId(
          $companyId: Float!
          $type: String!
          $syncId: String
        ) {
          syncAllInvoicesOrBillsByCompanyId(
            company_id: $companyId
            type: $type
            sync_id: $syncId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllInvoicesOrBillsByCompanyId;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function CreateInvoiceOrBillInPaytradeRetention(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInPaytrade(
          $companyId: Float!
          $invoiceId: String!
          $retentionId: Float
          $syncId: String
          $associatedRetentionSubPaymentId: Float
        ) {
          createInvoiceOrBillInPaytrade(
            company_id: $companyId
            invoice_id: $invoiceId
            retention_id: $retentionId
            sync_id: $syncId
            associated_retention_sub_payment_id: $associatedRetentionSubPaymentId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createInvoiceOrBillInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function CreateClaimInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateClaimInPaytrade($payload: CreateClaimInput!) {
          createClaimInPaytrade(payload: $payload) {
            data {
              contact_id
              contact_name
              due_date
              id
              invoice_id
              mapped_status
              status
              total_amount
              type
              xero_invoice_id
            }
            message
            status
          }
        }
      `,
      // variables: postData,
      variables: {
        payload: {
          tenant_id: postData?.tenantId || null,
          invoice_id: postData?.invoiceId || null,
          bank_transfer_id: postData?.bankTransferId || null,
          retention_id: postData?.retentionId || null,
          associated_retention_sub_payment_id:
            postData?.associatedRetentionSubPaymentId || null,

          credit_note_id: postData?.creditNoteId || null,

          claims_with_reason: postData?.claimsWithReason || [],

          compulsory_attachment_ids: postData?.compulsoryAttachmentIds ?? null,

          withhold_payment_reason: postData?.withholdPaymentReason || null,

          sync_id: postData?.syncId,
          sync_run_type: postData?.syncRunType || null,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.createClaimInPaytrade?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createClaimInPaytrade?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createClaimInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}

export async function CreateClaimInPaytradeReason(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateClaimInPaytrade($payload: CreateClaimInput!) {
          createClaimInPaytrade(payload: $payload) {
            data {
              contact_id
              contact_name
              due_date
              id
              invoice_id
              mapped_status
              status
              total_amount
              type
              xero_invoice_id
            }
            message
            status
          }
        }
      `,
      // variables: postData,
      variables: {
        payload: {
          tenant_id: postData?.tenantId || null,
          invoice_id: postData?.invoiceId || null,
          bank_transfer_id: postData?.bankTransferId || null,
          retention_id: postData?.retentionId || null,
          associated_retention_sub_payment_id:
            postData?.associatedRetentionSubPaymentId || null,

          credit_note_id: postData?.creditNoteId || null,

          claims_with_reason: postData?.claimsWithReason || [],

          compulsory_attachment_ids: postData?.compulsoryAttachmentIds ?? null,

          withhold_payment_reason: postData?.withholdPaymentReason || null,

          sync_id: postData?.syncId,
          sync_run_type: postData?.syncRunType || null,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.createClaimInPaytrade?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createClaimInPaytrade?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createClaimInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}
export async function CreatePaymentInXero(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreatePaymentInXero($payload: CreatePaymentInput!) {
          createPaymentInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createPaymentInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(
      error?.message || "Failed to add payment in Xero. Please try again."
    );
    return false;
  } finally {
    return false;
  }
}

// Task #61 — Re-fires the BankTransfer leg of a payment from a Failed
// retention-transfer sync log (templates 496/497/498).
export async function RetryRetentionTransferFromSyncLog(
  syncLogId: string
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation RetryRetentionTransferFromSyncLog($syncLogId: String!) {
          retryRetentionTransferFromSyncLog(sync_log_id: $syncLogId) {
            message
            status
          }
        }
      `,
      variables: { syncLogId },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.retryRetentionTransferFromSyncLog;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null;
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    }
    showErrorToast(res?.message);
    return false;
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}

export async function ResolveTrustMovementFromSyncLog(
  syncLogId: string,
  chosenType: string
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ResolveTrustMovementFromSyncLog(
          $syncLogId: String!
          $chosenType: String!
        ) {
          resolveTrustMovementFromSyncLog(
            sync_log_id: $syncLogId
            chosen_type: $chosenType
          ) {
            message
            status
          }
        }
      `,
      variables: { syncLogId, chosenType },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.resolveTrustMovementFromSyncLog;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null;
    }
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    }
    showErrorToast(res?.message);
    return false;
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}

export async function CreateOverPaymentRefundInXero(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateOverPaymentRefundInXero(
          $payload: CreateOverPaymentRefundInput!
        ) {
          createOverPaymentRefundInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createOverPaymentRefundInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function SyncAllPaymentsByCompanyId(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation SyncAllPaymentsByCompanyId(
          $companyId: Float!
          $syncId: String
        ) {
          syncAllPaymentsByCompanyId(company_id: $companyId, sync_id: $syncId) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.syncAllPaymentsByCompanyId;

    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function CreateOverPaymentInXero(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateOverPaymentInXero($payload: CreateOverPaymentInput!) {
          createOverPaymentInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createOverPaymentInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function DeletePaymentInXero(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeletePaymentInXero($payload: DeletePaymentInput!) {
          deletePaymentInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deletePaymentInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function CreateCreditNotesInXero(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateCreditNotesInXero($payload: CreateCreditNotesInput!) {
          createCreditNotesInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.createCreditNotesInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function DeleteCreditNotesInXero(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteCreditNotesInXero($payload: DeleteCreditNotesInput!) {
          deleteCreditNotesInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteCreditNotesInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function DeleteOverPaymentInXero(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteOverPaymentInXero($payload: DeleteOverPaymentInput!) {
          deleteOverPaymentInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteOverPaymentInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function DeleteOverPaymentRefundInXero(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation DeleteOverPaymentRefundInXero(
          $payload: DeleteOverPaymentRefundInput!
        ) {
          deleteOverPaymentRefundInXero(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.deleteOverPaymentRefundInXero;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      return true;
    } else {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function CreateClaimInPaytradeForTable(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateClaimInPaytrade($payload: CreateClaimInput!) {
          createClaimInPaytrade(payload: $payload) {
            data {
              contact_id
              contact_name
              due_date
              id
              invoice_id
              mapped_status
              status
              total_amount
              type
              xero_invoice_id
            }
            message
            status
          }
        }
      `,
      // variables: postData,
      variables: {
        payload: {
          tenant_id: postData?.tenantId || null,
          invoice_id: postData?.invoiceId || null,
          bank_transfer_id: postData?.bankTransferId || null,
          retention_id: postData?.retentionId || null,
          associated_retention_sub_payment_id:
            postData?.associatedRetentionSubPaymentId || null,

          credit_note_id: postData?.creditNoteId || null,

          claims_with_reason: postData?.claimsWithReason || [],

          compulsory_attachment_ids: postData?.compulsoryAttachmentIds ?? null,

          withhold_payment_reason: postData?.withholdPaymentReason || null,

          sync_id: postData?.syncId,
          sync_run_type: postData?.syncRunType || null,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.createClaimInPaytrade?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createClaimInPaytrade?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createClaimInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function createInvoiceOrBillInPaytradeTable(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateInvoiceOrBillInPaytrade(
          $companyId: Float!
          $syncId: String
          $retentionId: Float
          $invoiceId: String!
          $compulsoryAttachmentIds: [String!]
          $claimsWithReason: [ClaimReasonInput!]
          $associatedRetentionSubPaymentId: Float
        ) {
          createInvoiceOrBillInPaytrade(
            company_id: $companyId
            sync_id: $syncId
            retention_id: $retentionId
            invoice_id: $invoiceId
            compulsory_attachment_ids: $compulsoryAttachmentIds
            claims_with_reason: $claimsWithReason
            associated_retention_sub_payment_id: $associatedRetentionSubPaymentId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.createInvoiceOrBillInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
    return false;
  }
}

export async function checkAndCreateOverPaymentAndRefunds(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CheckAndCreateOverPaymentAndRefunds(
          $payload: CreateOverpaymentInput!
        ) {
          checkAndCreateOverPaymentAndRefunds(payload: $payload) {
            message
            status
          }
        }
      `,
      // variables: postData,
      variables: {
        payload: {
          contact_id: postData?.contactId || null,
          tenant_id: postData?.tenantId || null,
          project_id: postData?.projectId || null,
          payment_claim_id: postData?.paymentClaimId || null,
          overpayment_id: postData?.overpaymentId || null,
          associated_payment_id: postData?.associatedPaymentId || null,
          associated_overpayment_id: postData?.associatedOverpaymentId || null,
          is_under_payment: postData?.isUnderPayment || null,
          under_payment_amount: postData?.underPaymentAmount || null,
          sync_id: postData?.syncId || null,
          sync_run_type: postData?.syncRunType || null,
        },
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.checkAndCreateOverPaymentAndRefunds?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.checkAndCreateOverPaymentAndRefunds?.message
      );
      return true;
    } else {
      showErrorToast(
        response?.data?.checkAndCreateOverPaymentAndRefunds?.message
      );
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}

export async function GetOrganisation(): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetOrganisation {
          getOrganisation {
            data {
              short_code
            }
            message
            status
          }
        }
      `,
      variables: {},
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.getOrganisation;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      handleXeroReauthRequired(res.message);
      return null; // stop further flow
    }

    if (res?.status === ApiResponse.SUCCESS) {
      return res?.data?.short_code;
    } else {
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  }
}

export async function CreateOrUpdateProjectInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateOrUpdateProjectInPaytrade(
          $companyId: Float!
          $payload: CreateProjectInput
          $projectId: String
          $projectStatus: String
          $syncId: String
        ) {
          createOrUpdateProjectInPaytrade(
            company_id: $companyId
            payload: $payload
            project_id: $projectId
            project_status: $projectStatus
            sync_id: $syncId
          ) {
            data {
              id
              mapped_status
              project_id
              project_name
              project_status
              xero_project_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createOrUpdateProjectInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.createOrUpdateProjectInPaytrade?.message
      );
      return true;
    } else {
      showErrorToast(response?.data?.createOrUpdateProjectInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message || error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
}

export async function CreateOrUpdateContractInPaytrade(
  postData: any,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateOrUpdateContractInPaytrade(
          $companyId: Float!
          $contractId: String
          $contractStatus: String
          $payload: CreateContractDetailInput
          $syncId: String
        ) {
          createOrUpdateContractInPaytrade(
            company_id: $companyId
            contract_id: $contractId
            contract_status: $contractStatus
            payload: $payload
            sync_id: $syncId
          ) {
            data {
              contract_id
              contract_name
              contract_status
              id
              mapped_status
              xero_contract_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createOrUpdateContractInPaytrade?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.createOrUpdateContractInPaytrade?.message
      );
      return true;
    } else {
      showErrorToast(response?.data?.createOrUpdateContractInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message || error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
}
