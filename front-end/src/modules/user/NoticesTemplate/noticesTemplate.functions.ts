import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";

export const SendSystemEmailToTheClients = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SendSystemEmailToTheClients($payload: SendSystemEmailInput!) {
          sendSystemEmailToTheClients(payload: $payload) {
            data {
              id
              status
            }
            message
            status
          }
        }
      `,
      variables: {
        payload: {
          ...data,
        },
      },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.sendSystemEmailToTheClients?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.sendSystemEmailToTheClients?.message ||
          "Email successfully sent and saved."
      );
      return true;
    }
    if (response?.data?.sendSystemEmailToTheClients?.status === ERROR) {
      console.error(response);
      showErrorToast(
        response?.data?.sendSystemEmailToTheClients?.message ||
          SOMETHING_WENT_WRONG
      );
      return false;
    }
  } catch (error: any) {
    showErrorToast(error.message || "somehting went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export const FetchEmailDetailsById = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query FetchEmailDetails($payload: FetchDetailsOfASystemEmailInput!) {
          fetchEmailDetails(payload: $payload) {
            data {
              attachments {
                attachmentImage
                attachment_type
                company_id
                id
                user_id
                file_name
                file_path
                file_type
              }
              body
              created_by
              created_on
              emailCcIds
              emailFromId
              id
              status
              subject
              toEmails
              type
            }
            message
            status
          }
        }
      `,
      variables: { payload: data },
      fetchPolicy: "no-cache",
    });
    if (response?.data?.fetchEmailDetails?.status === SUCCESS) {
      return response?.data?.fetchEmailDetails?.data;
    }
    if (response?.data?.fetchEmailDetails?.status === ERROR) {
      console.error(response?.data?.fetchEmailDetails?.message);
      showErrorToast(response?.data?.fetchEmailDetails?.message);
      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message || "somehting went wrong in API");
    console.error("GraphQL Error:", error);
    return {};
  } finally {
    setLoading && setLoading(false);
  }
};

// {
//   "payload": {
//     "id": "d8d16c1a-e77b-4615-8307-68c5c3418299"
//   }
// }

//

export const FetchDetailsOfANoticeMail = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query Query($payload: fetchNoticeMailInput!) {
          fetchDetailsOfANoticeMail(payload: $payload) {
            data {
              email_cc
              email_content
              email_from
              email_subject
              email_to
              id
              notice_id
              notice_mail_id
              supportDoc {
                attachment_type
                file
                file_name
                file_path
                file_type
                id
              }
              uploadedNotice {
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
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.fetchDetailsOfANoticeMail?.status === ApiResponse.SUCCESS
    ) {
      return response?.data?.fetchDetailsOfANoticeMail?.data;
    }
    if (
      response?.data?.fetchDetailsOfANoticeMail?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.fetchDetailsOfANoticeMail?.message);

      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const UpdateNoticeMail = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateNoticeMail($payload: updateNoticesMailInput!) {
          updateNoticeMail(payload: $payload) {
            data {
              email_cc
              email_content
              email_from
              email_subject
              email_to
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

    if (response?.data?.updateNoticeMail?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.updateNoticeMail?.message);
      return response?.data?.updateNoticeMail?.data;
    }
    if (response?.data?.updateNoticeMail?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.updateNoticeMail?.message);

      return {};
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return null;
  } finally {
    setLoading && setLoading(false);
  }
};

export const SentMailForANotice = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation SentMailForANotice($payload: SentMailForANoticeInput!) {
          sentMailForANotice(payload: $payload) {
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
    if (response?.data?.sentMailForANotice?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.sentMailForANotice?.message);
      return true;
    }
    if (response?.data?.sentMailForANotice?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.sentMailForANotice?.message);

      return false;
    }
  } catch (error: any) {
    showErrorToast(error.message || ApiResponse.SOMETHING_WENT_WRONG);

    return false;
  } finally {
    setLoading && setLoading(false);
  }
};
