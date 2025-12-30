import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
import { toast } from "@/app/Toaster";
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";

export async function InsertAdminEmailVerificationDetails(
  inputData: any
): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertAdminEmailVerificationDetails(
          $createAdminEmailVerificationInput: CreateAdminEmailVerificationInput!
        ) {
          insertAdminEmailVerificationDetails(
            createAdminEmailVerificationInput: $createAdminEmailVerificationInput
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
      response?.data?.insertAdminEmailVerificationDetails?.status === "SUCCESS"
    ) {
      toast.success("Authentication code has been sent to email");
      return true;
    }
    if (
      response?.data?.insertAdminEmailVerificationDetails?.status === "ERROR"
    ) {
      toast.error(
        response?.data?.insertAdminEmailVerificationDetails?.message ||
          SOMETHING_WENT_WRONG
      );

      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    toast.error(error.message || SOMETHING_WENT_WRONG);
    return false;
  }
}
