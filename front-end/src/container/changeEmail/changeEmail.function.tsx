//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries
import { toast } from "@/app/Toaster";
//module level constants and interfaces
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export async function updateEmail(inputData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetailsForSignIn(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetailsForSignIn(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (
      response?.data?.insertEmailVerificationDetailsForSignIn?.status ===
      "SUCCESS"
    ) {
      toast.success("Authentication code has been sent to email");
      return true;
    }
    if (
      response?.data?.insertEmailVerificationDetailsForSignIn?.status ===
      "ERROR"
    ) {
      toast.error(
        response?.data?.insertEmailVerificationDetailsForSignIn?.message ||
          SOMETHING_WENT_WRONG
      );

      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
