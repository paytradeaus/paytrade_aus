"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form, Modal, Container, Button } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  Cursor,
  ExclamationTriangleFill,
  LayersFill,
  XCircle,
} from "react-bootstrap-icons";
import { useParams, usePathname, useRouter } from "next/navigation";
import styles from "./userProject.module.scss";
import commonStyles from "./../../common/commonStyles.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { toast } from "@/app/Toaster";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import {
  insertProjectDetails,
  CreateProjectInput,
} from "../../container/projectList/projectList.functions";
import { getCurrentUtcTime } from "@/common/commonFunctions";
import Link from "next/link";
import { useLoaderContext } from "@/context/useLoader";
import {
  editProjectDetailsById,
  viewProjectDetails,
} from "./userProject.functions";
import moment from "moment";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import { DECIMAL_WITH_DOLLAR } from "@/common/constants/general";
import TooltipInfoIcon from "@/components/customToolTip/customToolTip";

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),

  description: Yup.string().required("Description is required"),
  headSum: Yup.string().required("Head contract sum is required"),
  modifiedheadSum: Yup.string().required("Head contract sum is required"),
  units: Yup.string().required("Units is required"),
  rta: Yup.object().required("RTA eligibility is required"),
  pta: Yup.object().required("PTA eligibility is required"),
  project: Yup.object().required("Project status is required"),
  role: Yup.object().required("Role is required"),
  retention: Yup.object().required("Retention type is required"),
  Address: Yup.string().required("Address is required"),
});
const customStyles = {
  control: (provided: any) => ({
    height: "40px",
    width: "100%",
  }),
};

const Projects = (props: any) => {
  const { setActionScreen, isEdit = false, ...rest } = props;
  const routePath = usePathname();
  const [fromPreview, setFromPreview] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const router = useRouter();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [groupOptions, setGroupOptions] = useState([]);
  const [multiSelectedData, setMultiSelectedData] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [singleSelectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [roleSelectedData, setRoleSelectedData] = useState<any>({});
  const [retentionSelectedData, setRetentionSelectedData] = useState<any>({}); // State for retention options
  const [unitsSelectedData, setUnitsSelectedData] = useState<any>({}); // State for units options
  const [ptaSelectedData, setPtaSelectedData] = useState<any>({}); // State for PTA options
  const [rtaSelectedData, setRtaSelectedData] = useState<any>({}); // State for RTA options
  const [statusSelectedData, setStatusSelectedData] = useState<any>({}); // State for status options
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [wrongIdCheck, setWorngIdCheck] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const { setLoader }: any = useLoaderContext();
  const [projectId, setProjectId] = useState<string>("");
  const [editProjectId, setEditProjectId] = useState<any>();
  const [editProjectDate, setEditProjectDate] = useState<string>("");
  const [actionData, setActionData] = useState<any>();

  const projectDateFormat = moment(editProjectDate);
  const formatted_date = projectDateFormat.isValid()
    ? projectDateFormat.format("DD/MM/YYYY")
    : "";

  const contractCount = editData?.contract_count;

  const formik = useFormik({
    initialValues: {
      name: isEdit ? editData?.project_name : "",
      description: isEdit ? editData?.project_description : "",
      Address: isEdit ? editData?.site_address : "",
      headSum: isEdit ? editData?.head_contract_sum : "",
      modifiedheadSum: "",
      units: isEdit ? editData?.number_of_units : "",
      retention: isEdit ? editData?.retention_type?.value : "",
      rta: isEdit ? editData?.rta_eligibility?.value : "",
      pta: isEdit ? editData?.pta_eligibility?.value : "",
      role: isEdit ? editData?.project_role?.value : "",
      project: isEdit ? editData?.project_status?.value : "",
    },
    validationSchema,
    onSubmit: async (values) => {
      // Use placeDetails state variable here
      if (!placeDetails) {
        console.error("Place details are not available");
      }
      const {
        name,
        description,
        Address,
        headSum,
        units,
        retention,
        rta,
        pta,
        role,
        project,
      } = formik.values;

      let payload = {
        name: formik?.values?.name,
        description: formik?.values?.description,
        Address: formik?.values?.Address,
        headSum: formik?.values?.headSum,
        units: formik?.values?.units,
        retention: formik?.values?.retention?.value,
        rta: formik?.values?.rta?.value,
        pta: formik?.values?.pta?.value,
        role: formik?.values?.role?.value,
        project: formik?.values?.project?.value,
      };
      setIsLoading(true);
      if (isEdit) {
        if (
          editData?.project_name === name &&
          editData?.project_description === description &&
          editData?.site_address === Address &&
          editData?.head_contract_sum === headSum &&
          editData?.number_of_units === units &&
          editData?.retention_type?.value === retention &&
          editData?.rta_eligibility?.value === rta &&
          editData?.pta_eligibility?.value === pta &&
          editData?.project_role?.value === role &&
          editData?.project_status?.value === project
        ) {
          setIsLoading(false);
          toast.info("No changes to save");
          return;
        }
        const modifiedPayload = {
          ...payload,
          id: editData?.id,
          project_description: formik?.values?.description,
          head_contract_sum: Number(values.headSum),
          number_of_units: Number(formik?.values?.units),
          project_status: formik.values.project?.value,
          pta_eligibility: formik.values.pta?.value,
          retention_type: formik.values.retention?.value,
          rta_eligibility: formik.values.rta?.value,
          ...(contractCount <= 1 && {
            country: placeDetails?.country,
            latitude: placeDetails?.latitude.toString(),
            longitude: placeDetails?.longitude.toString(),
            place_id: placeDetails?.place_id,
            region: placeDetails?.region,
            site_address: placeDetails?.fullAddress,
          }),
        };
        try {
          setIsLoading(true);
          setLoader(true);
          const response = await editProjectDetailsById(modifiedPayload);
          if (response) {
            // toast.success("This project has been added.");
            setLoader(false);
            router.back();
            return;
          }
        } catch (error) {
          setLoader(false);
          // Handle error
          console.error(error);
        }
      } else {
        setFormSubmitted(true);
        const projectInput: CreateProjectInput = {
          country: placeDetails?.country,
          head_contract_sum: Number(values.headSum),
          latitude: placeDetails?.latitude.toString(),
          longitude: placeDetails?.longitude.toString(),
          number_of_units: Number(formik?.values?.units),
          place_id: placeDetails?.place_id,
          project_date: getCurrentUtcTime(),
          project_description: values.description,
          project_name: values.name,
          project_role: formik.values.role?.value,
          project_status: formik.values.project?.value,
          pta_eligibility: formik.values.pta?.value,
          region: placeDetails?.region,
          retention_type: formik.values.retention?.value,
          rta_eligibility: formik.values.rta?.value,
          site_address: placeDetails?.fullAddress,
          company_id: companyId,
        };
        setLoader(true);
        const response = await insertProjectDetails(projectInput);
        if (response) {
          toast.success("This project has been added.");
          setLoader(false);
          router.back();
        } else {
          setLoader(false);
          toast.error("Failed to insert project details");
        }
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        setLoader(true);
        const storedCompanyId = localStorage.getItem("companyId");
        if (storedCompanyId) {
          setCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
        }
        if (isEdit && params?.id) {
          const payload: any = {
            viewProjectDetailsId: params?.id || "",
          };
          const userData = await viewProjectDetails(payload);
          if (userData?.id) {
            setEditData({
              ...userData,
              number_of_units: String(userData.number_of_units),
            });
            setEditProjectId(userData?.project_id);
            setEditProjectDate(userData?.project_date);
          } else {
            setWorngIdCheck(true);
          }
        }
        setLoader(false);
      } catch (error) {
        setLoader(false);

        console.error("Error fetching project ID:", error);
      }
    })();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && Object.keys(editData).length > 0) {
      formik.setValues({
        name: editData?.project_name || "",
        description: editData?.project_description || "",
        Address: editData?.site_address || "",
        headSum: editData?.head_contract_sum || "",
        modifiedheadSum: `$ ${editData?.formatted_head_contract_sum}` || "",
        units: editData?.number_of_units || "",
        retention: {
          value: editData?.retention_type,
          label: editData?.retention_type,
        },
        rta: {
          value: editData?.rta_eligibility,
          label: editData?.rta_eligibility,
        },
        pta: {
          value: editData?.pta_eligibility,
          label: editData?.pta_eligibility,
        },
        role: { value: editData?.project_role, label: editData?.project_role },
        project: {
          value: editData?.project_status,
          label: editData?.project_status,
        },
      });
      setTimeKey(new Date().getTime());
      setSelectedData(editData?.project_role, roleOptions, setRoleSelectedData);
      setSelectedData(
        editData?.retention_type,
        retentionOptions,
        setRetentionSelectedData
      );
      setSelectedData(
        editData?.number_of_units,
        unitsOptions,
        setUnitsSelectedData
      );
      setSelectedData(
        editData?.pta_eligibility,
        ptaOptions,
        setPtaSelectedData
      );
      setSelectedData(
        editData?.rta_eligibility,
        rtaOptions,
        setRtaSelectedData
      );
      setSelectedData(
        editData?.project_status,
        statusOptions,
        setStatusSelectedData
      );
    }
  }, [isEdit, editData]);

  interface Option {
    value: string;
    label: string;
  }

  // Function to set selected data for role or retention
  const setSelectedData = (
    selectedValue: string,
    optionsArray: Option[] | any,
    setterFunction: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const selectedOption = optionsArray.find(
      (opt: Option) => opt?.value === selectedValue
    );
    if (selectedOption) {
      setterFunction(selectedOption);
    } else {
      setterFunction("");
    }
  };

  const handleStatusChange = (selectedOption: any) => {
    if (
      selectedOption.value === "Completed" ||
      selectedOption.value === "Deleted"
    ) {
      setOpenModal(true);
    }
    formik.setFieldValue("project", selectedOption);
    setStatusSelectedData(selectedOption);
  };

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    // Handle the input change and place details here
    const placeDetailsString = JSON.stringify(placeDetails);

    setPlaceDetails(placeDetails);

    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("Address", placeDetailsString);
  };

  const formatDollars = (value: string): string => {
    // Split the number by the decimal point
    const parts = value.split(".");
    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Join the integer and decimal parts (if present)
    return `$${parts.join(".")}`;
  };

  const handleHeadSumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("modifiedheadSum", ""); // Clear formatted value
      formik.setFieldValue("headSum", ""); // Clear raw value
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
      integerPart = integerPart.slice(0, 11);
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    formik.setFieldValue("modifiedheadSum", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("headSum", finalValue); // Raw numeric value
  };

  const roleOptions = [
    { value: "Head Contractor", label: "Head Contractor" },
    { value: "Principal", label: "Principal" },
    { value: "Sub Contractor", label: "Sub Contractor" },
  ];

  const retentionOptions = [
    {
      value: "Bank guaranteed",
      label: "Bank guaranteed",
    },
    { value: "Cash", label: "Cash" },
    { value: "None", label: "None" },
  ];

  const ptaOptions = [
    { value: "No", label: "No" },
    { value: "Yes", label: "Yes" },
  ];

  const rtaOptions = [
    { value: "No", label: "No" },
    { value: "Yes", label: "Yes" },
  ];

  let statusOptions = [
    { value: "Completed", label: "Completed" },
    { value: "Deleted", label: "Deleted" },
    { value: "In Progress", label: "In Progress" },
  ];

  if (!isEdit) {
    // If it's not an edit mode, show only the "In progress" option
    statusOptions = [{ value: "In Progress", label: "In Progress" }];
  }

  useEffect(() => {
    // Set default value in formik
    formik.setFieldValue("project", {
      value: "In Progress",
      label: "In Progress",
    });

    // Set default selected option in dropdown
    setStatusSelectedData({ value: "In Progress", label: "In Progress" });
  }, []);

  const unitsOptions = [
    { value: "1", label: 1 },
    { value: "2", label: 2 },
    {
      value: "3",
      label: 3,
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // const trimmedValue = e?.target?.value.trim();
    const valueToSet = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();

    formik.setFieldValue("Name", valueToSet);

    // Apply the regex pattern to check if the value is valid
    if (/^(?![-.,&_])[-.,&_\w\s]*$/.test(valueToSet)) {
      // If valid, update the formik values
      formik.setFieldValue("name", valueToSet);
    }
    // Otherwise, do nothing or show an error message
  };

  return (
    <Container fluid>
      <div className={styles?.breadcrumb}>
        <ReusableBreadcrumb
          items={[
            {
              href: "/user/dashboard",
              label: "Home",
              active: routePath === "/user/dashboard",
            },
            {
              href: "/user/projects/current",
              label: "Projects",
              active: routePath === "/user/projects/current",
            },
            {
              href: isEdit ? "" : ApplicationURLS.USER_ADD_PROJECT,
              label: isEdit ? "Edit Project" : "Add Project",
              active: isEdit
                ? routePath.startsWith(ApplicationURLS.USER_EDIT_PROJECT)
                : true,
            },
          ]}
          separator={<span className={styles.breadcrumbSeparator}>&gt;</span>}
        />
      </div>
      <Row>
        <Col className={styles.signInForm}>
          <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
            <LayersFill className={styles.contractsIconStyles} />
            <Row>
              <span className={styles.title}>{`${
                isEdit ? "Edit" : "Add"
              } Project`}</span>
            </Row>
            {isEdit && (
              <>
                <div className={styles.headingFlexStyles}>
                  <div>
                    <h5 className={styles.SubHeading}>{`Project ID - ${
                      editProjectId ? editProjectId : ""
                    }`}</h5>
                  </div>
                </div>

                <div className={styles.headingFlexStyles}>
                  <div>
                    <h6 className={styles.DateSubHeading}>Date -&nbsp;</h6>
                  </div>
                  <div>
                    <h6 className={styles.DateSubHeading}>{formatted_date}</h6>
                  </div>
                </div>
              </>
            )}

            <div className={styles.textFieldStyles}>
              <TextField
                placeholder="Add project name"
                disabled={isEdit}
                type="text"
                errorText={formik?.errors?.name as string}
                isInvalid={
                  formik.touched.name && formik.errors.name ? true : false
                }
                labelText="Name *"
                name="name"
                id="name"
                maxLength={150}
                value={formik.values.name}
                onChange={handleChange}
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                classNames={commonStyles.inputFieldControl}
              />
            </div>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={roleOptions}
                disabled={isEdit}
                singleSelectedData={formik.values.role}
                onChange={(selectedOption) => {
                  formik.setFieldValue("role", selectedOption);
                  setRoleSelectedData(selectedOption);
                }}
                placeholder="Select Your project Role"
                controlStyles={customStyles}
                label="Role *"
              />
              {formik.touched.role && formik.errors.role && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik?.errors?.role as string}
                </div>
              )}
            </div>
            <div className={styles.textFieldStyles}>
              <TextField
                as="textarea"
                placeholder="Input short project description/summary"
                type="text"
                errorText={formik?.errors?.description as string}
                isInvalid={
                  formik.touched.description && formik.errors.description
                    ? true
                    : false
                }
                labelText="Description *"
                name="description"
                id="description"
                maxLength={200}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                classNames={commonStyles.inputFieldControl1}
              />
            </div>
            <div className={styles.textFieldStyles}>
              <label className={styles.textFieldStyles}>Address *</label>
              <div className={styles.instructionText}>Search location</div>
              <GooglePlacesInput
                key={timeKey}
                disabled={contractCount > 0}
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                isInvalid={
                  formik.touched.Address && formik.errors.Address ? true : false
                }
                value={formik.values.Address}
                // onChange={formik.handleChange("Address")}
                onChange={handlePlacesInputChange}
                onBlur={formik.handleBlur("Address")}
              />
              {formik.touched.Address && formik.errors.Address && (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik?.errors?.Address as string}
                </div>
              )}
            </div>
            <div className={styles.textFieldStyles}>
              <TextField
                placeholder="Input head contract sum"
                type="text"
                inputMode="numeric"
                labelText="Head Contract Sum (excluding GST) *"
                name="modifiedheadSum"
                id="modifiedheadSum"
                value={formik.values.modifiedheadSum}
                onChange={handleHeadSumChange}
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                className={`${commonStyles.inputFieldControl} ${
                  (formik.touched.modifiedheadSum &&
                    formik.errors.modifiedheadSum) ||
                  (formik.touched.headSum && formik.errors.headSum)
                    ? `${styles.inputError}`
                    : ""
                }`}
                errorText={
                  (formik?.errors?.modifiedheadSum as string) ||
                  (formik?.errors?.headSum as string)
                }
                isInvalid={
                  (formik.touched.modifiedheadSum &&
                    formik.errors.modifiedheadSum) ||
                  (formik.touched.headSum && formik.errors.headSum)
                    ? true
                    : false
                }
              />
            </div>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={retentionOptions}
                singleSelectedData={formik.values.retention}
                onChange={(selectedOption) => {
                  formik.setFieldValue("retention", selectedOption);
                  setRetentionSelectedData(selectedOption);
                }}
                placeholder="Input Retention Type"
                controlStyles={customStyles}
                label="Retention Type *"
              />
              {formik.touched.retention && formik.errors.retention && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik?.errors?.retention as string}
                </div>
              )}
            </div>
            <div className={styles.textFieldStyles}>
              <label htmlFor="units" className="pb-1">
                Units *
                <TooltipInfoIcon tooltipText=" One (1) living unit includes e.g. a single detached dwelling, a duplex unit, or a residential unit designed for separate residential occupation." />
              </label>
              <TextField
                placeholder="Input the number of units"
                type="text"
                inputMode="numeric"
                // labelText="Units *"
                name="units"
                id="units"
                maxLength={2}
                value={formik.values.units}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, ""); // Allow only digits
                  if (parseInt(value) === 0 || value === "") {
                    // Prevent zero from being entered at the beginning or if the value is empty
                    value = ""; // Reset the value to empty if zero is entered at the beginning
                  } else if (value.length > 1 && value[0] === "0") {
                    // If there are more than one character and the first character is zero, remove the leading zero
                    value = value.substring(1);
                  }
                  formik.handleChange({
                    target: {
                      name: "units",
                      value,
                    },
                  });
                }}
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                errorText={formik?.errors?.units as string}
                className={
                  formik.touched.units && formik.errors.units
                    ? `${styles.inputFieldControl} ${styles.inputError}`
                    : styles.inputFieldControl
                }
                isInvalid={
                  formik.touched.units && formik.errors.units ? true : false
                }
              />
            </div>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={ptaOptions}
                placeholder="Is the project eligible for a PTA?"
                singleSelectedData={formik.values.pta}
                onChange={(selectedOption) => {
                  formik.setFieldValue("pta", selectedOption);
                  setPtaSelectedData(selectedOption);
                }}
                controlStyles={customStyles}
                label="PTA Eligibility *"
                disabled={contractCount > 0}
              />
              {formik.touched.pta && formik.errors.pta && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik?.errors?.pta as string}
                </div>
              )}
              <div className={styles.helpText}>
                <Link
                  className={styles.linkStyles}
                  href={
                    "https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool"
                  }
                  target="_blank"
                >
                  Help
                </Link>
              </div>
            </div>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={rtaOptions}
                singleSelectedData={formik.values.rta}
                onChange={(selectedOption) => {
                  formik.setFieldValue("rta", selectedOption);
                  setRtaSelectedData(selectedOption);
                }}
                placeholder="Is the project eligible for a RTA?"
                controlStyles={customStyles}
                label="RTA Eligibility *"
                disabled={contractCount > 0}
              />
              {formik.touched.rta && formik.errors.rta && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik?.errors?.rta as string}
                </div>
              )}
              <div className={styles.helpText}>
                <Link
                  className={styles.linkStyles}
                  href={
                    "https://my.qbcc.qld.gov.au/myQBCC/s/trust-accounts-tool"
                  }
                  target="_blank"
                >
                  Help
                </Link>
              </div>
            </div>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={statusOptions}
                singleSelectedData={formik.values.project}
                onChange={handleStatusChange}
                placeholder="Please select the project current status"
                controlStyles={customStyles}
                label="Project Status *"
              />
              {formik.touched.project && formik.errors.project && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik?.errors?.project as string}
                </div>
              )}
            </div>
            <FormButton
              type="button"
              className={styles.buttonStyles}
              onClick={() => formik.handleSubmit()}
            >
              {isEdit ? "Update" : "Save"}
            </FormButton>
            <Button
              type="button"
              className={styles.SkipButtonStyles}
              onClick={() => {
                toast.info("No changes saved");
                router.push("/user/projects/current");
              }}
            >
              Cancel
            </Button>
          </Form>
        </Col>
      </Row>
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={
          statusSelectedData?.value === "Deleted"
            ? "Are you sure you wish to move the project to the archive with status updated to Deleted?"
            : statusSelectedData?.value === "Completed"
            ? "Are you sure you wish to move the project to the archive with status updated to Completed?"
            : "Are you sure you wish to move the project to the archive?"
        }
        onConfirm={() => setOpenModal(false)}
      />
    </Container>
  );
};

export default Projects;
