"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./addCurrencyDetails.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import commonStyles from "../../../../common/commonStyles.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useParams } from "next/navigation";

import { toast } from "@/app/Toaster";
import { CheckCurrencyNameExistence } from "@/app/api/existanceAPIsCheck";
import {
  AdminAddCurrencyMaterDetails,
  AdminGetCurrencyById,
  AdminUpdateCurrencyMastesDetails,
} from "./addCurrencyDetails.functions";
import { useDebouncedFieldCheck } from "@/common/commonHooks";

const AddCurrencyDetails = (props: any) => {
  const { setActionScreen, isEdit = false, ...rest } = props;
  const routePath = usePathname();
  const router = useRouter();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [selectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const [editData, setEditData] = useState<any>({});
  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();

  useEffect(() => {
    (async () => {
      if (isEdit && params?.id) {
        const payload: any = {
          currencyId: params?.id || "",
        };
        const userData = await AdminGetCurrencyById(payload);
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
        Name: editData?.currency_name || "",
        CurrencyCode: editData?.short_code || "",
        CurrencySymbol: editData?.symbol || "",
        Status: editData?.status || "Active",
        isCodeExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.status) || {};
      setSingleSelectedData(selOpt);

      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Currency Name is required")
      .max(25, "Total characters cannot be more than 25")
      .test(async function (value, formData: any) {
        if (isEdit && value === editData?.currency_name) return true;
        if (!value.trim()) return true;

        const planNames = formData?.parent?.isCodeExistence;
        if (planNames) {
          return this.createError({
            path: this.path,
            message: "Currency Name already exists.",
          });
        }
        return true;
      }),
    CurrencySymbol: Yup.string().required("Currency Symbol is required"),
    CurrencyCode: Yup.string()
      .required("Currency Code is required")
      .max(5, "Total characters cannot be more than 5"),
    Status: Yup.string().required("Please select a status"),
  });
  const formik = useFormik({
    initialValues: {
      Name: isEdit ? editData?.currency_name : "",
      CurrencyCode: isEdit ? editData?.short_code : "",
      CurrencySymbol: isEdit ? editData?.symbol : "",
      Status: isEdit ? editData?.status : "Active",
      isCodeExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { Name, Status, CurrencyCode, CurrencySymbol } = formik.values;
      let payload = {
        currency_name: Name,
        short_code: CurrencyCode,
        status: Status,
        symbol: CurrencySymbol,
      };
      setIsLoading(true);
      if (isEdit) {
        if (
          editData?.currency_name === Name &&
          editData?.short_code === CurrencyCode &&
          editData?.status === Status &&
          editData?.symbol === CurrencySymbol
        ) {
          setIsLoading(false);
          toast.info("No changes to save");
          return;
        }
        let modifiedPayload = {
          ...payload,
          id: editData?.id,
        };

        let response = await AdminUpdateCurrencyMastesDetails(
          modifiedPayload,
          "Currency has been updated",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_CURRENCY_LIST);
        }
      } else {
        let modifiedPayload = {
          ...payload,
        };
        const response = await AdminAddCurrencyMaterDetails(
          modifiedPayload,
          "Currency has been added.",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_CURRENCY_LIST);
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
    const response = await CheckCurrencyNameExistence(value); // Example API call
    return response;
  };

  const isCodeChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkCodeExistence,
    () => {
      formik.setFieldError("Name", "Currency Name already exists.");
      formik.setFieldValue("isCodeExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isCodeExistence", false);
    } // Success: clear error
  );
  const handleCurrencyNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Name", firstname);
  }, []);
  const handleCodeChange = useCallback((e: any) => {
    let lastname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("CurrencyCode", lastname);
  }, []);
  const handleSymbolChange = useCallback((e: any) => {
    let lastname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("CurrencySymbol", lastname);
  }, []);

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
            href: ApplicationURLS.ADMIN_CURRENCY_LIST,
            label: "Currency",
            active: false,
          },
          {
            href: "",
            label: isEdit ? "Edit Currency" : "Add Currency",
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
            } Currency`}</span>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                maxLength={26}
                type="text"
                errorText={formik?.errors?.Name as string}
                isInvalid={
                  formik?.touched?.Name && formik?.errors?.Name ? true : false
                }
                labelText="Currency Name *"
                name="Name"
                id="Name"
                required
                value={formik.values.Name}
                onChange={handleCurrencyNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <TextField
                placeholder=""
                type="text"
                maxLength={5}
                labelText="Currency Short Code *"
                errorText={formik.errors.CurrencyCode as string}
                isInvalid={
                  formik?.touched?.CurrencyCode && formik?.errors?.CurrencyCode
                    ? true
                    : false
                }
                name="CurrencyCode"
                id="CurrencyCode"
                value={formik?.values?.CurrencyCode}
                onChange={handleCodeChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>

          <Row className={styles.textFieldStyles}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                type="text"
                maxLength={5}
                labelText="Currency Symbol *"
                errorText={formik.errors.CurrencySymbol as string}
                isInvalid={
                  formik?.touched?.CurrencySymbol &&
                  formik?.errors?.CurrencySymbol
                    ? true
                    : false
                }
                name="CurrencySymbol"
                id="CurrencySymbol"
                value={formik?.values?.CurrencySymbol}
                onChange={handleSymbolChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
            <Col lg={6}>
              <SearchableSelect
                key={timeKey}
                options={options}
                selectedData={selectedData}
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
                router.push(ApplicationURLS.ADMIN_CURRENCY_LIST);
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

export default AddCurrencyDetails;
