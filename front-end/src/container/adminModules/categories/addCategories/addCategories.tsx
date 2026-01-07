"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./addCategories.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import commonStyles from "../../../../common/commonStyles.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useParams } from "next/navigation";

import { toast } from "@/app/Toaster";
import {
  AdminAddMasterTypeDetails,
  AdminGetMasterTypeById,
  AdminUpdateMasterTypeDetails,
  CheckCategoryNameExistence,
} from "./addCategories.functions";

import { AdminfetchAllMasterTypeDetails } from "../categoriesList/categoriesList.functions";
import { useDebouncedFieldCheck } from "@/common/commonHooks";

const AddCategories = (props: any) => {
  const { isEdit = false, ...rest } = props;
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
    { value: "Inactive", label: "In Active" },
  ];
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const [clientListOpt, setClientListOpt] = useState([]);
  const [clientListOptData, setClientListOptData] = useState<any>();

  useEffect(() => {
    (async () => {
      const categoryData = await AdminfetchAllMasterTypeDetails();
      if (categoryData?.length > 0) {
        setClientListOpt(categoryData);
      }
      if (isEdit && params?.id) {
        const payload: any = {
          categoryId: params?.id || "",
        };
        const userData = await AdminGetMasterTypeById(payload);
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
        MasterType: editData?.master_type || "",
        Name: editData?.value || "",
        Status: editData?.status || "Active",
        Description: editData?.description || "",
        isValueExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.status) || {};
      setSingleSelectedData(selOpt);
      let masterOpt =
        clientListOpt.find(
          (each: any) => each?.value === editData?.master_type
        ) || {};

      setClientListOptData(masterOpt);
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Category Value is required")
      .max(25, "Total characters cannot be more than 25")
      .test(function (value, context) {
        if (isEdit && value === editData?.value) return true;
        if (!value.trim()) return true; // Handle empty email
        const valueExists = context?.parent?.isValueExistence;
        if (valueExists) {
          return this.createError({
            path: this.path,
            message: "Category Value already exists.",
          });
        }
        return true;
      }),

    Status: Yup.string().required("Please select a status"),
    Description: Yup.string().max(
      200,
      "Total characters cannot be more than 200"
    ),
    MasterType: Yup.string().required("Master Type is required"),
  });
  const formik = useFormik({
    initialValues: {
      MasterType: "",
      Name: isEdit ? editData?.first_name : "",

      Status: isEdit ? editData?.admin_status : "Active",
      Description: "",
      isValueExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { Name, Status, MasterType, Description } = formik.values;
      let payload = {
        description: Description,
        master_type: MasterType,
        status: Status,
        value: Name,
      };
      setIsLoading(true);
      if (isEdit) {
        if (
          editData?.value === Name &&
          editData?.status === Status &&
          editData?.master_type === MasterType &&
          editData?.description === Description
        ) {
          setIsLoading(false);
          toast.info("No changes to save");
          return;
        }
        let modifiedPayload = {
          ...payload,
          id: editData?.id,
        };

        let response = await AdminUpdateMasterTypeDetails(
          modifiedPayload,
          "Master Category  has been updated",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_MASTER_CATEGORIES_LIST);
        }
      } else {
        let modifiedPayload = {
          ...payload,
        };
        const response = await AdminAddMasterTypeDetails(
          modifiedPayload,
          "Master Category has been added.",
          setIsLoading
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_MASTER_CATEGORIES_LIST);
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
  const checkValueExistence = async (value: string) => {
    // Call your API or validation logic for checking email
    const masterTypes = formik.values.MasterType;
    const response = await CheckCategoryNameExistence({
      category: value,
      masterType: masterTypes,
    }); // Example API call
    return response;
  };
  const isValueChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkValueExistence,
    () => {
      formik.setFieldError("Name", "Category Value already exists.");
      formik.setFieldValue("isValueExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isValueExistence", false);
    } // Success: clear error
  );

  const handleFirstNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Name", firstname);
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
            href: ApplicationURLS.ADMIN_MASTER_CATEGORIES_LIST,
            label: "Masters",
            active: false,
          },
          {
            href: "",
            label: isEdit ? "Edit Masters" : "Add Masters",
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
            } Masters`}</span>
          </Row>
          <Row className={`${styles.textFieldStyles}`}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <SearchableSelect
                key={timeKey}
                options={clientListOpt}
                label="Master Type *"
                placeholder="Select the Master Type"
                selectedData={clientListOptData}
                controlStyles={customStyles}
                onChange={(selectedOption) => {
                  formik.handleChange("MasterType")(
                    selectedOption?.value || ""
                  );
                  setClientListOptData(selectedOption);
                }}
                disabled={false}
                isRequired={
                  !formik.values.MasterType && formik.touched.MasterType
                    ? true
                    : false
                }
                errorMessage={formik.errors.MasterType}
              />
            </Col>
            <Col lg={6}>
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

          <Row className={styles.textFieldStyles}>
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder=""
                maxLength={26}
                disabled={formik.values.MasterType.length === 0}
                type="text"
                errorText={formik?.errors?.Name as string}
                isInvalid={
                  formik?.touched?.Name && formik?.errors?.Name ? true : false
                }
                labelText="Category Value *"
                name="Name"
                id="Name"
                required
                value={formik.values.Name}
                onChange={handleFirstNameChange}
                onBlur={formik.handleBlur}
                classNames={commonStyles.inputFieldControl}
              />
            </Col>
          </Row>
          <Row className={styles.textareaStyles}>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formik.values.Description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                name="Description"
                className={
                  formik.touched.Description && formik.errors.Description
                    ? styles.errorBorder
                    : ""
                }
              />
            </Form.Group>
            {formik.touched.Description && formik.errors.Description && (
              <div className={styles.errorContainer}>
                <ExclamationTriangleFill className={styles.crossiconsSyles} />
                <span className={styles.errorTextStyles}>
                  {formik.errors.Description}
                </span>
              </div>
            )}
          </Row>
          <div className={styles.btnContianer}>
            <FormButton
              type={"button"}
              className={styles.cancelBtnStyle}
              onClick={() => {
                toast.info("No changes saved");
                router.push(ApplicationURLS.ADMIN_MASTER_CATEGORIES_LIST);
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

export default AddCategories;
