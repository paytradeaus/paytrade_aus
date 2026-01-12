import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import axios from "axios";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ERROR, SUCCESS } from "@/app/message";
import { getCookie } from "cookies-next";

const SOMETHING_WENT_WRONG = "Something went wrong !";

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URI,
});

const authLink = setContext((_, { headers }) => {
  if (typeof window === "undefined") return { headers };

  const token = localStorage.getItem("accessToken") || "";
  let companyId =
    localStorage.getItem("companyId") || getCookie("companyId") || "";
  if (companyId === "undefined") {
    companyId = localStorage.getItem("UserCompanyId") || "";
  }
  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
      ...(companyId && { companyId }),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "no-cache",
      errorPolicy: "ignore",
    },
    query: {
      fetchPolicy: "no-cache",
      errorPolicy: "all",
    },
  },
});

export interface CheckUserResponse {
  data: {
    email_id: string; // Change this based on the actual response structure
  } | null; // Change this based on the actual response structure
}

export const CheckUserExistence = async (
  emailId: string
): Promise<CheckUserResponse | any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckUserExistence($emailId: String!) {
          checkUserExistence(email_id: $emailId) {
            data {
              email_id
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId,
      },
    });

    return response?.data?.checkUserExistence?.data || [];
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return [];
  }
};

export const CheckAdminExistence = async (emailId: string): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckAdminExistence($emailId: String!) {
          checkAdminExistence(email_id: $emailId) {
            status
            message
            data {
              admin_role
              admin_status
              created_on
              email_id
              first_name
              id
              last_logged_in
              last_name
            }
          }
        }
      `,
      variables: {
        emailId,
      },
    });
    if (response?.data?.checkAdminExistence?.data == null) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return false;
  }
};

export const insertUserDetails = async (inputData: Object) => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertUserDetails($createSignupInput: CreateSignupInput!) {
          insertUserDetails(createSignupInput: $createSignupInput) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: {
        createSignupInput: {
          ...inputData,
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });

    // Handle the response as needed
    if (response?.data?.insertUserDetails?.status === "SUCCESS") {
      return response.data.insertUserDetails?.data?.access_token;
    }
    if (response?.data?.insertUserDetails?.status === "ERROR") {
      showErrorToast(response?.data?.insertUserDetails?.message);
      return null;
    }
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertUserDetails:", error);
    return error;
  }
};

export const singleUploadApi = async (
  fileData: any,
  userData: any,
  accessToken: any
) => {
  let formData = new FormData();

  // Properly stringify the userData object
  const createFileUploadInput = JSON.parse(JSON.stringify(userData));

  formData.append(
    "operations",
    JSON.stringify({
      query:
        "mutation FileUpload($createFileUploadInput: CreateFileUploadInput!, $file: Upload!) { fileUpload(createFileUploadInput: $createFileUploadInput, file: $file) { data {file attachment_type file_path file_type id } message status } }",
      variables: {
        createFileUploadInput: createFileUploadInput,
        file: null,
      },
    })
  );
  formData.append("map", '{"0":["variables.file"]}');
  formData.append("0", fileData);
  const headers = {
    "Content-Type": "multipart/form-data",
    "apollo-require-preflight": true,
    authorization: "Bearer " + accessToken,
  };
  let url = `${process.env.NEXT_PUBLIC_GRAPHQL_URI}`;
  try {
    const response: any = await axios.post(url, formData, { headers });

    // Handle response as needed

    if (response?.data?.data?.fileUpload?.status === SUCCESS) {
      return response?.data?.data?.fileUpload?.data;
    } else {
      return response?.errors || false;
    }
  } catch (err) {
    console.error("error", err);
    return false;
    // Handle error as needed
  }
};

export const checkCompanyInviteAndUpdate = async (): Promise<string> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation CheckCompanyInviteAndUpdate {
          checkCompanyInviteAndUpdate {
            message
            status
          }
        }
      `,
    });

    // Log the data from the response

    // Return relevant data from the response
    return response.data.checkCompanyInviteAndUpdate?.message;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in checkCompanyInviteAndUpdate:", error);
    throw error;
  }
};

export async function insertIncorrectEmailVerificationDetails(
  createEmailVerificationInput: any
) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetails(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetails(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createEmailVerificationInput,
      },
    });

    if (response?.data?.insertEmailVerificationDetails?.status === SUCCESS) {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === ERROR) {
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error: any) {
    // Handle errors
    // Example: toast.error("Failed to insert email verification details");
    throw new Error("Error in API call: " + error.message);
  }
}

export const CheckQbccExistence = async (qbccNumber: string): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckQbccExistence($qbccNumber: String!) {
          checkQbccExistence(qbcc_number: $qbccNumber) {
            data {
              company_id
              company_name
            }
            message
            status
          }
        }
      `,
      variables: {
        qbccNumber,
      },
    });
    if (response?.data?.checkQbccExistence?.data[0]?.company_id) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return false;
  }
};

interface CreateUserAccessInput {
  user_id?: any;
  // Add other properties as needed
}

export const requestToJoinCompany = async (
  createUserAccessInput: CreateUserAccessInput,
  token?: string
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation RequestToJoinCompany(
          $createUserAccessInput: CreateJoinUserAccessInput!
        ) {
          requestToJoinCompany(createUserAccessInput: $createUserAccessInput) {
            message
            status
          }
        }
      `,
      variables: {
        createUserAccessInput,
      },
    });

    // Log the data from the response
    if (response?.data?.requestToJoinCompany?.status === "SUCCESS") {
      return response?.data?.requestToJoinCompany?.message;
    }
    if (response?.data?.requestToJoinCompany?.status === "ERROR") {
      showErrorToast(
        response?.data?.requestToJoinCompany?.message || SOMETHING_WENT_WRONG
      );
      return false;
    }
    return false;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    console.error("GraphQL Error in requestToJoinCompany:", error);
    throw error;
  }
};

export const CheckCompanyEmailExistence = async (
  email: string
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query CheckCompanyEmailExistence($companyEmail: String!) {
          checkCompanyEmailExistence(company_email: $companyEmail) {
            message
            status
          }
        }
      `,
      variables: {
        companyEmail: email,
      },
    });
    return response?.data?.checkCompanyEmailExistence?.message || "";
  } catch (error: any) {
    // Handle GraphQL errors
    console.error("GraphQL Error in checkCompanyEmailExistence:", error);
    return "";
  }
};

export async function updateBusinessDetails(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateCompanyDetails(
          $updateCompanySignupInput: UpdateCompanySignupInput!
        ) {
          updateCompanyDetails(
            updateCompanySignupInput: $updateCompanySignupInput
          ) {
            data {
              abn_number
              accounting_system
              acn_number
              cis_rate
              company_address
              company_email_id
              company_id
              company_name
              company_number
              company_phone_no
              country
              entity_type
              expiry_date
              file
              file_path
              file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              plan_name
              plan_type
              qbcc_number
              region
              signature
              signature_type
              subscription_id
              tfn_number
              utr_number
              vat_number
            }
            message
            status
          }
        }
      `,
      variables: { updateCompanySignupInput: inputData },
    });
    if (response?.data?.updateCompanyDetails?.status === SUCCESS) {
      return response?.data?.updateCompanyDetails?.data;
    } else {
      showErrorToast(response?.data?.updateCompanyDetails?.message);
      return null;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
  }
}

export const insertCompanyDetails = async (
  inputData: Object,
  token?: string
): Promise<any> => {
  try {
    console.error("Input Data1:", inputData);
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation InsertCompanyDetails(
          $createCompanySignupInput: CreateCompanySignupInput!
        ) {
          insertCompanyDetails(
            createCompanySignupInput: $createCompanySignupInput
          ) {
            data {
              abn_number
              accounting_system
              acn_number
              cis_rate
              company_address
              company_email_id
              company_id
              company_name
              company_number
              company_phone_no
              country
              entity_type
              expiry_date
              file
              file_path
              file_type
              id
              is_admin_blocked
              is_verified
              latitude
              legal_company_name
              longitude
              place_id
              plan_name
              plan_type
              qbcc_number
              region
              subscription_id
              tfn_number
              utr_number
              vat_number
            }
            message
            status
          }
        }
      `,
      variables: {
        createCompanySignupInput: inputData,
      },
    });

    // Handle the response as needed
    if (response?.data?.insertCompanyDetails?.status === "SUCCESS") {
      return response?.data?.insertCompanyDetails?.data;
    }
    if (response?.data?.insertCompanyDetails?.status === "ERROR") {
      showErrorToast(response?.data?.insertCompanyDetails?.message);
      return null;
    }
    // Return the array of company profiles with logos
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertCompanyDetails:", error);
    console.error("Input Data:", inputData);
    throw error;
  }
};

export const getAuthToken = async (
  emailId: string,
  isAdmin: boolean
): Promise<string | null> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetAuthToken($emailId: String!, $isAdmin: Boolean!) {
          getAuthToken(email_id: $emailId, is_admin: $isAdmin) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId: emailId,
        isAdmin: isAdmin,
      },
    });

    // Return the access token
    return response.data?.getAuthToken?.data?.access_token || null;
  } catch (error) {
    // Handle errors appropriately, for example, show a toast notification
    throw error;
  }
};

export const multipleFileUploadApi = async (
  fileData: any[],
  userData: any[],
  accessToken: any,
  noToaster?: boolean
) => {
  let formData = new FormData();

  formData.append(
    "operations",
    JSON.stringify({
      query:
        "mutation MultipleFilesUpload($uploadMultipleFilesInput: UploadMultipleFilesInput!) {multipleFilesUpload(uploadMultipleFilesInput: $uploadMultipleFilesInput) {data {attachment_type file file_path file_type file_name id} message status}}",
      variables: {
        uploadMultipleFilesInput: {
          files: Array.from({ length: fileData.length }, () => null), // Array with null values of the same length as fileData
          detailsOfFiles: userData,
        },
      },
    })
  );
  // Build the map object based on the fileData length and userData length
  let mapObject: { [key: string]: string[] } = {};
  for (let i = 0; i < fileData.length; i++) {
    mapObject[i] = [`variables.uploadMultipleFilesInput.files.${i}`];
  }
  userData?.forEach((data: any, index: number) => {
    mapObject[`variables.uploadMultipleFilesInput.detailsOfFiles.${index}`] = [
      `detailsOfFiles.${index}`,
    ];
  });
  formData.append("map", JSON.stringify(mapObject));
  // Append each file data to the FormData
  fileData.forEach((file: any, index: number) => {
    formData.append(`${index}`, file);
  });
  const headers = {
    "Content-Type": "multipart/form-data",
    "apollo-require-preflight": true,
    authorization: "Bearer " + accessToken,
  };
  let url = `${process.env.NEXT_PUBLIC_GRAPHQL_URI}`;
  try {
    const response = await axios.post(url, formData, { headers });
    // Handle response as needed
    if (response?.data?.data?.multipleFilesUpload?.status === SUCCESS) {
      return response?.data?.data?.multipleFilesUpload?.data;
    } else {
      {
        noToaster
          ? null
          : showErrorToast(
              response?.data?.data?.multipleFilesUpload?.message ||
                SOMETHING_WENT_WRONG
            );
      }
      console.error(
        "error",
        response?.data?.data?.multipleFilesUpload?.message ||
          SOMETHING_WENT_WRONG
      );
      return [];
    }
  } catch (err) {
    console.error("error", err);
    return [];
    // Handle error as needed
  }
};

export const DeleteTrustTrainingRecordById = async (
  data: any
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteTrustTrainingRecordsById(
          $companyId: Float!
          $idArray: [String!]!
        ) {
          deleteTrustTrainingRecordsById(
            companyId: $companyId
            idArray: $idArray
          ) {
            message
            status
          }
        }
      `,
      variables: data,
    });
    if (response?.data?.deleteTrustTrainingRecordsById?.status === "SUCCESS") {
      return response?.data?.deleteTrustTrainingRecordsById?.data;
    }
    if (response?.data?.deleteTrustTrainingRecordsById?.status === "ERROR") {
      return [];
    }
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
};

export const fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
          $payload: FetchFiltersOfPaymentClaimsPaymentsAndRetentionsListInput!
        ) {
          fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
            payload: $payload
          ) {
            data {
              clientSuppliers {
                client_supplier_id
                client_supplier_name
                client_supplier_type
              }
              contracts {
                contract_id
                contract_name
              }
              fromAccounts {
                from_account_id
                from_account_name
                from_account_type
              }
              projects {
                project_id
                project_name
              }
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });

    if (
      response &&
      response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
        .status === SUCCESS
    ) {
      return response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
        .data;
    }

    if (
      response &&
      response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
        .status === ERROR
    ) {
      showErrorToast(
        response.data.fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList
          .message
      );
      return null;
    }
  } catch (error: any) {
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function postAddClientSuppliersFormData(
  postData: any
): Promise<any> {
  try {
    // console.log(postData, "createClientSuppliersDetailInput payload");

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
      };
    }
    if (response?.data?.insertClientSupplierDetails?.status === ERROR) {
      showErrorToast(response?.data?.insertClientSupplierDetails?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    return false;
  }
}

export async function updateClientSuppliersById(postData: any): Promise<any> {
  try {
    // console.log(postData, "updateClientSuppliersDetailInput payload");
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
      };
    }
    if (response?.data?.editClientSuppliersDetailsById?.status === ERROR) {
      showErrorToast(response?.data?.editClientSuppliersDetailsById?.message);
      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
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
          $companyId: Float!
          $clientSupplierName: String
          $clientEmailId: String
          $qbccNumber: String
        ) {
          checkExistenceForClient(
            company_id: $companyId
            client_supplier_name: $clientSupplierName
            client_email_id: $clientEmailId
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
      console.error(response?.data?.checkExistenceForClient?.message);
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
      console.error(response?.data?.getClientSupplierListsForCompany?.message);
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
    console.error("GraphQL Error:", error);
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
      console.error(response?.data?.getClientSuppliersListByProjectId?.message);
      showErrorToast(
        response?.data?.getClientSuppliersListByProjectId?.message
      );
      return {};
    }
  } catch (error: any) {
    return {};
  }
}

export default apolloClient;
