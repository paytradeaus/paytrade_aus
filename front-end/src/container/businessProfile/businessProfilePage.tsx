"use client";

import React, { useEffect, useState } from "react";
import styles from "./businessProfilePage.module.scss";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { useFormik } from "formik";
import * as Yup from "yup";
import ImageUploader from "@/components/fileUpload/fileUpload";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { AppModal } from "@/components/model/model";
import {
  checkCompanyExistence,
  requestToJoinCompany,
} from "@/app/api/CompanyRegistrationServices";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { jwtDecode } from "jwt-decode";
import { RootState, useAppSelector } from "@/redux/store";
import { setImageName, setImageFile } from "@/redux/slices/imageUploadSlice";
import { CheckQbccExistence } from "@/app/api/existanceAPIsCheck";
import { useCustomDebounce } from "@/common/commonHooks";
import ImageCropper from "@/components/ImageCropper/imageCropper";
import { convertCanvasToFile } from "@/common/commonFunctions";
import { setUserDetails } from "@/redux/slices/userRegistrationDetails";
import Avatar from "react-avatar";

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
  EntityType: Yup.object().required("Entity type is required"),
});

const BusinessProfilePage = () => {
  const router = useRouter();

  const dispatch = useDispatch();
  const options = [
    { value: "Business", label: "Business" },
    { value: "Sole Trader", label: "Sole Trader" },
    { value: "Personal", label: "Personal" },
  ];

  const userDetails: any = useAppSelector(
    (state: RootState) => state.userDetails
  );

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails?.companyDetails
  );

  const [clickedIndex, setClickedIndex] = useState(null);
  const [modalShow, setModalShow] = React.useState(false);
  const [businessName, setBusinessName] = useState<string>("");
  const [companyExists, setCompanyExists] = useState<boolean>(false); // Added state to track company existence
  const [companyNames, setCompanyNames] = useState<any>([]);
  const [selectedId, setSelectedId] = useState<any>({});
  const [cropImage, setCropImage] = useState<any>();

  const [displayImage, setDisplayImage] = useState<any>([]);

  const [accessTokenId, setAccessTokenId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [companyMatch, setCompanyMatch] = useState<any>([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [selectedEntityTypeData, setSelectedEntityTypeData] =
    useState<any>(null);

  const [qbccno, setQbccno] = useState<string>("");
  const debouncedQbccno = useCustomDebounce(qbccno, 700);
  const [qbccError, setQbccError] = useState<string | null>(null);
  const { name, imageFile } = useAppSelector(
    (state: RootState) => state.imagestores
  );

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

  useEffect(() => {
    // Get access token from local storage
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      setAccessTokenId(accessToken);
    }
    if (
      companyDetails?.EntityType &&
      Object?.keys(companyDetails.EntityType)?.length > 0
    ) {
      let setOpt = options.filter(
        (each) => each.value === companyDetails?.companyDetails?.EntityType
      );
      setSelectedEntityTypeData(companyDetails?.EntityType);
      setTimeKey(new Date().getTime());
    }
  }, []);

  const allowedFileTypes = ["image/jpeg", "image/png"]; // Add more as needed
  const maxFileSize = 2 * 1024 * 1024; // 2 MB

  const handleImageSelect = async (file: File) => {
    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Please select a valid image file (JPEG/PNG)."
      );
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error(
        "File size exceeds the limit (2MB). Please select a smaller file."
      );
      return;
    }

    // If validations pass, set the image file
    setDisplayImage([file]);
  };

  async function handleFileConversion(selectedCanvas: any) {
    try {
      const convertedCanvasToFile = await convertCanvasToFile(
        selectedCanvas,
        displayImage
      );
      console.log("convertedCanvasToFile", convertedCanvasToFile);
      setCropImage([convertedCanvasToFile]);
      setDisplayImage([]);
      dispatch(setImageFile(convertedCanvasToFile));
    } catch (err: any) {
      console.log(" ~ handleFileConversion ~ err:", err);
    }
  }

  const handleSkipClick = () => {
    router.push("/user/dashboard");
    dispatch(setUserDetails({}));
    dispatch(setImageFile(null));
  };

  const handleCancelClick = () => {
    setModalShow(false);
    // Handle the cancellation, for example, navigate to a specific page
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

        const names = companyExistenceData?.map((company: any) => {
          return {
            name: company.company_name,
            id: company.company_id,
            file: company?.file,
            type: company?.entity_type,
            legalName: company?.legal_company_name,
          };
        });
        setCompanyNames(names);
        setCompanyMatch(companyExistenceData);
        if (companyExistenceData?.length == 0) {
          setModalShow(false);
          router.push("/user/registration/contact-business");
        } else {
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
        toast.error(
          error.message ||
            "Something went wrong while checking company existence"
        );
        setModalShow(false);

        // Set the companyExists state to false
        setCompanyExists(false);

        // Show an error message or take appropriate action
        toast.error("Error checking company existence. Please try again.");
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

  const handleCompanyNameClick = (name: any, index: any) => {
    // Handle the click event here, for example, you can navigate to a specific page
    setSelectedId(name);
    setClickedIndex(index);
  };

  const handleJoinClick = async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      var decodedToken: any = jwtDecode(accessToken);

      // Check if selectedId exists and has a valid id
      if (!selectedId || !selectedId.id) {
        toast.error("Please select a business to join.");
        return; // Exit function early if company_id is not selected
      }

      try {
        const data = {
          user_name: decodedToken["userName"],
          user_id: decodedToken["userId"],
          company_id: selectedId.id,
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
          toast.success("Request to join company sent successfully!");
          // Close modal
          setModalShow(false);
          // Redirect or handle next steps
          router.push("/user/dashboard");
        }
      } catch (error) {
        // Handle errors
        toast.error("Error occurred while processing the request");
        console.error("Error joining the company:", error);
      }
    }
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.VerificationContainerStyles}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <h5 className={styles.title}>Add A Business Profile</h5>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  labelText="Business Name *"
                  name="Name"
                  id="Name"
                  maxLength={100}
                  value={formik.values.Name}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "Name",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={(e) => {
                    formik.handleBlur(e); // Handle Formik's onBlur
                    if (formik.values.Name.trim() !== "") {
                      // Check if the business name field is not empty
                      setBusinessName(formik.values.Name.trim());
                      // setModalShow(true); // Show the modal
                    }
                  }}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Name && formik.errors.Name
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Name &&
                formik.errors.Name &&
                typeof formik.errors.Name === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Name}
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  labelText="Legal Business Name (if applicable)"
                  name="legalname"
                  id="legalname"
                  maxLength={100}
                  value={formik.values.legalname}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "legalname",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    )
                  }
                  onBlur={formik.handleBlur}
                />
              </div>
              <div className={styles.DropdownStyles}>
                <SearchableSelect
                  options={options}
                  key={timeKey}
                  label="Entity type *"
                  singleSelectedData={selectedEntityTypeData}
                  onChange={(selectedOption) => {
                    setSelectedEntityTypeData(selectedOption);
                    formik?.setFieldValue("EntityType", selectedOption);
                    // formik.handleChange("EntityType")(selectedOption.value); // Set the value in Formik
                  }}
                  errorMessage="Please select an entity type"
                  disabled={false}
                  placeholder=""
                />
                {formik.touched.EntityType &&
                formik.errors.EntityType &&
                typeof formik.errors.EntityType === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.EntityType}
                  </div>
                ) : null}
              </div>
              <div className={styles.textFieldStyles}>
                <TextField
                  placeholder=""
                  type="text"
                  inputMode="numeric"
                  labelText="QBCC No"
                  name="Qbccno"
                  id="Qbccno"
                  maxLength={8}
                  value={formik.values.Qbccno}
                  onChange={(e) => {
                    formik.setFieldValue(
                      "Qbccno",
                      e.target.value.trim()
                        ? e.target.value
                        : e.target.value.trim()
                    );
                    setQbccno(e.target.value);
                  }}
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Qbccno && formik.errors.Qbccno
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Qbccno &&
                formik.errors.Qbccno &&
                typeof formik.errors.Qbccno === "string" ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Qbccno}
                  </div>
                ) : null}
                {(qbccError && (
                  <div className={styles.errorText}>{qbccError}</div>
                )) ||
                  null}
              </div>
              <ImageUploader
                onImageSelect={handleImageSelect}
                inputLabelStyles={styles.CustomInputStyles}
                imagePlaceholder="Add Logo"
                imageStyles={{
                  borderRadius: "10px",
                  objectFit: "fill",
                  display: imageFile ? "block" : "none", // Only display the image if imageFile is set
                }}
                image={cropImage?.length > 0 ? cropImage[0] : imageFile}
              />
              <p className={styles.InfoTextStyle}>
                Click or drag a file to this area to upload
              </p>

              <FormButton
                className={styles.buttonStyles}
                // onClick={handleNextClick}
                type="submit"
              >
                Next
              </FormButton>
              <Button
                className={styles.SkipButtonStyles}
                type="button"
                onClick={handleSkipClick}
              >
                Skip
              </Button>
              <AppModal
                show={modalShow}
                onHide={handleCancelClick}
                secondButtonLabel="Cancel"
                firstButtonLabel="Join"
                modalHeading="Business Match"
                modalBodyTitle=""
                onConfirm={handleJoinClick}
                modalBodyContent={
                  <ul className={styles.matchedCompanyList}>
                    {companyNames.map((name: any, index: any) => (
                      <li
                        key={index}
                        onClick={() => handleCompanyNameClick(name, index)}
                        className={`${styles.matchedCompany} ${
                          clickedIndex === index ? styles.clicked : ""
                        }`} // Apply 'clicked' class if clickedIndex matches the current index
                      >
                        <div className={styles.companyItem}>
                          <div className={styles.companyDetails}>
                            <span className={styles.companyName}>
                              {name?.name}
                            </span>
                            •
                            <span
                              className={`${styles.companyName} ${styles.companyType}`}
                            >
                              {name?.type}
                            </span>
                            •
                            <span
                              className={`${styles.companyName} ${styles.companyType}`}
                            >
                              {name?.legalName}
                            </span>
                          </div>
                          <div>
                            <Avatar
                              className={styles.addCompanyFileStyles}
                              size={"36"}
                              round="18px"
                              // facebook-id="invalidfacebookusername"
                              // name={popoverProfile?.name}
                              src={name?.file}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                }
              />
            </Form>
          </Col>
        </Row>
        {displayImage?.length > 0 ? (
          <ImageCropper
            selectedImage={displayImage}
            displayCropper={displayImage?.length > 0}
            handleCroppedImage={(selectedCanvas: any) =>
              handleFileConversion(selectedCanvas)
            }
            removeSelectedImage={() => setDisplayImage([])}
          />
        ) : (
          ""
        )}
      </Container>
    </div>
  );
};

export default BusinessProfilePage;
