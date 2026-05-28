import { ERROR, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function postAddClientSuppliersFormData(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertClientSupplierDetails(
          $createClientSuppliersDetailInput: CreateClientSuppliersDetailInput!
        ) {
          insertClientSupplierDetails(
            createClientSuppliersDetailInput: $createClientSuppliersDetailInput
          ) {
            data {
              client_supplier_id
              client_supplier_name
              client_supplier_status
              company_id
              id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.insertClientSupplierDetails?.status === SUCCESS) {
      return {
        status: true,
        message: response?.data?.insertClientSupplierDetails?.message,
        // Task #41 — surface supplier_id so the caller can persist the
        // per-supplier Xero account code override after a fresh insert.
        client_supplier_id:
          response?.data?.insertClientSupplierDetails?.data?.client_supplier_id,
      };
    }
    if (response?.data?.insertClientSupplierDetails?.status === ERROR) {
      showErrorToast(response?.data?.insertClientSupplierDetails?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function updateClientSuppliersById(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation EditClientSuppliersDetailsById(
          $updateClientSuppliersDetailInput: UpdateClientSuppliersDetailInput!
        ) {
          editClientSuppliersDetailsById(
            updateClientSuppliersDetailInput: $updateClientSuppliersDetailInput
          ) {
            data {
              client_supplier_id
              client_supplier_name
              client_supplier_status
              company_id
              id
              # Task #154 — items waiting for email to be added.
              pending_resolutions {
                email_just_added
                smart_creates_attempted
                blocked_notices_count
                smart_creates {
                  invoice_id
                  status
                  reason
                  contract_id
                }
              }
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.editClientSuppliersDetailsById?.status === SUCCESS) {
      return {
        status: true,
        message: response?.data?.editClientSuppliersDetailsById?.message,
        // Task #41 — surface supplier_id for post-save Xero account code
        // override calls.
        client_supplier_id:
          response?.data?.editClientSuppliersDetailsById?.data
            ?.client_supplier_id,
        // Task #154 — pass through to the page so it can show the
        // "N items were waiting" prompt.
        pending_resolutions:
          response?.data?.editClientSuppliersDetailsById?.data
            ?.pending_resolutions || null,
      };
    }
    if (response?.data?.editClientSuppliersDetailsById?.status === ERROR) {
      showErrorToast(response?.data?.editClientSuppliersDetailsById?.message);
      return false;
    }
    // Neither SUCCESS nor ERROR — surface the unexpected shape instead of
    // silently returning undefined, which would leave the user staring at a
    // closed dialog with nothing persisted and no feedback.
    console.error(
      "EditClientSuppliersDetailsById unexpected response:",
      response,
    );
    showErrorToast(
      response?.data?.editClientSuppliersDetailsById?.message ||
        "Save did not complete — please check the console for details.",
    );
    return false;
  } catch (error: any) {
    // GraphQL / network failure. Most common cause here is schema-validation
    // rejection at Apollo Server (field mismatch between FE & deployed BE),
    // class-validator rejection on the input DTO, or a 4xx/5xx from the
    // proxy. Logging + a toast turns a silent failure into a debuggable one.
    console.error("EditClientSuppliersDetailsById failed:", error);
    const gqlMsg =
      error?.graphQLErrors?.[0]?.message ||
      error?.networkError?.result?.errors?.[0]?.message ||
      error?.networkError?.message ||
      error?.message;
    showErrorToast(gqlMsg || "Could not save — please try again.");
    return false;
  }
}

export async function verifyClientSuppliersExistence(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckExistenceForClient(
          $clientSupplierType: String!
          $companyId: Float!
          $clientEmailId: String
          $clientSupplierName: String
          $qbccNumber: String
        ) {
          checkExistenceForClient(
            client_supplier_type: $clientSupplierType
            company_id: $companyId
            client_email_id: $clientEmailId
            client_supplier_name: $clientSupplierName
            qbcc_number: $qbccNumber
          ) {
            data {
              client_email_id
              client_supplier_id
              client_supplier_name
              client_supplier_status
              client_supplier_type
              company_id
              id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.checkExistenceForClient?.status === SUCCESS) {
      return response?.data?.checkExistenceForClient?.data;
    }
    if (response?.data?.checkExistenceForClient?.status === ERROR) {
      showErrorToast(response?.data?.checkExistenceForClient?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchClientSuppliersList(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetClientSupplierListsForCompany(
          $getClientSupplierListsInput: GetClientSuppliersListsInput!
        ) {
          getClientSupplierListsForCompany(
            getClientSupplierListsInput: $getClientSupplierListsInput
          ) {
            data {
              client_suppliers_list {
                abn_number
                acn_number
                business_name
                claim_count
                client_email_id
                # Task #154 — surfaces "Missing email" badge in list view.
                needs_email
                client_phone_no
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_status
                client_supplier_type
                client_website
                company_id
                contract_count
                country
                created_by
                created_on
                entity_type
                id
                latitude
                longitude
                payment_terms
                place_id
                qbcc_number
                region
                related_entity
                tfn_number
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getClientSupplierListsForCompany?.status === SUCCESS) {
      return response?.data?.getClientSupplierListsForCompany?.data;
    }
    if (response?.data?.getClientSupplierListsForCompany?.status === ERROR) {
      showErrorToast(response?.data?.getClientSupplierListsForCompany?.message);
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function fetchClientSuppliersById(postData: any): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ViewClientSuppliersDetails($id: String!) {
          viewClientSuppliersDetails(id: $id) {
            data {
              abn_number
              acn_number
              business_name
              client_email_id
              # Task #154 — surfaces "Missing email" badge in detail view.
              needs_email
              client_phone_no
              client_supplier_address
              client_supplier_id
              client_supplier_name
              client_supplier_status
              client_supplier_type
              client_website
              company_id
              country
              created_by
              created_on
              entity_type
              id
              latitude
              longitude
              payment_terms
              place_id
              qbcc_number
              region
              related_entity
              tfn_number
              xero_default_account_code
              xero_project_account_code_overrides {
                id
                project_id
                project_name
                account_code
              }
              account_details {
                account_name
                account_number
                account_type
                bsb_number
                client_supplier_id
                id
              }
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.viewClientSuppliersDetails?.status === SUCCESS) {
      return response?.data?.viewClientSuppliersDetails?.data;
    }
    if (response?.data?.viewClientSuppliersDetails?.status === ERROR) {
      showErrorToast(response?.data?.viewClientSuppliersDetails?.message);
      return null;
    }
  } catch (error: any) {
    return null;
  }
}

export async function deleteClientSuppliersById(postData: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateClientSuppliersStatusById(
          $id: String!
          $isDeleted: Boolean!
        ) {
          updateClientSuppliersStatusById(id: $id, is_deleted: $isDeleted) {
            data {
              client_supplier_id
              client_supplier_name
              client_supplier_status
              company_id
              id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.updateClientSuppliersStatusById?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.updateClientSuppliersStatusById?.message
      );
      return true;
    }
    if (response?.data?.updateClientSuppliersStatusById?.status === ERROR) {
      showErrorToast(response?.data?.updateClientSuppliersStatusById?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export interface GetClientSuppliersListForProjectsInput {
  project_id: string;
  company_id: string;
}

export async function getClientSuppliersListByProjectId(
  postData: any
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetClientSuppliersListByProjectId(
          $getClientSuppliersListForProjectsInput: GetClientSuppliersListForProjectsInput!
        ) {
          getClientSuppliersListByProjectId(
            getClientSuppliersListForProjectsInput: $getClientSuppliersListForProjectsInput
          ) {
            data {
              client_suppliers_list {
                abn_number
                acn_number
                business_name
                claim_count
                client_email_id
                # Task #154 — surfaces "Missing email" badge in list view.
                needs_email
                client_phone_no
                client_supplier_address
                client_supplier_id
                client_supplier_name
                client_supplier_status
                client_supplier_type
                client_website
                company_id
                contract_count
                country
                created_by
                created_on
                entity_type
                id
                latitude
                longitude
                payment_terms
                place_id
                qbcc_number
                region
                related_entity
                tfn_number
              }
              total_count
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getClientSuppliersListByProjectId?.status === SUCCESS) {
      return response?.data?.getClientSuppliersListByProjectId?.data;
    }
    if (response?.data?.getClientSuppliersListByProjectId?.status === ERROR) {
      showErrorToast(
        response?.data?.getClientSuppliersListByProjectId?.message
      );
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export async function createContactInPaytradeFromXeroData(
  postData: any,
  showToast?: boolean
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContactInPaytrade(
          $syncId: String
          $companyId: Float!
          $contactId: String!
          $payload: CreateClientSuppliersDetailInput
        ) {
          createContactInPaytrade(
            sync_id: $syncId
            company_id: $companyId
            contact_id: $contactId
            payload: $payload
          ) {
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.createContactInPaytrade?.status === SUCCESS) {
      if (showToast) {
        showSuccessToast(
          response?.data?.createContactInPaytradeThroughWebhook?.message
        );
      }
      return {
        status: true,
        message: response?.data?.createContactInPaytrade?.message,
      };
    }
    if (response?.data?.createContactInPaytrade?.status === ERROR) {
      showErrorToast(response?.data?.createContactInPaytrade?.message);
      return false;
    }
  } catch (error: any) {
    return {};
  }
}

export async function CreateOrUpdateContactInPaytrade(
  postData: any,
  showToast?: boolean
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateOrUpdateContactInPaytrade(
          $companyId: Float!
          $contactId: String!
          $contactStatus: String!
          $payload: CreateClientSuppliersDetailInput
          $syncId: String
        ) {
          createOrUpdateContactInPaytrade(
            company_id: $companyId
            contact_id: $contactId
            contact_status: $contactStatus
            payload: $payload
            sync_id: $syncId
          ) {
            data {
              contact_id
              contact_name
              contact_status
              id
              mapped_status
              xero_contact_id
            }
            message
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    const res = response?.data?.createOrUpdateContactInPaytrade;
    if (res?.status === ApiResponse.XERO_REFRESH && res?.message) {
      window.open(res.message, "_self");
      return null; // stop further flow
    }
    if (res?.status === SUCCESS) {
      if (showToast) {
        showSuccessToast(
          response?.data?.createContactInPaytradeThroughWebhook?.message
        );
      }
      return {
        status: true,
        message: res?.message,
      };
    }
    if (res?.status === ERROR) {
      showErrorToast(res?.message);
      return false;
    }
  } catch (error: any) {
    return {};
  }
}

export async function createContactInPaytradeThroughWebhookFromXeroData(
  postData: any,
  showToast?: boolean
): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation CreateContactInPaytradeThroughWebhook(
          $syncId: String
          $tenantId: String!
          $payload: CreateClientSuppliersDetailInput
          $contactId: String!
        ) {
          createContactInPaytradeThroughWebhook(
            sync_id: $syncId
            tenant_id: $tenantId
            payload: $payload
            contact_id: $contactId
          ) {
            message
            data {
              contact_id
              contact_name
              contact_status
              id
              mapped_status
              xero_contact_id
            }
            status
          }
        }
      `,
      variables: postData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.createContactInPaytradeThroughWebhook?.status === SUCCESS
    ) {
      if (showToast) {
        showSuccessToast(
          response?.data?.createContactInPaytradeThroughWebhook?.message
        );
      }
      return {
        status: true,
        message: response?.data?.createContactInPaytradeThroughWebhook?.message,
      };
    }
    if (
      response?.data?.createContactInPaytradeThroughWebhook?.status === ERROR
    ) {
      showErrorToast(
        response?.data?.createContactInPaytradeThroughWebhook?.message
      );
      return false;
    }
  } catch (error: any) {
    return {};
  }
}
