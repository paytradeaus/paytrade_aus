import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { gql } from "@apollo/client";

export async function FetchInformationsOfAContact(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        query GetTicketById($getTicketByIdId: String!) {
          getTicketById(id: $getTicketByIdId) {
            data {
              companyName
              created_on
              email
              id
              isViewed
              message
              name
              status
              ticket_details {
                body
                created_on
                fromEmail
                id
                is_user
                subject
                toEmail
              }
            }
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    // You can return any relevant data from the response
    return response?.data?.getTicketById ?? [];
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function updateContactDetails(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation UpdateSupportTicket($payload: UpdateStatusOfASupportInput!) {
          updateSupportTicket(payload: $payload) {
            data {
              companyName
              created_on
              email
              id
              isViewed
              message
              name
              status
            }
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    // You can return any relevant data from the response
    return response?.data?.updateSupportTicket;
  } catch (error: any) {
    // Handle errors
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
  }
}
