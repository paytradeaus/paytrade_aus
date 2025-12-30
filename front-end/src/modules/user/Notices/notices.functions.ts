import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export interface NoticesListType {
  notice_date: string;
  bank_account_id: number;
  account_name: string;
  company_id: number;
  company_name: string;
  contract_id: number;
  notice_source: string;
  contract_name: string;
  notice_id: number;
  bank_account_type: string;
  notice_type: string;
  project_id: number;
  project_name: string;
  status: string;
  id: string;
}

export const fetchFiltersForAdminNotices = async (
  payload: any,
  setLoading?: Function
): Promise<any> => {
  try {
    setLoading && setLoading(true);

    const response = await apolloClient.query({
      query: gql`
        query FetchFiltersForAdminNotices(
          $payload: FetchFiltersForNoticeInput!
        ) {
          fetchFiltersForAdminNotices(payload: $payload) {
            data {
              account_list {
                account_type
                name
                opening_date
                value
              }
              account_type_list {
                name
                value
              }
              company_list {
                name
                value
              }
              notice_type_list {
                name
                value
              }
              project_list {
                name
                value
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
      response &&
      response.data.fetchFiltersForAdminNotices.status === "SUCCESS"
    ) {
      return response.data.fetchFiltersForAdminNotices.data;
    }

    if (
      response &&
      response.data.fetchFiltersForAdminNotices.status === "ERROR"
    ) {
      showErrorToast(response.data.fetchFiltersForAdminNotices.message);
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching filters for admin notices:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const getNoticesListServices = async (
  data: any,
  setLoading?: Function
): Promise<{ total_count: number; project_list: NoticesListType[] } | any> => {
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
                id
                notice_date
                notice_id
                notice_source
                notice_type
                payment_claim_id
                payment_id
                project_id
                project_name
                contract_uuid
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
    if (response?.data?.listAllNotices?.status === "SUCCESS") {
      return response?.data?.listAllNotices?.data;
    }
    if (response?.data?.listAllNotices?.status === "ERROR") {
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || "Something went wrong in the API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const FetchDetailsOfANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchDetailsOfANotice($payload: FetchDetailsOfANoticeInput!) {
          fetchDetailsOfANotice(payload: $payload) {
            data {
              ViewType
              bank_account_id
              bank_account_name
              bank_account_number
              client_supplier_id
              client_supplier_name
              client_supplier_type
              company_id
              company_name
              contract_date
              contract_id
              contract_name
              contract_uuid
              id
              memo_notes
              notice_id
              notice_source
              notice_type
              payment_claim_id
              project_date
              project_id
              project_name
              source_type
              status
              payment_id
              supportDoc {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              s75_file {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
                file
              }
              uploadedNotice {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              source_claim_details {
                beneficiary_type
                cash_retention_type
                claim_type
                payments {
                  payment_id
                  payment_type
                }
              }
              qbccNotice {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              notice_template {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
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
    });
    if (response?.data?.fetchDetailsOfANotice?.status === ApiResponse.SUCCESS) {
      return response?.data?.fetchDetailsOfANotice?.data;
    }
    if (response?.data?.fetchDetailsOfANotice?.status === ApiResponse.ERROR) {
      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  }
};
export const UpdateNotice = async (
  data: any,
  showToaster: boolean,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateNotice($payload: updateNoticesInput!) {
          updateNotice(payload: $payload) {
            data {
              notice_id
              status
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
    if (response?.data?.updateNotice?.status === ApiResponse.SUCCESS) {
      showToaster && showSuccessToast(response?.data?.updateNotice?.message);

      return true;
    }
    if (response?.data?.updateNotice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.updateNotice?.message);

      return false;
    }
    return false;
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const UploadReceivedNotice = async (
  data: any,
  showToaster: boolean,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UploadReceivedNotice($payload: generateNoticeInput!) {
          uploadReceivedNotice(payload: $payload) {
            data {
              notice_id
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

    const resData = response?.data?.uploadReceivedNotice;

    if (resData?.status === ApiResponse.SUCCESS) {
      showToaster && showSuccessToast(resData?.message);
      return resData?.data; // return notice_id object
    }

    if (resData?.status === ApiResponse.ERROR) {
      showErrorToast(resData?.message);
      return false;
    }

    return false;
  } catch (error: any) {
    showErrorToast(error?.message || ApiResponse.SOMETHING_WENT_WRONG);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const GenerateMailForANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation GenerateMailForANotice(
          $payload: GenerateMailForANoticeInput!
        ) {
          generateMailForANotice(payload: $payload) {
            data {
              id
              notice_mail_id
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
    if (
      response?.data?.generateMailForANotice?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.generateMailForANotice?.data;
    }
    if (response?.data?.generateMailForANotice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.generateMailForANotice?.message);

      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
export const ListAllMailsOfANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllMailsOfANotice($payload: ListAllMailsofANoticesInput!) {
          listAllMailsOfANotice(payload: $payload) {
            data {
              total_count
              mails_list {
                email_date
                email_from
                email_subject
                email_to
                id
                notice_id
                notice_mail_id
                client_supplier_name
                company_name
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
    if (response?.data?.listAllMailsOfANotice?.status === ApiResponse.SUCCESS) {
      return response?.data?.listAllMailsOfANotice?.data;
    }
    if (response?.data?.listAllMailsOfANotice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.listAllMailsOfANotice?.message);

      return null;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
