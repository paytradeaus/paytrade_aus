//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export async function FetchInformationsOfAContact(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        query FetchInformationsOfAContact(
          $payload: FetchInformationsOfAContactInput!
        ) {
          fetchInformationsOfAContact(payload: $payload) {
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
    return response?.data?.fetchInformationsOfAContact ?? [];
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}

export async function updateContactDetails(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateStatusOfAContact(
          $payload: UpdateStatusOfAContactInput!
        ) {
          updateStatusOfAContact(payload: $payload) {
            message
            status
          }
        }
      `,
      variables: inputData,
    });

    // You can return any relevant data from the response
    return response?.data?.updateStatusOfAContact;
  } catch (error: any) {
    // Handle errors
    toast.error(error?.message || SOMETHING_WENT_WRONG);
  }
}
