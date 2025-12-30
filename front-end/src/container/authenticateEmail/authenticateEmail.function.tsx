//graphql - apollo client setup
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries

//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";
import { toast } from "react-toastify";
import { setCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";

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
      toast.success("Email updated successfully");
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
      toast.error(response?.data?.verifyCode?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error?.message || SOMETHING_WENT_WRONG);
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
      toast.success("Authentication code has been resent to email");
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
