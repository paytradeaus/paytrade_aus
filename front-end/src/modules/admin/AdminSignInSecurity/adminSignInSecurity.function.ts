//graphql - apollo client setup
import { AdminLogInUserData, client } from "@/app/api/adminApi/adminApi";
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
      showSuccessToast("Authentication code has been sent to email");
      return true;
    }
    if (
      response?.data?.insertAdminEmailVerificationDetails?.status === "ERROR"
    ) {
      showErrorToast(
        response?.data?.insertAdminEmailVerificationDetails?.message ||
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

export const UpdateAdminDetails = async (
  data: any,
  successMsg: string,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation UpdateAdminDetails($updateAdminInput: UpdateAdminInput!) {
          updateAdminDetails(updateAdminInput: $updateAdminInput) {
            message
            status
            data {
              id
              first_name
              last_name
              email_id
              admin_status
              admin_role
              last_logged_in
              created_on
            }
          }
        }
      `,
      variables: {
        updateAdminInput: data,
      },
      // fetchPolicy: "no-cache",
    });
    if (response?.data?.updateAdminDetails?.status === SUCCESS) {
      showSuccessToast(
        response?.data?.updateAdminDetails?.message ||
          successMsg ||
          "user updated successfully"
      );
      return true;
    }
    if (response?.data?.updateAdminDetails?.status === ERROR) {
      console.error(response?.data?.updateAdminDetails?.message);
      showErrorToast(response?.data?.updateAdminDetails?.message);
      return false;
    }
  } catch (error: any) {
    // toast.error(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return false;
  } finally {
    setLoading && setLoading(false);
  }
};

export async function VerifyAdminCode(inputData: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        query VerifyAdminCode($newEmailId: String, $verificationCode: String!) {
          verifyAdminCode(
            new_email_id: $newEmailId
            verification_code: $verificationCode
          ) {
            data {
              access_token
              refresh_token
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data?.verifyAdminCode?.status === SUCCESS) {
      showSuccessToast("Email updated successfully");
      // setCookie(
      //   "accessToken",
      //   response?.data?.verifyAdminCode?.data?.access_token
      // );
      let token = response?.data?.verifyAdminCode?.data?.access_token;
      const decodeTokenData = jwtDecode(token);
      const userDetails: AdminLogInUserData = JSON.parse(
        JSON.stringify(decodeTokenData)
      );

      const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
        JSON.stringify({
          ...userDetails,
        }),
        "token-verification"
      ).toString();

      setCookie("accessVerification", userTokenDetailsForMiddleware);
      localStorage.setItem(
        "accessToken",
        response?.data?.verifyAdminCode?.data?.access_token
      );
      return true;
    } else {
      showErrorToast(response?.data?.verifyAdminCode?.message);
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
