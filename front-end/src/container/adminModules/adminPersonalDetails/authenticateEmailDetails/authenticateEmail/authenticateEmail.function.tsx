//graphql - apollo client setup
import { gql } from "@apollo/client";
import { AdminLogInUserData, client } from "@/app/api/adminAPIs/adminAPIs";
//import from external libraries

//module level constants and interfaces
import { SOMETHING_WENT_WRONG, SUCCESS } from "@/common/constants/messages";
import { toast } from "react-toastify";
import { setCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";

export async function VerifyAdminCode(inputData: any): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
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
      toast.success("Email updated successfully");
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
      toast.error(response?.data?.verifyAdminCode?.message);
      return false;
    }
  } catch (error: any) {
    toast.error(error?.message || SOMETHING_WENT_WRONG);
    return false;
  }
}
