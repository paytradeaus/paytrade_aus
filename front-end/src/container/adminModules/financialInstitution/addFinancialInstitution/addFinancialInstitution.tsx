"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./addFinancialInstitution.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import commonStyles from "../../../../common/commonStyles.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useParams } from "next/navigation";

import { toast } from "@/app/Toaster";
import {
  CheckFinInstitutionExistence,
  CheckFinInstitutionNameExistence,
} from "@/app/api/existanceAPIsCheck";
import {
  AdminAddFinancialInstitutionDetails,
  AdminGetFinancialInstitutionById,
  AdminUpdateFinancialInstitutionDetails,
} from "./addFinancialInstitution.functions";
import { NUMBER_REGEX } from "@/common/constants/general";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import { useDebouncedFieldCheck } from "@/common/commonHooks";

const AddFinancialInstitution = (props: any) => {
  const { setActionScreen, isEdit = false, ...rest } = props;
  const routePath = usePathname();
  const router = useRouter();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [singleSelectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [editData, setEditData] = useState<any>({});
  const options = [
    { value: "Active", label: "Active" },
    { value: "Archived", label: "Archived" },
    { value: "Blocked", label: "Blocked" },
    { value: "Inactive", label: "In Active" },
  ];
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();

  useEffect(() => {
    (async () => {
      if (isEdit && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const userData = await AdminGetFinancialInstitutionById(payload);
        if (userData?.id) {
          setEditData(userData);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (isEdit && editData?.id) {
      formik.setValues({
        Name: editData?.institution_name || "",
        AccountLength: editData?.acc_number_maxlength || "",
        InstitutionCode: editData?.institution_code || "",
        Place: editData?.institution_address || "",
        Status: editData?.institution_status || "Active",
        country: editData?.country || "",
        latitude: editData?.latitude || "",
        longitude: editData?.longitude || "",
        place_id: editData?.place_id || "",
        region: editData?.region || "",
        isCodeExistence: false,
        isNameExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.institution_status) ||
        {};
      setSingleSelectedData(selOpt);

      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Financial Institution Name is required")
      .max(100, "Total characters cannot be more than 100")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.institution_name) return true;
        if (!value.trim()) return true;

        const planNames = formData.parent.isNameExistence;
        if (planNames) {
          return this.createError({
            path: this.path,
            message: "Financial Institution Name already exists.",
          });
        }
        return true;
      }),
    AccountLength: Yup.number()
      .required("Account Number Length is required")
      .min(5, "Account number length should be between 5 and 25 digits")
      .max(25, "Account number length should be between 5 and 25 digits"),
    InstitutionCode: Yup.string()
      .required("Financial Institution Code is required")
      .max(10, "Total characters cannot be more than 10")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.institution_code) return true;
        if (!value.trim()) return true;

        const planNames = formData.parent.isCodeExistence;
        if (planNames) {
          return this.createError({
            path: this.path,
            message: "Financial Institution Code already exists.",
          });
        }
        return true;
      }),
    Status: Yup.string().required("Please select a status"),
  });
  const formik = useFormik({
    initialValues: {
      Name: isEdit ? editData?.first_name : "",
      AccountLength: isEdit ? editData?.last_name : "",
      InstitutionCode: isEdit ? editData?.email_id : "",
      Place: "",
      Status: isEdit ? editData?.admin_status : "Active",
      country: "",
      latitude: "",
      longitude: "",
      place_id: "",
      region: "",
      isCodeExistence: false,
      isNameExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { Name, Status, AccountLength, InstitutionCode, Place } =
        formik.values;
      let payload = {
        acc_number_maxlength: Number(AccountLength),
        institution_code: InstitutionCode,
        institution_name: Name,
        institution_status: Status,
        place: Place,
        institution_address: Place,
        country: values.country,
        latitude: values.latitude.toString(),
        longitude: values.longitude.toString(),
        place_id: values.place_id,
        region: values.region,
      };
      setIsLoading(true);
      if (isEdit) {
        if (
          editData?.institution_name === Name &&
          editData?.acc_number_maxlength === Number(AccountLength) &&
          editData?.institution_code === InstitutionCode &&
          editData?.institution_status === Status &&
          editData?.institution_address === Place
        ) {
          setIsLoading(false);
          toast.info("No changes to save");
          return;
        }
        let modifiedPayload = {
          ...payload,
          id: editData?.id,
        };

        let response = await AdminUpdateFinancialInstitutionDetails(
          modifiedPayload,
          "Financial Institution has been updated",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_LIST);
        }
      } else {
        let modifiedPayload = {
          ...payload,
        };
        const response = await AdminAddFinancialInstitutionDetails(
          modifiedPayload,
          "Financial Institution has been added.",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_LIST);
        }
      }
    },
  });

  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      height: "40px",
      overflowY: "auto",
    }),
  };

  const checkCodeExistence = async (value: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckFinInstitutionExistence(value); // Example API call
    return response;
  };

  const isCodeChecking = useDebouncedFieldCheck(
    formik.values.InstitutionCode,
    checkCodeExistence,
    () => {
      formik.setFieldError(
        "InstitutionCode",
        "Financial Institution Code already exists."
      );
      formik.setFieldValue("isCodeExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("InstitutionCode", "");
      formik.setFieldValue("isCodeExistence", false);
    } // Success: clear error
  );

  const checkNameExistence = async (name: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckFinInstitutionNameExistence(name); // Example API call
    return response;
  };

  const isNameChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkNameExistence,
    () => {
      formik.setFieldError(
        "Name",
        "Financial Institution Name already exists."
      );
      formik.setFieldValue("isNameExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isNameExistence", false);
    } // Success: clear error
  );

  const handleFirstNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Name", firstname);
  }, []);
  const handleLastNameChange = useCallback((e: any) => {
    let lastname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("InstitutionCode", lastname);
  }, []);
  const handleAccNumberChange = useCallback((e: any) => {
    const value = e.target.value.trim();
    if (NUMBER_REGEX.test(value) || value === "") {
      formik.setFieldValue("AccountLength", value);
    }
  }, []);

  const handlePlacesInputChange = (value: string, placeDetails: any) => {
    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

    formik.setValues({
      Name: formik.values.Name,
      Status: formik.values.Status,
      AccountLength: formik.values.AccountLength,
      InstitutionCode: formik.values.InstitutionCode,
      Place: value,
      country: placeDetailsString.country,
      latitude: placeDetailsString.latitude,
      longitude: placeDetailsString.longitude,
      place_id: placeDetailsString.place_id,
      region: placeDetailsString.region,
      isCodeExistence: formik.values.isCodeExistence,
      isNameExistence: formik.values.isNameExistence,
    });
  };

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_LIST,
            label: "Financial Institution",
            active: false,
          },
          {
            href: "",
            label: isEdit
              ? "Edit Financial Institution"
              : "Add Financial Institution",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      {wrongIdCheck ? (
        <div className={styles.noDataStyle}>No data available on this id</div>
      ) : (
        <Form
          onSubmit={formik.handleSubmit}
          noValidate
          className={styles.formStyle}
        >
          <Row>
            <span className={styles.headerText}>{`${
              isEdit ? "Edit" : "Add"
            } Financial Institution`}</span>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                maxLength={101}
                type="text"
                errorText={formik?.errors?.Name as string}
                isInvalid={
                  formik?.touched?.Name && formik?.errors?.Name ? true : false
                }
                labelText="Financial Institution Name *"
                name="Name"
                id="Name"
                required
                value={formik.values.Name}
                onChange={handleFirstNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                maxLength={11}
                labelText="Financial Institution Code *"
                errorText={formik.errors.InstitutionCode as string}
                isInvalid={
                  formik?.touched?.InstitutionCode &&
                  formik?.errors?.InstitutionCode
                    ? true
                    : false
                }
                name="InstitutionCode"
                id="InstitutionCode"
                value={formik?.values?.InstitutionCode}
                onChange={handleLastNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                maxLength={2}
                errorText={formik?.errors?.AccountLength as string}
                isInvalid={
                  formik?.touched?.AccountLength &&
                  formik?.errors?.AccountLength
                    ? true
                    : false
                }
                labelText="Account Number Length *"
                name="AccountLength"
                id="AccountLength"
                required
                value={formik.values.AccountLength}
                onChange={handleAccNumberChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <div className={styles.googlFiledStyles} key={timeKey}>
                <label className={styles.labelStyle}>Head Office </label>
                <GooglePlacesInput
                  key={timeKey}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                  isInvalid={
                    formik.touched.Place && formik.errors.Place ? true : false
                  }
                  value={formik.values.Place}
                  onChange={handlePlacesInputChange} //{formik.handleChange("Place")}
                  onBlur={formik.handleBlur("Place")}
                />
                {formik.touched.Place && formik.errors.Place && (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill
                      className={styles.warningIconStyle}
                    />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.Place}
                    </span>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <Row className={styles.textFieldStyles}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <SearchableSelect
                key={timeKey}
                options={options}
                selectedData={singleSelectedData}
                onChange={(selectedOption) => {
                  formik.handleChange("Status")(selectedOption.value);
                  setSingleSelectedData(selectedOption);
                }}
                placeholder="Status"
                controlStyles={customStyles}
                label="Status *"
                isRequired={
                  !formik?.values?.Status && formik.touched.Status
                    ? true
                    : false
                }
                errorMessage={formik?.errors?.Status as string}
              />
            </Col>
          </Row>
          <div className={styles.btnContianer}>
            <FormButton
              type={"button"}
              className={styles.cancelBtnStyle}
              onClick={() => {
                toast.info("No changes saved");
                router.push(ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_LIST);
              }}
            >
              Cancel
            </FormButton>
            <FormButton
              type={"submit"}
              className={styles.saveBtnStyle}
              disabled={isLoading}
            >
              {isEdit ? "Update" : "Save"}
            </FormButton>
          </div>
        </Form>
      )}
    </div>
  );
};

export default AddFinancialInstitution;
