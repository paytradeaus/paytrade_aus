import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";

export async function updateMailTemplate(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateMailTemplate(
          $updateMailtemplateInput: UpdateMailTemplateInput!
        ) {
          adminUpdateMailTemplate(
            updateMailtemplateInput: $updateMailtemplateInput
          ) {
            status
            message
            data {
              available_dynamic
              category
              email_content
              email_subject
              id
              selected_dynamic
              updated_on
            }
          }
        }
      `,
      variables: inputData,
    });

    if (response?.data?.adminUpdateMailTemplate?.status === SUCCESS) {
      showSuccessToast("Email updated successfully");
      return true;
    } else {
      showErrorToast(response?.data?.adminUpdateMailTemplate?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function fetchEmailTemplate(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetMailTemplateById($mailTemplateId: String!) {
          adminGetMailTemplateById(mail_template_id: $mailTemplateId) {
            status
            message
            data {
              available_dynamic
              category
              email_content
              email_subject
              id
              selected_dynamic
              updated_on
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    // You can return any relevant data from the response
    if (response?.data?.adminGetMailTemplateById?.status === SUCCESS) {
      return response?.data?.adminGetMailTemplateById?.data;
    } else {
      return false;
    }
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
    return false;
  }
}
