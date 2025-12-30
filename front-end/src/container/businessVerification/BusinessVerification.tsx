"use client";

import React, { useEffect, useState } from "react";
import styles from "./BusinessVerification.module.scss";
import { Row, Col, Form, Container } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useRouter } from "next/navigation";

import { useFormik } from "formik";
import * as Yup from "yup";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  getAuthToken,
  insertCompanyDetails,
  insertEmailVerificationDetails,
  insertSubscriptionDetails,
} from "@/app/api/CompanyRegistrationServices";
import { jwtDecode } from "jwt-decode";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import Link from "next/link";
import { getCookie, setCookie } from "cookies-next";
import { useLoaderContext } from "@/context/useLoader";
import { multipleFileUploadApi, singleUploadApi } from "@/app/api/commonAPIs";
import { toast } from "react-toastify";
import { formatDate } from "@/common/commonFunctions";
import { FileUploadResponseData } from "../adminModules/sendEmailTemplate/sendEmailTemplate.types";
import { useTokenDetails } from "@/common/commonHooks";
import { useSelector } from "react-redux";
import {
  DeleteTrustTrainingRecordById,
  updateBusinessDetails,
} from "../editBusinessDetails/editBusinessDetails.function";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { CustomJwtPayload } from "../userLogin/userLoginPage";
import CryptoJS from "crypto-js";

// export interface FileUploadResponseData {
//   attachment_type: string;
//   file_path: string;
//   file_type: string;
//   id: string;
// }

const validationSchema = Yup.object().shape({
  Verification: Yup.string()
    .required("Please provide a verification code")
    .matches(/^[0-9]+$/, "Only numbers are allowed"),
});

const BusinessVerificationPage = () => {
  const THREE_MINUTES = 3 * 60 * 1000;

  const { accessTokenId, decodeTokenData } = useTokenDetails();
  // const [newToken, setNewToken] = useState();

  // const [accessTokenId, setAccessTokenId] = useState<string>("");
  const [disableResendEmail, setDisableResendEmail] = useState(false);

  // useEffect(() => {
  //   // Get access token from local storage
  //   const accessToken = localStorage.getItem("accessToken");
  //   if (accessToken) {
  //     setAccessTokenId(accessToken);
  //   }
  // }, []);

  const { loader, setLoader }: any = useLoaderContext();

  // const accessToken: any = localStorage.getItem("accessToken");

  const router = useRouter();
  const dispatch = useAppDispatch();

  const { name, imageFile } = useAppSelector(
    (state: RootState) => state.imagestores
  );

  const editBusinessDetails: any = useSelector(
    (state: RootState) => state?.companyDetails?.editBusinessDetails
  );

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails
  );
  const removedFiles: any = useAppSelector(
    (state: RootState) => state.companyDetails?.removedFiles
  );
  const files =
    companyDetails?.addTrustRecord?.map((item: any, i: number) => {
      const attachment = item?.files?.[0]?.file || "";
      const formattedDate = item?.date ? formatDate(item?.date) : "";
      return attachment?.[0];
    }) || [];

  const formik = useFormik({
    initialValues: {
      Verification: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoader(true);
      const Entiredetails: any = {
        verification_code: values.Verification,
        region: editBusinessDetails?.region
          ? editBusinessDetails?.region
          : companyDetails?.companyDetails?.placeDetails?.region,
        qbcc_number: editBusinessDetails?.Qbccno
          ? editBusinessDetails?.Qbccno
          : companyDetails?.companyDetails?.values?.Qbccno,
        place_id: editBusinessDetails?.place_id
          ? editBusinessDetails?.place_id
          : companyDetails?.companyDetails?.placeDetails?.place_id,
        mail_type: "Verify_Company",
        longitude: editBusinessDetails?.longitude
          ? editBusinessDetails?.longitude
          : String(companyDetails?.companyDetails?.placeDetails?.longitude),
        latitude: editBusinessDetails?.latitude
          ? editBusinessDetails?.latitude
          : String(companyDetails?.companyDetails?.placeDetails?.latitude),
        is_verified: false,
        entity_type: editBusinessDetails?.EntityType?.value
          ? editBusinessDetails?.EntityType?.value
          : companyDetails?.companyDetails?.values?.EntityType?.value,
        email_id:
          editBusinessDetails && editBusinessDetails?.length > 0
            ? decodeTokenData["emailId"]
            : companyDetails?.companyDetails?.email_id,
        // created_on: companyDetails.companyDetails.created_on,
        // created_by: companyDetails.companyDetails.created_by,
        country: editBusinessDetails?.country
          ? editBusinessDetails?.country
          : companyDetails?.companyDetails?.placeDetails?.country,
        company_phone_no: editBusinessDetails?.PhoneNumber
          ? editBusinessDetails?.PhoneNumber
          : companyDetails?.companyDetails?.values?.PhoneNumber,
        company_name: editBusinessDetails?.Name
          ? editBusinessDetails?.Name
          : companyDetails?.companyDetails?.values?.Name,

        company_email_id: editBusinessDetails?.Email
          ? editBusinessDetails?.Email
          : companyDetails?.companyDetails?.values?.Email,

        company_address: editBusinessDetails?.Address
          ? editBusinessDetails?.Address
          : companyDetails?.companyDetails?.placeDetails?.fullAddress,
        abn_number: editBusinessDetails?.ABN
          ? editBusinessDetails?.ABN
          : companyDetails?.companyDetails?.values?.ABN,
        tfn_number: editBusinessDetails?.TFN
          ? editBusinessDetails?.TFN
          : companyDetails?.companyDetails?.values?.TFN,
        acn_number: editBusinessDetails?.ACN
          ? editBusinessDetails?.ACN
          : companyDetails?.companyDetails?.values?.ACN,
        legal_company_name: editBusinessDetails?.BusinessName
          ? editBusinessDetails?.BusinessName
          : companyDetails?.businessProfile?.BusinessName,
      };

      if (Object.keys(editBusinessDetails).length !== 0) {
        delete Entiredetails.mail_type;
        delete Entiredetails.email_id;
        (Entiredetails["old_company_email_id"] =
          editBusinessDetails?.oldEmail ?? null),
          (Entiredetails["company_id"] =
            editBusinessDetails?.companyId ?? null);
      }
      let response: any;
      try {
        // Call the function to insert email verification details
        if (Object.keys(editBusinessDetails).length !== 0) {
          response = await updateBusinessDetails(Entiredetails);
        } else {
          response = await insertCompanyDetails(Entiredetails);
        }
        // Handle the response as needed

        // Insert subscription details
        // if (response?.company_id) {
        //   const subscriptionResponse = await insertSubscriptionDetails({
        //     company_id: response?.company_id,
        //     plan_type:
        //       companyDetails?.companyDetails?.values?.SubscriptionType?.value,
        //   });
        // }

        if (response?.company_id) {
          let newToken: any = await getAuthToken(
            decodeTokenData?.emailId,
            decodeTokenData?.isAdmin
          );
          // setNewToken(newToken);
          localStorage.setItem("accessToken", newToken);
          const decodeTokensData: CustomJwtPayload = jwtDecode(newToken);
          const userDetails = JSON.parse(JSON.stringify(decodeTokensData));
          //changes for cookie storage issue
          const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
            JSON.stringify({
              role: userDetails?.role,
              status: userDetails?.status,
              id: userDetails?.id,
              userName: userDetails?.userName,
              userFirstName: userDetails?.userFirstName,
              userLastName: userDetails?.userLastName,
              emailId: userDetails?.emailId,
              isAdmin: userDetails?.isAdmin,
              timezone: userDetails?.timezone,
              iat: userDetails?.iat,
              exp: userDetails?.exp,
            }),
            "token-verification"
          ).toString();

          setCookie("accessVerification", userTokenDetailsForMiddleware);

          // setCookie("accessToken", newToken);
          // Handle the response as needed
          // }

          if (imageFile) {
            let userData = {
              company_id: response?.company_id,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Company_logo",
            };
            const fileResponse = await singleUploadApi(
              imageFile,
              userData,
              newToken
            );
          }

          // Upload files if files array is present
          let fileIds: Array<string> = [];
          // var decodedToken: any = jwtDecode(accessToken);

          const files =
            companyDetails?.addTrustRecord?.map((item: any, i: number) => {
              const attachment = item?.files?.[0]?.file || "";
              const formattedDate = item?.date ? formatDate(item?.date) : "";
              return attachment?.[0];
            }) || [];

          if (files.length > 0) {
            // let userData = {
            //   company_id: response?.insertCompanyDetails?.company_id,
            //   name: companyDetails?.addTrustRecord?.Name || "",
            //   uploaded_on: formatDate(companyDetails?.addTrustRecord?.date),
            //   // uploaded_by: ,
            //   attachment_type: "Trust_Training_Records",
            // };
            let multiUserData: any[] =
              companyDetails?.addTrustRecord?.map((item: any, i: number) => {
                const attachment = item?.files?.[0]?.name || "";
                const formattedDate = item?.date ? item?.date : "";
                return {
                  company_id:
                    response?.data?.insertCompanyDetails?.data?.company_id ??
                    response?.company_id,
                  name: item.Name || "",
                  uploaded_on: formattedDate || "",
                  uploaded_by: decodeTokenData?.emailId,
                  attachment_type: "Trust_Training_Records",
                };
              }) || [];
            // files.forEach((item: any) => multiUserData.push(userData));
            const fileResponse: FileUploadResponseData[] =
              await multipleFileUploadApi(files, multiUserData, newToken);
            if (fileResponse?.length > 0) {
              fileResponse.forEach((each: FileUploadResponseData) =>
                fileIds.push(each?.id)
              );
            }
          }
        }

        if (removedFiles?.length > 0) {
          const companyId: any =
            typeof window !== "undefined"
              ? Number(localStorage.getItem("companyId"))
              : null;

          const payload = {
            companyId: companyId,
            deleteTrustTrainingRecordsByIdId:
              removedFiles?.length >= 2 ? removedFiles : removedFiles?.[0],
          };
          const deleteResponse = await DeleteTrustTrainingRecordById(payload);
        }
        // You can perform other actions or navigate based on the response
        if (response) {
          toast.success(
            `This Business has been ${
              Object.keys(editBusinessDetails).length !== 0
                ? "updated"
                : "added"
            }.`
          );
          localStorage.setItem("companyId", response?.company_id);
          setCookie("companyId", response?.company_id);
          dispatch(setCompanyId(response?.company_id));
          router.push("/user/dashboard");
        }
      } catch (error) {
        // Handle errors
        console.error("Error in insertCompanyDetails company:", error);
        // You may want to display an error message to the user
      } finally {
        setLoader(false); // Ensure that the loader is always set to false
      }
    },
  });

  const handlePreviousClick = () => {
    router.back();
  };

  const resendVerificationCode = async () => {
    // var decodedToken: any = jwtDecode(accessToken);

    try {
      setDisableResendEmail(true);
      // Prepare the data object to be passed to the service
      const data = {
        type: "Resend",
        user_id: decodeTokenData?.userId,
        first_name: decodeTokenData["userFirstName"],
        last_name: decodeTokenData["userLastName"],
        email_id: decodeTokenData["emailId"],
        company_name: companyDetails.companyDetails.values.Name,
        company_email_id: companyDetails.companyDetails.values.Email,
        mail_type: "Verify_Company",
        // created_by: decodeTokenData["emailId"],
        // created_on: new Date().toISOString().slice(0, 19).replace("T", " "),
        verification_code: formik.values.Verification,
      };
      setTimeout(() => {
        setDisableResendEmail(false);
      }, THREE_MINUTES);
      if (!disableResendEmail) {
        // Call the insertEmailVerificationDetails function with the prepared data
        const response = await insertEmailVerificationDetails(data);

        // Handle response as needed
        if (response) {
          toast.success(
            "Please use OTP received in email to verify your business"
          );
        }
      }
    } catch (error) {
      // Handle errors
      console.error("Error inserting email verification details:", error);
      // Show error message or handle as needed
    }
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.VerificationContainerStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <div className={styles.title}>We just sent you a code to</div>
              <span className={styles.RegisterEmail}>
                {companyDetails?.companyDetails?.values?.Email}
              </span>
              <span className={styles.title1}>to verify your email</span>
              <p className={styles.InfoTextStyle}>
                If you didn&rsquo;t receive an email, please check your spam
                folder.
              </p>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  inputMode="numeric"
                  labelText="Please enter the code:"
                  name="Verification"
                  id="Verification"
                  maxLength={6}
                  value={formik.values.Verification}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Verification && formik.errors.Verification
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Verification && formik.errors.Verification ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Verification}
                  </div>
                ) : null}
              </div>
              <FormButton
                className={styles.buttonStyles}
                type="submit"
                disabled={loader}
              >
                Verify
              </FormButton>
              <FormButton
                className={styles.PreviousButtonStyles}
                type="button"
                onClick={handlePreviousClick}
                textPlainBtn
              >
                Previous
              </FormButton>
            </Form>
            <div
              className={
                disableResendEmail
                  ? `${styles.navigationLink} ${styles.disabledNavigationLink}`
                  : styles.navigationLink
              }
              onClick={() => resendVerificationCode()}
            >
              Send verification email again
            </div>
            <Link className={styles.TurquoiseTitle} href={"/user/add-business"}>
              I have entered an incorrect email address
            </Link>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default BusinessVerificationPage;
