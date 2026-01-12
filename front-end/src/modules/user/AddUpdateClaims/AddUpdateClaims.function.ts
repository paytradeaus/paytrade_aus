import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

type GetProjectsListInput = {
  client_supplier_id: number;
};
type GetContractsListInput = {
  client_supplier_id: number;
  project_id: number;
};

async function getProjectsLists(
  companyId: number,
  isArchived?: any
): Promise<any[] | null> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Query($companyId: Float!, $isArchived: Boolean) {
          getProjectsLists(company_id: $companyId, is_archived: $isArchived) {
            data {
              id
              project_id
              project_name
              project_role
              project_status
              pta_eligibility
              rta_eligibility
            }
            message
            status
          }
        }
      `,
      variables: {
        companyId,
        isArchived: isArchived || false,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.getProjectsLists?.status === ApiResponse.SUCCESS) {
      return response?.data?.getProjectsLists?.data;
    }
    if (response?.data?.getProjectsLists?.status === ApiResponse.ERROR) {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function getProjectsListByClientSupplierId(
  payload: GetProjectsListInput,
  setLoading?: Function
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetProjectsListByClientSupplierId(
          $getProjectsListInput: GetProjectsListInput!
        ) {
          getProjectsListByClientSupplierId(
            getProjectsListInput: $getProjectsListInput
          ) {
            data {
              id
              project_id
              project_name
              project_role
              project_status
              pta_eligibility
              rta_eligibility
            }
            message
            status
          }
        }
      `,
      variables: {
        getProjectsListInput: payload,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getProjectsListByClientSupplierId?.status === "SUCCESS"
    ) {
      return response?.data?.getProjectsListByClientSupplierId?.data;
    }
    if (response?.data?.getProjectsListByClientSupplierId?.status === "ERROR") {
      showErrorToast(
        response?.data?.getProjectsListByClientSupplierId?.message
      );
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function getContractsListByClientSupplierId(
  payload: GetContractsListInput
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetContractsListByClientSupplierId(
          $getContractsListInput: GetContractsListInput!
        ) {
          getContractsListByClientSupplierId(
            getContractsListInput: $getContractsListInput
          ) {
            data {
              claim_amount
              client_supplier_id
              client_supplier_role
              contract_date
              contract_id
              contract_name
              contract_status
              contract_type
              defect_liability_end_date
              id
              initial_contract_sum
              payment_terms
              project_id
              retention_type
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        getContractsListInput: payload,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.getContractsListByClientSupplierId?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.getContractsListByClientSupplierId?.data;
    }
    if (
      response?.data?.getContractsListByClientSupplierId?.status ===
      ApiResponse.ERROR
    ) {
      showErrorToast(
        response?.data?.getContractsListByClientSupplierId?.message
      );
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function getContractListsForCompany(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetContractListsForCompany(
          $getContractListsInput: GetContractListsInput!
        ) {
          getContractListsForCompany(
            getContractListsInput: $getContractListsInput
          ) {
            data {
              contract_list {
                attachment_id
                buyer_name
                client_supplier_id
                client_supplier_name
                client_supplier_role
                client_supplier_type
                company_id
                company_name
                contract_date
                contract_id
                contract_name
                contract_start_date
                contract_status
                contract_type
                defect_liability_end_date
                formatted_initial_contract_sum
                formatted_variation_amount
                id
                initial_contract_sum
                payment_from_account
                payment_terms
                payment_to_account
                previous_status
                project_id
                project_name
                project_status
                retention_from_account
                retention_type
                seller_name
                variation_amount
              }
              project_list {
                project_id
                project_name
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        getContractListsInput: {
          company_id: data?.company_id,
          page_number: data?.page_number,
          page_size: data?.page_size,
          search: data?.search,
          date_filter: data?.dateFilter || null,
          start_date: data?.startDate || null,
          end_date: data?.endDate || null,
          contract_status: data?.contract_status || null,
          project_id: data?.project_id || null,
          client_supplier_type: data?.client_supplier_type || null,
          isAlphabeticalOrder: data?.isAlphabeticalOrder || null,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.getContractListsForCompany?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.getContractListsForCompany?.data;
    }
    if (
      response?.data?.getContractListsForCompany?.status === ApiResponse.ERROR
    ) {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function fetchClientSupplierDetailsForPaymentClaim(
  payload: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchClientSupplierDetailsForPaymentClaim(
          $payload: FetchClientSupplierDetailsForPaymentClaimInput!
        ) {
          fetchClientSupplierDetailsForPaymentClaim(payload: $payload) {
            data {
              claim_amount
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_type
              initial_contract_sum
              payment_from_account
              payment_from_account_bsb_number
              payment_from_account_name
              payment_from_account_number
              payment_from_account_type
              payment_terms
              payment_to_account
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_to_account_type
              variation_amount
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.fetchClientSupplierDetailsForPaymentClaim?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchClientSupplierDetailsForPaymentClaim?.data;
    }
    if (
      response?.data?.fetchClientSupplierDetailsForPaymentClaim?.status ===
      ApiResponse.ERROR
    ) {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function addPaymentClaim(payload: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AddPaymentClaim($payload: AddPaymentClaimInput!) {
          addPaymentClaim(payload: $payload) {
            data {
              notices {
                notice_previews {
                  file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                  mail_uuid
                }
                qbcc_notice_previews {
                  notice_uuid
                  qbcc_file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                }
              }
              payment_claim_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
    });

    // Handle the response as needed
    if (response?.data?.addPaymentClaim?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.addPaymentClaim?.message);
      return response?.data?.addPaymentClaim?.data;
    } else if (response?.data?.addPaymentClaim?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.addPaymentClaim?.message);
      return false;
    }
    // Return the data
    return false;
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message ?? ApiResponse.SOMETHING_WENT_WRONG);
  }
}

async function TriggerPaymentClaimNotices(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation TriggerPaymentClaimNotices(
          $payload: triggerPaymentClaimNoticesInput!
        ) {
          triggerPaymentClaimNotices(payload: $payload) {
            data {
              notice_previews {
                file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
                mail_uuid
              }
              qbcc_notice_previews {
                notice_uuid
                qbcc_file_details {
                  attachment_type
                  file
                  file_name
                  file_path
                  file_type
                  id
                }
              }
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    const res = response?.data?.triggerPaymentClaimNotices;
    if (res?.status === ApiResponse.SUCCESS) {
      showSuccessToast(res?.message);
      // ✅ return the previews instead of just true
      // return res?.data?.notice_previews || [];
      return {
        notice_previews: res?.data?.notice_previews || [],
        qbcc_notice_previews: res?.data?.qbcc_notice_previews || [],
      };
    } else if (res?.status === ApiResponse.ERROR) {
      showErrorToast(res?.message);
      return { notice_previews: [], qbcc_notice_previews: [] };
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return false;
  }
}

async function getNoticesListServices(data: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllNotices($payload: ListAllNoticesInput!) {
          listAllNotices(payload: $payload) {
            data {
              notices_list {
                account_name
                bank_account_id
                bank_account_type
                company_id
                company_name
                contract_id
                contract_name
                contract_uuid
                id
                notice_date
                notice_document_gen_failed
                notice_id
                notice_source
                notice_type
                payment_claim_id
                payment_id
                project_id
                project_name
                source_claim_details {
                  beneficiary_type
                  cash_retention_type
                  claim_type
                  payments {
                    payment_id
                    payment_type
                  }
                }
                source_type
                status
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: data,
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.listAllNotices?.status === ApiResponse.SUCCESS) {
      return response?.data?.listAllNotices?.data;
    }
    if (response?.data?.listAllNotices?.status === ApiResponse.ERROR) {
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function fetchDetailsOfAPaymentClaim(payload: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchDetailsOfAPaymentClaim(
          $payload: FetchDetailsOfAPaymentClaimInput!
        ) {
          fetchDetailsOfAPaymentClaim(payload: $payload) {
            data {
              all_subcontracts_paid
              associated_retention_sub_payment_id
              beneficiary_type
              cash_retention
              cash_retention_type
              claim_amount
              claim_overview_buttons
              claim_reference
              claim_type
              client_supplier_address
              client_supplier_id
              client_supplier_name
              contract_id
              contract_name
              created_on
              due_date
              gst_summary
              initial_contract_sum
              invoices {
                description
                gst
                payment_claim_id
                quantity
                total_amount_including_gst
                unit_price
              }
              is_gst_optional
              list_status
              memo
              notice_ids
              payment_claim_id
              payment_from_account_bsb_number
              payment_from_account_name
              payment_from_account_number
              payment_from_account_type
              payment_terms
              payment_to_account_bsb_number
              payment_to_account_name
              payment_to_account_number
              payment_to_account_type
              previous_claim_amount
              project_id
              project_name
              received_date
              retained_amount
              retention_amount
              retention_amount_with_gst
              retention_id
              retention_percentage
              s75_applicable
              sent_date
              status
              status_in_ui
              sub_total_summary
              variation_amount
              project_role
              client_supplier_role
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.fetchDetailsOfAPaymentClaim?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchDetailsOfAPaymentClaim?.data;
    }
    if (
      response?.data?.fetchDetailsOfAPaymentClaim?.status === ApiResponse.ERROR
    ) {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function editDetailsOfAPaymentClaim(payload: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditDetailsOfAPaymentClaim(
          $payload: EditDetailsOfAPaymentClaimInput!
        ) {
          editDetailsOfAPaymentClaim(payload: $payload) {
            data {
              notices {
                notice_previews {
                  file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                  mail_uuid
                }
                qbcc_notice_previews {
                  notice_uuid
                  qbcc_file_details {
                    attachment_type
                    file
                    file_name
                    file_path
                    file_type
                    id
                  }
                }
              }
              payment_claim_id
            }
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.editDetailsOfAPaymentClaim?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.editDetailsOfAPaymentClaim?.message);
      return response?.data?.editDetailsOfAPaymentClaim?.data;
    }
    if (
      response?.data?.editDetailsOfAPaymentClaim?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.editDetailsOfAPaymentClaim?.message);

      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return false;
  }
}

async function fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
  payload: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
          $payload: FetchPaymentToAccountListOfSelectedSupplierInput!
        ) {
          fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
            payload: $payload
          ) {
            data {
              client_supplier_address
              payment_from_account_details {
                payment_from_account_bsb_number
                payment_from_account_id
                payment_from_account_name
                payment_from_account_number
                payment_from_account_type
              }
              payment_to_accounts_list {
                payment_to_account_bsb_number
                payment_to_account_id
                payment_to_account_name
                payment_to_account_number
                payment_to_account_type
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data
        ?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier
        ?.status === ApiResponse.SUCCESS
    ) {
      return response?.data
        ?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier
        ?.data;
    }

    if (
      response?.data
        ?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier
        ?.status === ApiResponse.ERROR
    ) {
      // Optionally, show an error message
      // toast.error(response?.data?.fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier?.message);
      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

async function fetchDetailsOfAPaymentClaimForImport(
  payload: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchDetailsOfAPaymentClaimForImport(
          $fetchDetailsOfAPaymentClaimForImportId: String!
        ) {
          fetchDetailsOfAPaymentClaimForImport(
            id: $fetchDetailsOfAPaymentClaimForImportId
          ) {
            data {
              cash_retention_type
              claim_amount
              claim_type
              company_id
              invoice_list {
                description
                gst
                quantity
                total_amount_including_gst
                unit_price
              }
              is_gst_optional
              project_id
              gst_summary
              sub_total_summary
              retention_amount
              retention_amount_with_gst
              retention_percentage
              cash_retention
              formatted_claim_amount
              formatted_retention_amount
              formatted_retention_amount_with_gst
            }
            message
            status
          }
        }
      `,
      variables: {
        fetchDetailsOfAPaymentClaimForImportId:
          payload.fetchDetailsOfAPaymentClaimForImportId,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.fetchDetailsOfAPaymentClaimForImport?.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchDetailsOfAPaymentClaimForImport?.data;
    }
    if (
      response?.data?.fetchDetailsOfAPaymentClaimForImport?.status ===
      ApiResponse.ERROR
    ) {
      return null;
    }
    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
}

export const DownloadS75Template = async () => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query DownloadS75Template {
          downloadS75Template {
            message
            status
            data {
              file_name
              file_path
              id
              file
            }
          }
        }
      `,
      fetchPolicy: "no-cache",
    });

    const result = response?.data?.downloadS75Template;

    if (result?.status === ApiResponse.SUCCESS) {
      return result;
    } else if (result?.status === ApiResponse.ERROR) {
      showErrorToast(result?.message || ApiResponse.ERROR);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return false;
  }
};

// You can define a proper type if needed
export const fetchSubContractorClaimsByHeadContractor = async (
  payload: any,
  setLoading?: Function
): Promise<{ payment_claims: any[]; total_count: number } | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchSubContractorClaimsByHeadContractor(
          $payload: FetchSubContractorClaimsInput!
        ) {
          fetchSubContractorClaimsByHeadContractor(payload: $payload) {
            data {
              payment_claims {
                amount_paid
                cash_retention_type
                claim_amount
                claim_date
                claim_type
                client_supplier_id
                client_supplier_name
                client_supplier_role
                contract_date
                contract_id
                contract_name
                due_date
                formatted_claim_amount
                list_status
                payment_claim_id
                project_id
                project_name
                status
                unpaid_amount
                unpaid_reason
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    const resData = response?.data?.fetchSubContractorClaimsByHeadContractor;

    if (resData?.status === ApiResponse.SUCCESS) {
      return resData?.data;
    }

    if (resData?.status === ApiResponse.ERROR) {
      showErrorToast(resData?.message);

      return null;
    }

    return null;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function GenerateS75DocumentService(payload: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation GenerateS75Document($payload: GenerateS75NoticeInput!) {
          generateS75Document(payload: $payload) {
            file {
              attachment_id
              file_name
              file_path
              file_type
            }
            message
            status
          }
        }
      `,
      variables: { payload },
      fetchPolicy: "no-cache",
    });

    const result = response?.data?.generateS75Document;

    if (result?.status === ApiResponse.SUCCESS) {
      showSuccessToast(result.message);
      return true; // Return the file object so it can be downloaded
    } else if (result?.status === ApiResponse.ERROR) {
      // showErrorToast(result.message);
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  }
}

export {
  addPaymentClaim,
  getProjectsLists,
  getContractListsForCompany,
  getProjectsListByClientSupplierId,
  getContractsListByClientSupplierId,
  fetchClientSupplierDetailsForPaymentClaim,
  TriggerPaymentClaimNotices,
  getNoticesListServices,
  fetchDetailsOfAPaymentClaim,
  editDetailsOfAPaymentClaim,
  fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier,
  fetchDetailsOfAPaymentClaimForImport,
};
