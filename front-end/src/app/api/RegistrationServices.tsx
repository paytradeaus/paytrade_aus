// apiService.ts
import { SOMETHING_WENT_WRONG } from "@/common/constants/messages";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { toast } from "react-toastify";
import { getGraphQLUri } from "@/utils/graphqlUri";

// types.ts
export interface CheckUserResponse {
  data: {
    email_id: string; // Change this based on the actual response structure
  } | null; // Change this based on the actual response structure
}

export interface CheckUserDetailsResponse {
  CreateEmailVerificationInput: {
    created_by: string;
    created_on: Date;
    email_id: string;
    first_name: string;
    mail_type: string;
    type: string;
  } | null;
}

const client = new ApolloClient({
  uri: getGraphQLUri(),
  cache: new InMemoryCache(),
});

export const CheckUserExistence = async (
  emailId: string
): Promise<CheckUserResponse | any> => {
  try {
    const response = await client.query({
      query: gql`
        query CheckUserExistence($emailId: String!) {
          checkUserExistence(email_id: $emailId) {
            data {
              email_id
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId,
      },
    });

    return response?.data?.checkUserExistence?.data || [];
  } catch (error) {
    // Handle GraphQL errors
    console.error("GraphQL Error:", error);
    return [];
  }
};

export const insertEmailVerificationDetails = async (inputData: Object) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertEmailVerificationDetails(
          $createEmailVerificationInput: CreateEmailVerificationInput!
        ) {
          insertEmailVerificationDetails(
            createEmailVerificationInput: $createEmailVerificationInput
          ) {
            message
            status
          }
        }
      `,
      variables: {
        createEmailVerificationInput: inputData,
      },
    });
    if (response?.data?.insertEmailVerificationDetails?.status === "SUCCESS") {
      return true;
    }
    if (response?.data?.insertEmailVerificationDetails?.status === "ERROR") {
      toast.error(
        response?.data?.insertEmailVerificationDetails?.message ||
          SOMETHING_WENT_WRONG
      );
      return false;
    }
    // Return the array of company profiles with logos
    return false;
  } catch (error) {
    // Handle errors

    return false;
  }
};

export const insertUserDetails = async (inputData: Object) => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation InsertUserDetails($createSignupInput: CreateSignupInput!) {
          insertUserDetails(createSignupInput: $createSignupInput) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: {
        createSignupInput: {
          ...inputData,
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });

    // Handle the response as needed
    if (response?.data?.insertUserDetails?.status === "SUCCESS") {
      return response.data.insertUserDetails?.data?.access_token;
    }
    if (response?.data?.insertUserDetails?.status === "ERROR") {
      toast.error(response?.data?.insertUserDetails?.message);
      return null;
    }
    return null;
  } catch (error) {
    // Handle errors
    console.error("Error in insertUserDetails:", error);
    return error;
  }
};
