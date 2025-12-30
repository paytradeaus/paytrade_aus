//default imports
"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { initialValues, validationSchema } from "./BusinessProfile.validations";
import { useFormik } from "formik";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import {
  checkCompanyExistence,
  insertEmailVerificationDetails,
} from "@/network/existanceAPIsCheck";

import { useTokenDetails } from "@/hooks";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  setAddTrustRecord,
  setCompanyDetails,
} from "@/redux/slices/companyRegistrationDetails";
import { useRouter, useSearchParams } from "next/navigation";
import { updateBusinessDetails } from "./BusinessProfile.function";
import {
  DeleteTrustTrainingRecordById,
  multipleFileUploadApi,
  singleUploadApi,
} from "@/network/apolloClient";
import { getCompanyIdFromStorage, getDecryptedToken } from "@/utils";
import { getCompanyProfilesWithLogos } from "@/app/api/adminApi/profileServices";
import {
  setUpdateActiveProfile,
  setUpdatedCompany,
} from "@/redux/slices/companyDetails";
import { useSelector } from "react-redux";
import { useLoaderContext } from "@/context/useLoader";
import { setAppUserDetails } from "@/redux/slices/userRegistrationSlice";

const BusinessProfileContext: any = createContext(null);

export const BusinessProfileContextProvider = ({ children }: any) => {
  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );
  const appUserDetails: any = useAppSelector(
    (state: RootState) => state?.userDetails?.appUserDetails
  );
  const [displayTrainingRecords, setDisplayTrainingRecords] = useState(false);
  const [trustTrainingGridData, setTrustTrainingGridData] = useState<any>([]);
  const [displayTrainingRecordsGrid, setDisplayTrainingRecordsGrid] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const [displaySignature, setDisplaySignature] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<any>([]);
  const [editMode, setEditMode] = useState(false);
  const { accessTokenId } = useTokenDetails();
  const [removedTrustTrainingFiles, setRemovedTrustTrainingFiles] = useState(
    []
  );
  const [signatureType, setSignatureType] = useState("");
  const [signature, setSignature] = useState("");
  const queryParams = useSearchParams();
  const businessName = queryParams.get("business-name");
  const fileInputRef = useRef<any>(null); // Reference to the file input
  const router = useRouter();
  const { decodeTokenData } = useTokenDetails();
  const dispatch = useAppDispatch();
  const selectedcompanyid = useSelector(
    (state: RootState) => state.companyStore.companyid
  );
  const activeProfileStatus = useSelector(
    (state: RootState) => state.companyStore.isActiveProfileUpdated
  );

  const companyDetails: any = useAppSelector(
    (state: RootState) => state?.companyDetails
  );
  const { setLoader }: any = useLoaderContext();

  const formik: any = useFormik({
    initialValues,
    validationSchema,
    onSubmit: (formValues: any) => handleFormSubmit(formValues),
  });

  useEffect(() => {
    if (!editMode && businessName) {
      formik?.setFieldValue("Name", businessName);
    }
    if (!editMode) {
      setInitialPatchedValues(formik?.initialValues);
    }
  }, []);

  async function handleFormSubmit(formValues: any) {
    try {
      setLoader(true);

      // Check company existence
      const companyName =
        businessDetails?.company_name ||
        companyDetails?.companyDetails?.values?.BusinessName;
      if (formik?.values?.Name !== companyName) {
        const companyExistenceData: any = await checkCompanyExistence(
          formValues?.Name,
          true
        );

        if (companyExistenceData?.length > 0) {
          setLoader(false);
          showWarningToast("Business name already exist!");
          return;
        }
      }

      if (
        !editMode ||
        (editMode &&
          formik?.values?.Email !== businessDetails?.company_email_id)
      ) {
        const details = {
          user_id: decodeTokenData?.userId,
          mail_type: "Verify_Company",
          email_id: decodeTokenData?.emailId,
          type: "Send",
          first_name: decodeTokenData?.userFirstName,
          last_name: decodeTokenData?.userLastName,
          company_name: formValues?.BusinessName,
          company_email_id: formValues?.Email,
        };

        let editDetails: any = {};
        if (editMode) {
          editDetails = {
            ...details,
            old_company_email_id: businessDetails?.company_email_id,
          };
        }

        const response = await insertEmailVerificationDetails(
          editMode ? editDetails : details
        );

        dispatch(
          setCompanyDetails({
            placeDetails: companyDetails?.companyDetails?.placeDetails,
            values: formValues,
          })
        );

        if (response) {
          setAddTrustRecord({ addTrustRecord: trustTrainingGridData });
          showSuccessToast(
            "Please use OTP received in email to verify your business"
          );
          // You can perform other actions or navigate based on the response
          router.push(
            `${AppRoutes.USER_BUSINESS_VERIFICATION}?mode=${
              editMode ? "edit" : "add"
            }`
          );
        }
        setLoader(false);
      } else {
        handleUpdatedBusinessDetails();
      }
    } catch (er: any) {
      setLoader(false);
    }
  }

  async function handleUpdatedBusinessDetails() {
    try {
      const UpdatedDetails = {
        region: companyDetails?.companyDetails?.placeDetails?.region,
        qbcc_number: formik?.values?.Qbccno,
        place_id: companyDetails?.companyDetails?.placeDetails?.place_id,
        longitude: String(
          companyDetails?.companyDetails?.placeDetails?.longitude
        ),
        latitude: String(
          companyDetails?.companyDetails?.placeDetails?.latitude
        ),
        entity_type: formik?.values?.EntityType,
        country: companyDetails?.companyDetails?.placeDetails?.country,
        company_phone_no: formik?.values?.PhoneNumber,
        company_name: formik?.values?.Name,
        company_id: businessDetails?.company_id,
        company_email_id: formik?.values?.Email,
        company_address: companyDetails?.companyDetails?.placeDetails?.Address,
        abn_number: formik?.values?.ABN,
        tfn_number: formik?.values?.TFN,
        acn_number: formik?.values?.ACN,
        legal_company_name: formik?.values?.BusinessName,
        signature: signature || businessDetails?.signature,
        signature_type: signatureType || businessDetails?.signature_type,
        is_signature_updated: signature ? true : false,
        email_preferences: {
          compliance: formik?.values?.compliance,
          notices: true,
        },
      };

      const apiResponse: any = await updateBusinessDetails(UpdatedDetails);

      if (formik?.values?.imageFile) {
        let userData = {
          company_id: apiResponse?.data?.company_id,
          uploaded_by: decodeTokenData?.emailId,
          attachment_type: "Company_logo",
        };
        const fileResponse: any = await singleUploadApi(
          formik?.values?.imageFile,
          userData,
          accessTokenId
        );
        const tokenData = getDecryptedToken();
        dispatch(
          setAppUserDetails({
            ...tokenData,
            image: !updatedCompany?.company_id
              ? fileResponse?.file
              : appUserDetails?.image,
          })
        );
        dispatch(setUpdatedCompany({ ...updatedCompany }));
        dispatch(setUpdateActiveProfile(!activeProfileStatus));
      }

      let addedTrustTrainingFiles = [];

      if (companyDetails?.addTrustRecord?.length > 0) {
        addedTrustTrainingFiles =
          companyDetails?.addTrustRecord?.map((item: any, i: number) => {
            return item?.trainingRecordFile[0];
          }) || [];
      }

      if (addedTrustTrainingFiles?.length > 0) {
        let multiUserData: any[] =
          companyDetails?.addTrustRecord?.map((item: any, i: number) => {
            const formattedDate = item?.trainingRecordDate
              ? item?.trainingRecordDate
              : "";
            return {
              company_id: UpdatedDetails?.company_id,
              name: item?.trainingRecordName || "",
              uploaded_on: formattedDate || "",
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Trust_Training_Records",
            };
          }) || [];
        const fileResponse: any[] = await multipleFileUploadApi(
          addedTrustTrainingFiles,
          multiUserData,
          accessTokenId
        );

        // setLoader(false);
      }
      if (removedTrustTrainingFiles?.length > 0) {
        const payload = {
          companyId: getCompanyIdFromStorage(),
          idArray: removedTrustTrainingFiles,
        };
        const deleteResponse = await DeleteTrustTrainingRecordById(payload);
      }
      if (apiResponse?.data?.company_id) {
        updateCompany();
        dispatch(setCompanyDetails({}));
        dispatch(setAddTrustRecord([]));
        showSuccessToast("This business has been updated.");
      } else {
        showErrorToast(apiResponse?.message);
      }
      setLoader(false);
      router.push(AppRoutes.USER_DASHBOARD);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function updateCompany() {
    try {
      const storedCompanyId = localStorage.getItem("companyId");

      const profiles = await getCompanyProfilesWithLogos();
      const companyId =
        selectedcompanyid !== "" ? selectedcompanyid : storedCompanyId;
      const data = profiles?.filter(
        (v: any, i: number) => String(v?.company_id) === String(companyId)
      );
      if (data?.length > 0) {
        dispatch(setUpdatedCompany(data[0]));
      } else {
        dispatch(setUpdatedCompany({}));
      }
    } catch {}
  }

  //render Template
  return (
    <BusinessProfileContext.Provider
      value={{
        formik,
        displayTrainingRecords,
        setDisplayTrainingRecords,
        trustTrainingGridData,
        setTrustTrainingGridData,
        displayTrainingRecordsGrid,
        setDisplayTrainingRecordsGrid,
        fileInputRef,
        initialPatchedValues,
        displaySignature,
        setDisplaySignature,
        businessDetails,
        setBusinessDetails,
        editMode,
        setEditMode,
        removedTrustTrainingFiles,
        setRemovedTrustTrainingFiles,
        signature,
        setSignature,
        signatureType,
        updatedCompany,
        setSignatureType,
        appUserDetails,
        setInitialPatchedValues,
        activeProfileStatus,
      }}
    >
      {children}
    </BusinessProfileContext.Provider>
  );
};

// Create a custom hook for using the global context
const useBusinessProfileContext = () => {
  const context = useContext(BusinessProfileContext);
  if (!context) {
    throw new Error("Error in business profile Context");
  }
  return context;
};

export { useBusinessProfileContext };
