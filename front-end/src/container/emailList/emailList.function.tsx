//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";

export async function updateMailTemplate(inputData: Object) {
  try {
    const response = await client.mutate({
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
      toast.success("Email updated successfully");
      return true;
    } else {
      toast.error(response?.data?.adminUpdateMailTemplate?.message);
      return false;
    }
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function fetchEmailTemplate(inputData: any) {
  try {
    const response = await client.query({
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
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    return false;
  }
}
