//graphql - apollo client setup
import { client } from "@/app/api/adminApi/adminApi";
import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { gql } from "@apollo/client";
import { setCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";
export async function fetchPersonalInfo(inputData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query GetUserDetailsByEmailId($emailId: String) {
          getUserDetailsByEmailId(email_id: $emailId) {
            data {
              company_name
              country
              date_of_birth
              email_id
              file
              first_name
              id
              is_verified
              last_logged_in
              last_name
              latitude
              longitude
              occupation
              place_id
              position_title
              region
              signature
              user_address
              user_id
              user_phone_no
              user_role
              user_status
              signature_type
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.getUserDetailsByEmailId?.status === "SUCCESS") {
      return response?.data?.getUserDetailsByEmailId?.data;
    }
    if (response?.data?.getUserDetailsByEmailId?.status === "ERROR") {
      return [];
    }
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}

export async function CheckUserStatus(): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query CheckUserStatus {
          checkUserStatus {
            message
            status
          }
        }
      `,
    });

    if (response?.data?.checkUserStatus?.status === "SUCCESS") {
      return response?.data?.checkUserStatus;
    }
    if (response?.data?.checkUserStatus?.status === "ERROR") {
      return response?.data?.checkUserStatus;
    }
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return {};
  }
}

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
      showSuccessToast("Authentication code has been sent to email");
      return true;
    }
    if (
      response?.data?.insertEmailVerificationDetailsForSignIn?.status ===
      "ERROR"
    ) {
      showErrorToast(
        response?.data?.insertEmailVerificationDetailsForSignIn?.message ||
          SOMETHING_WENT_WRONG
      );

      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}

export const updatePassword = async (
  password: string,
  successMsg?: string
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdatePassword($password: String!) {
          updatePassword(password: $password) {
            message
            status
          }
        }
      `,
      variables: {
        password,
      },
    });
    // You can return any relevant data from the response
    if (response?.data?.updatePassword?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.updatePassword?.message ||
          "Password updated successfully"
      );
      return true;
    }

    if (response?.data?.updatePassword?.status === ERROR) {
      showErrorToast(
        response?.data?.updatePassword?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }

    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  }
};

export async function verifyEmailCode(inputData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        query VerifyCode(
          $emailId: String!
          $verificationCode: String!
          $newEmailId: String
        ) {
          verifyCode(
            email_id: $emailId
            verification_code: $verificationCode
            new_email_id: $newEmailId
          ) {
            data {
              access_token
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.verifyCode?.status === SUCCESS) {
      showSuccessToast("Email updated successfully");
      // setCookie("accessToken", response?.data?.verifyCode?.data?.access_token);
      let token = response?.data?.verifyCode?.data?.access_token;
      const decodeTokenData = jwtDecode(token);
      const userDetails: any = JSON.parse(JSON.stringify(decodeTokenData));

      const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
        JSON.stringify({
          ...userDetails,
        }),
        "token-verification"
      ).toString();

      setCookie("accessVerification", userTokenDetailsForMiddleware);
      localStorage.setItem(
        "accessToken",
        response?.data?.verifyCode?.data?.access_token
      );
      return true;
    } else {
      showErrorToast(response?.data?.verifyCode?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error?.message || SOMETHING_WENT_WRONG);
    return false;
  }
}

export async function resendCode(inputData: any): Promise<any> {
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
      showSuccessToast("Authentication code has been resent to email");
      return true;
    }
    if (
      response?.data?.insertEmailVerificationDetailsForSignIn?.status ===
      "ERROR"
    ) {
      showErrorToast(
        response?.data?.insertEmailVerificationDetailsForSignIn?.message ||
          SOMETHING_WENT_WRONG
      );

      return false;
    }
  } catch (error: any) {
    console.error("GraphQL Error:", error);
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    return [];
  }
}
