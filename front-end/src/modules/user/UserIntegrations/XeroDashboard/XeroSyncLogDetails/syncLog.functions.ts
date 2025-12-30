import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

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
    if (response?.data?.createAccountInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createAccountInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.createAccountInXero?.message);
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
    if (response?.data?.editAccountInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.editAccountInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.editAccountInXero?.message);
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
    if (response?.data?.deleteAccountInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.deleteAccountInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.deleteAccountInXero?.message);
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
    if (response?.data?.createContactInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createContactInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.createContactInXero?.message);
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
    if (response?.data?.createProjectInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createProjectInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.createProjectInXero?.message);
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
    if (response?.data?.createContractInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createContractInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.createContractInXero?.message);
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
    if (response?.data?.editContactInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.editContactInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.editContactInXero?.message);
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
    if (response?.data?.deleteContactInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.deleteContactInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.deleteContactInXero?.message);
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
    if (response?.data?.deleteProjectInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.deleteProjectInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.deleteProjectInXero?.message);
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
    if (response?.data?.deleteContractInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.deleteContractInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.deleteContractInXero?.message);
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
    if (
      response?.data?.createInvoiceOrBillInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createInvoiceOrBillInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.createInvoiceOrBillInXero?.message);
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
    if (
      response?.data?.editInvoiceOrBillInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.editInvoiceOrBillInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.editInvoiceOrBillInXero?.message);
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
    if (
      response?.data?.deleteInvoiceOrBillInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.deleteInvoiceOrBillInXero?.message);
      setLoading && setLoading(false);
      return true;
    } else {
      showErrorToast(response?.data?.deleteInvoiceOrBillInXero?.message);
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

    if (
      response?.data?.syncAllInvoicesOrBillsByCompanyId?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(
        response?.data?.syncAllInvoicesOrBillsByCompanyId?.message
      );
      return true;
    } else {
      showErrorToast(
        response?.data?.syncAllInvoicesOrBillsByCompanyId?.message
      );
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
        mutation CreateClaimInPaytrade(
          $invoiceId: String!
          $tenantId: String!
          $associatedRetentionSubPaymentId: Float
          $retentionId: Float
          $syncId: String
        ) {
          createClaimInPaytrade(
            invoice_id: $invoiceId
            tenant_id: $tenantId
            associated_retention_sub_payment_id: $associatedRetentionSubPaymentId
            retention_id: $retentionId
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
        mutation CreateClaimInPaytrade(
          $withholdPaymentReason: String
          $tenantId: String!
          $syncId: String
          $invoiceId: String!
          $associatedRetentionSubPaymentId: Float
          $retentionId: Float
        ) {
          createClaimInPaytrade(
            withhold_payment_reason: $withholdPaymentReason
            tenant_id: $tenantId
            sync_id: $syncId
            invoice_id: $invoiceId
            associated_retention_sub_payment_id: $associatedRetentionSubPaymentId
            retention_id: $retentionId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
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

    if (response?.data?.createPaymentInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.createPaymentInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createPaymentInXero?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
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

    if (
      response?.data?.createOverPaymentRefundInXero?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createOverPaymentRefundInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createOverPaymentRefundInXero?.message);
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

    if (
      response?.data?.syncAllPaymentsByCompanyId?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.syncAllPaymentsByCompanyId?.message);
      return true;
    } else {
      showErrorToast(response?.data?.syncAllPaymentsByCompanyId?.message);
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

    if (
      response?.data?.createOverPaymentInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createOverPaymentInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createOverPaymentInXero?.message);
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

    if (response?.data?.deletePaymentInXero?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.deletePaymentInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.deletePaymentInXero?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
    return false;
  } finally {
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
    if (response?.data?.getOrganisation?.status === ApiResponse.SUCCESS) {
      return response?.data?.getOrganisation?.data?.short_code;
    } else {
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);
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

    if (
      response?.data?.createCreditNotesInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.createCreditNotesInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.createCreditNotesInXero?.message);
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

    if (
      response?.data?.deleteCreditNotesInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.deleteCreditNotesInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.deleteCreditNotesInXero?.message);
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

    if (
      response?.data?.deleteOverPaymentInXero?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.deleteOverPaymentInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.deleteOverPaymentInXero?.message);
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

    if (
      response?.data?.deleteOverPaymentRefundInXero?.status ===
      ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.deleteOverPaymentRefundInXero?.message);
      return true;
    } else {
      showErrorToast(response?.data?.deleteOverPaymentRefundInXero?.message);
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
        mutation CreateClaimInPaytrade(
          $associatedRetentionSubPaymentId: Float
          $claimsWithReason: [ClaimReasonInput!]
          $compulsoryAttachmentIds: [String!]
          $invoiceId: String!
          $retentionId: Float
          $syncId: String
          $tenantId: String!
        ) {
          createClaimInPaytrade(
            associated_retention_sub_payment_id: $associatedRetentionSubPaymentId
            claims_with_reason: $claimsWithReason
            compulsory_attachment_ids: $compulsoryAttachmentIds
            invoice_id: $invoiceId
            retention_id: $retentionId
            sync_id: $syncId
            tenant_id: $tenantId
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
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
          $contactId: String!
          $tenantId: String!
          $syncId: String
          $projectId: Float
          $paymentClaimId: Float
          $associatedPaymentId: Float
          $associatedOverpaymentId: Float
          $overpaymentId: String
        ) {
          checkAndCreateOverPaymentAndRefunds(
            contact_id: $contactId
            tenant_id: $tenantId
            sync_id: $syncId
            project_id: $projectId
            payment_claim_id: $paymentClaimId
            associated_payment_id: $associatedPaymentId
            associated_overpayment_id: $associatedOverpaymentId
            overpayment_id: $overpaymentId
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
