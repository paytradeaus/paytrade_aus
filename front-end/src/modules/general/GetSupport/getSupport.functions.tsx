import { SOMETHING_WENT_WRONG } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function postUserData(inputData: Object) {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation RaiseATicket($payload: CreateSupportTicketInput!) {
          RaiseATicket(payload: $payload) {
            data {
              id
            }
            message
            status
          }
        }
      `,
      variables: { payload: inputData },
    });

    // You can return any relevant data from the response
    return response;
  } catch (error: any) {
    // Handle errors
    showErrorToast(SOMETHING_WENT_WRONG);
  }
}
