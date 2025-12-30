//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export async function postUserData(inputData: Object) {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation Mutation($payload: SubmitAContactInput!) {
          submitAContact(payload: $payload) {
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
    toast.error(SOMETHING_WENT_WRONG);
  }
}
