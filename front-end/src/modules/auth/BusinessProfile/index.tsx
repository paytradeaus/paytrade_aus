"use client";
import ImageUploader from "@/components/ImageUploader";
import { AppRoutes } from "@/shared/constant/appRoutes";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { RootState, useAppSelector } from "@/redux/store";
import { setImageFile } from "@/redux/slices/imageUploadSlice";
import { useCustomDebounce } from "@/hooks";
import {
  CheckQbccExistence,
  requestToJoinCompany,
} from "@/network/apolloClient";
import { setUserDetails } from "@/redux/slices/userRegistrationSlice";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType, UploadImage } from "@/shared/constant/general";
import dynamic from "next/dynamic";
import CustomButton from "@/components/CustomButton/CustomButton";

const ImageCropper = dynamic(() => import("@/components/ImageCropper"), {
  ssr: false,
});
import BaseModal from "@/components/BaseModal";
import Avatar from "react-avatar";
import styles from "./businesProfile.module.css";
import { convertCanvasToFile, handleUserActivity } from "@/utils";
import { checkCompanyExistence } from "@/network/existanceAPIsCheck";
import { setCookie } from "cookies-next";
import Image from "next/image";
import userImage from "../../../../public/images/avatar.png";

const validationSchema = Yup.object().shape({
  Name: Yup.string().required("Business name is required"),
  legalname: Yup.string(),
  Qbccno: Yup.string()
    .notRequired()
    .matches(/^[0-9]+$/, "Only numbers are allowed")
    .test(
      "unique",
      "This QBCC is associated with another business",
      async function (value) {
        if (!value?.trim() || value?.trim().length < 7) return true; // Handle empty email
        return true; // QBCC number is unique
      }
    ),
  EntityType: Yup.string().required("Entity type is required"),
});

export default function BusinessProfile() {
  const router = useRouter();

  const dispatch = useDispatch();
  const options = [
    { value: "Business", label: "Business" },
    { value: "Sole Trader", label: "Sole Trader" },
    { value: "Personal", label: "Personal" },
  ];

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails?.companyDetails
  );

  const [matchedCompanies, setMatchedCompanies] = useState([]);

  const [modalShow, setModalShow] = React.useState(false);
  const [businessName, setBusinessName] = useState<string>("");
  const [companyExists, setCompanyExists] = useState<boolean>(false); // Added state to track company existence

  const [cropImage, setCropImage] = useState<any>();
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string>("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);

  const [displayImage, setDisplayImage] = useState<any>([]);

  const [qbccno, setQbccno] = useState<string>("");
  const debouncedQbccno = useCustomDebounce(qbccno, 700);
  const [qbccError, setQbccError] = useState<string | null>(null);
  const { imageFile } = useAppSelector((state: RootState) => state.imagestores);

  useEffect(() => {
    const checkQbccNumber = async () => {
      if (debouncedQbccno) {
        const QBCCNOExists = await CheckQbccExistence(debouncedQbccno);
        if (QBCCNOExists) {
          setQbccError("This QBCC is associated with another business.");
        } else {
          setQbccError(null);
        }
      }
    };
    checkQbccNumber();
  }, [debouncedQbccno]);

  const handleImageSelect = async (file: File) => {
    // Validate file type
    if (!UploadImage.jpegAndPng.includes(file.type)) {
      showErrorToast(
        "Invalid file type. Please select a valid image file (JPEG/PNG)."
      );
      return;
    }

    // Validate file size
    if (file.size > UploadImage.twoMB) {
      showErrorToast(
        "File size exceeds the limit (2MB). Please select a smaller file."
      );
      setCropImage([]);
      return;
    }

    // If validations pass, set the image file
    setDisplayImage([file]);
    setCropImage([file]);
  };

  const handleCancelClick = () => {
    setModalShow(false);
    // Handle the cancellation, for example, navigate to a specific page
  };

  const handleSkipClick = () => {
    handleUserActivity();
    router.push(AppRoutes.USER_DASHBOARD);
    dispatch(setUserDetails({}));
    dispatch(setCompanyDetails({}));
    dispatch(setImageFile(null));
    localStorage.setItem("userMode", "Normal");
    setCookie("userMode", "Normal");
  };

  const formik = useFormik({
    initialValues: {
      Name: companyDetails?.Name || "",
      Qbccno: companyDetails?.Qbccno || "",
      EntityType: companyDetails?.EntityType || "",
      legalname: companyDetails?.legalname || "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const companyExistenceData: any = await checkCompanyExistence(
          values.Name.trim(),
          true
        );

        if (companyExistenceData?.length == 0) {
          setModalShow(false);
          router.push(AppRoutes.USER_CONTACT_BUSINESS);
        } else if (companyExistenceData?.length) {
          setSelectedBusiness(companyExistenceData[0]);
          setModalShow(true);
        }

        const doesCompanyExist = companyExistenceData?.length > 0;
        // Set the companyExists state
        setCompanyExists(doesCompanyExist);
        const combinedDetails = {
          ...companyDetails,
          ...values,
        };
        dispatch(setCompanyDetails(combinedDetails));
      } catch (error: any) {
        // Handle the case when the API call fails or returns an invalid response
        showErrorToast(
          error.message ||
            "Something went wrong while checking company existence"
        );
        setModalShow(false);

        // Set the companyExists state to false
        setCompanyExists(false);

        // Show an error message or take appropriate action
        showErrorToast("Error checking company existence. Please try again.");
      }
    },
  });

  useEffect(() => {
    // Clear qbccError when formik errors are cleared
    if (!formik.errors.Qbccno) {
      setQbccError(null);
    }
  }, [formik.errors]);

  // Show the modal only if the company exists
  useEffect(() => {
    if (companyExists) {
      setModalShow(true);
    } else {
      // Redirect to contact-business page if company does not exist
    }
  }, [companyExists]);

  const handleImageCrop = async (uploadedFile: File) => {
    const convertedCanvasToFile: any = await convertCanvasToFile(
      uploadedFile,
      cropImage
    );

    // Generate preview URL from the cropped file
    const reader = new FileReader();
    reader.onloadend = () => {
      setCroppedPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(convertedCanvasToFile);

    // If validations pass, set the image file

    dispatch(setImageFile(convertedCanvasToFile));
    setCropImage([]);
  };

  const handleJoinClick = async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      var decodedToken: any = jwtDecode(accessToken);

      // Check if selectedId exists and has a valid id
      if (!selectedBusiness?.company_id) {
        showErrorToast("Please select a business to join.");
        return; // Exit function early if company_id is not selected
      }

      try {
        const data = {
          user_name: decodedToken["userName"],
          user_id: decodedToken["userId"],
          company_id: selectedBusiness?.company_id,
          is_user_exists: true,
          email_id: decodedToken["emailId"],
          user_first_name: decodedToken["userFirstName"],
          manage_user: "No",
          manage_subscription: "No",
          manage_project_trust_payment: "No",
          manage_company: "No",
          company_role: "STANDARD USER",
        };
        // Call requestToJoinCompany when "Join" is clicked
        let joinResponce = await requestToJoinCompany(data);
        if (joinResponce) {
          // Handle success or show toast notification
          showSuccessToast("Request to join company sent successfully!");
          // Close modal
          setModalShow(false);
          // Redirect or handle next steps
          router.push(AppRoutes.USER_DASHBOARD);
        }
      } catch (error) {
        // Handle errors
        showErrorToast("Error occurred while processing the request");
        console.error("Error joining the company:", error);
      }
    }
  };

  async function handleBusinessSearch(searchedValue: string) {
    if (searchedValue.length) {
      try {
        const companiesData = await checkCompanyExistence(searchedValue);
        if (companiesData?.length > 0) {
          const modifiedData = companiesData.map((x: any) => {
            return {
              ...x,
              label: `${x?.company_name} •${" "} ${x?.entity_type} ${
                x?.legal_company_name && "• " + x?.legal_company_name
              }`,
            };
          });

          setMatchedCompanies(modifiedData);
        } else {
          setMatchedCompanies([]);
        }
      } catch {}
    } else {
      setMatchedCompanies([]);
    }
  }

  function handleBusinessNameChange(e: any) {
    formik.setFieldValue(
      "Name",
      e.target.value.trim() ? e.target.value : e.target.value.trim()
    );
    handleBusinessSearch(e?.target?.value);
  }

  return (
    <div className="pt_centered">
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="pt_login">
            <h4>Add a business profile</h4>
            <br />

            <FormikControl
              control={InputType.TEXT_FIELD}
              label={"Business name "}
              name="Name"
              id="Name"
              required={true}
              disableAutoComplete={false}
              maxLength={100}
              value={formik.values.Name}
              onChange={(e: any) => handleBusinessNameChange(e)}
              onBlur={(e: any) => {
                formik.handleBlur(e); // Handle Formik's onBlur
                if (formik.values.Name.trim() !== "") {
                  // Check if the business name field is not empty
                  setBusinessName(formik.values.Name.trim());
                  // setModalShow(true); // Show the modal
                }
              }}
            />

            <div className="pt_profilescroll" id="searchprofiles">
              {matchedCompanies?.map((val: any) => (
                <div
                  className="pt_profilename"
                  key={val?.id}
                  onClick={() => {
                    setModalShow(true);
                    setSelectedBusiness(val);
                  }}
                  style={{ lineHeight: "unset" }}
                >
                  <Image
                    src={val?.file_path || userImage}
                    alt={val?.file_name || "user-icon"}
                    width={300}
                    height={300}
                    className="avatar useravatar"
                  />
                  <div className="searchOption">
                    <span className="pt_user">{val.company_name}</span>
                    <span className="pt_email">
                      {val.entity_type}{" "}
                      {val?.legal_company_name &&
                        "• " + val?.legal_company_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <FormikControl
              control={InputType.TEXT_FIELD}
              label={"Legal business name (if applicable)"}
              error={formik.errors.legalname}
              showError={formik.touched.legalname && formik.errors.legalname}
              required={false}
              disableAutoComplete={false}
              name="legalname"
              id="legalname"
              maxLength={100}
              value={formik.values.legalname}
              onChange={(e: any) =>
                formik.setFieldValue(
                  "legalname",
                  e.target.value.trim() ? e.target.value : e.target.value.trim()
                )
              }
              onBlur={formik.handleBlur}
            />

            <FormikControl
              control={InputType.SELECT}
              options={options}
              renderKey={"label"}
              valueKey={"value"}
              label="Entity type"
              required={true}
              value={formik.values.EntityType}
              onChange={(selectedOption: any) =>
                formik?.setFieldValue("EntityType", selectedOption)
              }
              error={formik.errors.EntityType}
              showError={formik.touched.EntityType && formik.errors.EntityType}
              disabled={false}
              placeholder="Select entity type"
            />

            <FormikControl
              control={InputType.TEXT_FIELD}
              label={"QBCC no"}
              error={formik.errors.Qbccno}
              showError={formik.touched.Qbccno && formik.errors.Qbccno}
              required={false}
              disableAutoComplete={false}
              name="Qbccno"
              id="Qbccno"
              maxLength={8}
              value={formik.values.Qbccno}
              onChange={(e: any) => {
                formik.setFieldValue(
                  "Qbccno",
                  e.target.value.trim() ? e.target.value : e.target.value.trim()
                );
                setQbccno(e.target.value);
              }}
              onBlur={formik.handleBlur}
            />

            <br />
            <br />

            <ImageUploader
              onImageSelect={handleImageSelect}
              imagePlaceholder="Add logo"
              imageStyles={{
                borderRadius: "10px",
                objectFit: "fill",
                display: imageFile ? "block" : "none", // Only display the image if imageFile is set
              }}
              displayCenterAligned
              accept={UploadImage.jpegAndPng}
              selectedImage={cropImage?.length > 0 ? cropImage[0] : imageFile}
              base64Image={croppedPreviewUrl}
            />
            <p style={{ textAlign: "center", marginTop: "1rem" }}>
              Click or drag a file to this area to upload
            </p>

            <br />
            <br />
            <div className="button-container">
              <CustomButton
                buttonName={"Skip"}
                buttonType={buttonType.OUTLINE_CONTRAST}
                actionType="button"
                onClick={handleSkipClick}
                inputButton
              />
              <CustomButton
                buttonName={"Next"}
                buttonType={buttonType.SECONDARY}
                actionType="submit"
                onClick={formik.handleSubmit}
                inputButton
              />
            </div>
          </div>
          {modalShow && (
            <BaseModal
              displayModal={modalShow}
              onClose={handleCancelClick}
              firstButtonName="Cancel"
              secondButtonName="Join"
              title="Business Match"
              onConfirm={handleJoinClick}
            >
              <ul className={styles.matchedCompanyList}>
                {selectedBusiness?.company_id && (
                  <li className={`${styles.matchedCompany} ${styles.clicked}`}>
                    <div className={styles.companyItem}>
                      <div className={styles.companyDetails}>
                        <span className={styles.companyName}>
                          {selectedBusiness?.company_name}
                        </span>
                        •
                        <span
                          className={`${styles.companyName} ${styles.companyType}`}
                        >
                          {selectedBusiness?.entity_type}
                        </span>
                        {selectedBusiness?.legal_company_name && (
                          <>
                            •
                            <span
                              className={`${styles.companyName} ${styles.companyType}`}
                            >
                              {selectedBusiness?.legal_company_name}
                            </span>
                          </>
                        )}
                      </div>
                      <div>
                        <Avatar
                          className={styles.addCompanyFileStyles}
                          size={"36"}
                          round="18px"
                          name={selectedBusiness?.company_name}
                          src={selectedBusiness?.file}
                        />
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </BaseModal>
          )}
        </div>
      </div>
      {displayImage?.length > 0 ? (
        <ImageCropper
          selectedImage={displayImage}
          displayCropper={displayImage?.length > 0}
          handleCroppedImage={(selectedCanvas: any) =>
            handleImageCrop(selectedCanvas)
          }
          removeSelectedImage={() => {
            setCropImage([]);
            setDisplayImage([]);
          }}
        />
      ) : (
        ""
      )}
    </div>
  );
}
