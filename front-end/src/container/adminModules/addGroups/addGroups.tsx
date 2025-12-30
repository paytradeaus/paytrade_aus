"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import styles from "./addGroups.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { useParams, usePathname, useRouter } from "next/navigation";
import commonStyles from "./../../../common/commonStyles.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import PermissionsTable from "../../permissonTable/permissionTable";
import TabContainer from "./tabsContainer";
import { PrivilegesInitialData } from "@/common/constants";
import { toast } from "@/app/Toaster";
import { CheckGroupNameExistence } from "@/app/api/existanceAPIsCheck";
import {
  GetGroupDetailsById,
  InsertAdminGroupDetails,
  UpdateGroupDetails,
} from "./addGroups.functions";
import { useDebouncedFieldCheck } from "@/common/commonHooks";

const AddGroups = (props: any) => {
  const { isEdit = false } = props;
  const routePath = usePathname();
  const router = useRouter();
  const params = useParams();
  const [modifiedData, setModifiedData] = useState<any>([]);

  const [singleSelectedData, setSingleSelectedData] = useState<any>({
    value: "Active",
    label: "Active",
  });
  const tabs = [
    { id: "groupDefinition", label: "Group Definition", hasError: false },
    { id: "groupPrivileges", label: "Group Privileges", hasError: true },
    // Add more tabs as needed
  ];
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [loading, setLoading] = useState(false);

  const [privilegesData, setPrivilegesData] = useState(PrivilegesInitialData);
  const [oriPrivilegesData, setOriPrivilegesData] = useState(
    PrivilegesInitialData
  );
  const [editData, setEditData] = useState({
    created_on: "",
    group_description: "",
    group_name: "",
    group_status: "",
    id: "",
  });

  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }
    const descriptionError =
      formik.touched.Description && formik.errors.Description;
    const groupNameError = formik.touched.Name && formik.errors.Name;

    // If there's an error in the Description field, keep the current active tab
    if (descriptionError || groupNameError) {
      return;
    }

    if (formik.values.Name && formik.values.Status) {
      setActiveTab(tabId);
    } else {
      setActiveTab(tabs[0].id);
    }
  };
  useEffect(() => {
    (async () => {
      if (isEdit && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const groupDataResponse = await GetGroupDetailsById(payload);

        if (groupDataResponse?.id) {
          const groupsDataOnly = {
            created_on: groupDataResponse?.created_on,
            group_description: groupDataResponse?.group_description || "",
            group_name: groupDataResponse?.group_name,
            group_status: groupDataResponse?.group_status,
            id: groupDataResponse?.id,
          };

          const menuPrivilegesWithoutTypename =
            groupDataResponse?.menuPrivileges.map(
              ({ __typename, ...rest }: { __typename: any; rest: any }) => rest
            );

          setEditData(groupsDataOnly);

          if (menuPrivilegesWithoutTypename.length > 1) {
            const sortedMenuPrivileges = menuPrivilegesWithoutTypename.sort(
              (a: any, b: any) => {
                // Assuming that you want to keep the order as returned from the API
                return (
                  groupDataResponse?.menuPrivileges.findIndex(
                    (item: any) => item.menuId === a.menuId
                  ) -
                  groupDataResponse?.menuPrivileges.findIndex(
                    (item: any) => item.menuId === b.menuId
                  )
                );
              }
            );
            setPrivilegesData(sortedMenuPrivileges);
            setOriPrivilegesData(sortedMenuPrivileges);
          }
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && editData?.id) {
      formik.setValues({
        Name: editData?.group_name || "",
        Status: editData?.group_status || "Active",
        Description: editData?.group_description || "",
        isNameExistence: false,
      });
      let selOpt =
        options.find((each) => each.value === editData?.group_status) || {};
      setSingleSelectedData(selOpt);
      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Name is required")
      .max(20, "Name must be at most 20 characters")
      .test(function (value, formData: any) {
        if (isEdit && value === editData?.group_name) return true;
        if (!value.trim()) return true; // Handle empty email

        const GroupExists = formData.parent.isNameExistence;
        if (GroupExists) {
          return this.createError({
            path: this.path,
            message: "Group name already exists.",
          });
        }
        return true;
      }),
    Status: Yup.string().required("Please select a status"),
    Description: Yup.string().max(
      200,
      "Description must be at most 200 characters"
    ),
  });
  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
  };
  const formik = useFormik({
    initialValues: {
      Name: "",
      Status: "Active",
      Description: "",
      isNameExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setActiveTab(tabs[1].id);
    },
  });
  const handleMainDataAPI = async () => {
    const { Name, Status, Description } = formik.values;
    const payload = {
      group_name: formik?.values?.Name,
      group_description: formik?.values?.Description,
      group_status: formik?.values?.Status,
      menuPrivileges: modifiedData,
    };
    setLoading(true);
    if (isEdit) {
      if (
        Name === editData?.group_name &&
        Status === editData?.group_status &&
        Description === editData?.group_description &&
        modifiedData === oriPrivilegesData
      ) {
        toast.info("No changes to save");
        setLoading(false);
        return;
      }
      let modifiedPayload = {
        ...payload,
        id: editData?.id,
      };
      let response = await UpdateGroupDetails(
        modifiedPayload,
        "This group has been updated.",
        setLoading
      );
      if (response) {
        router.push(ApplicationURLS.GROUPS);
      }
    } else {
      const response = await InsertAdminGroupDetails(
        payload,
        "New group has been added.",
        setLoading
      );
      if (response) {
        router.push(ApplicationURLS.GROUPS);
      }
    }
  };

  const checkNameExistence = async (name: string) => {
    // Call your API or validation logic for checking email
    const response = await CheckGroupNameExistence(name); // Example API call
    return response;
  };

  const isNameChecking = useDebouncedFieldCheck(
    formik.values.Name,
    checkNameExistence,
    () => {
      formik.setFieldError("Name", "Group name already exists.");
      formik.setFieldValue("isNameExistence", true);
    }, // Error: set error
    (error: any) => {
      formik.setFieldError("Name", "");
      formik.setFieldValue("isNameExistence", false);
    } // Success: clear error
  );

  const handleNameChange = useCallback((e: any) => {
    let firstname = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    formik.setFieldValue("Name", firstname);
  }, []);

  const renderTabSwitch = () => {
    switch (activeTab) {
      case "groupDefinition":
        return (
          <Form
            onSubmit={formik.handleSubmit}
            noValidate
            className={styles.formStyle}
          >
            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6} className={styles.eachFieldBottom}>
                <TextField
                  placeholder=""
                  type="text"
                  errorText={formik.errors.Name}
                  isInvalid={
                    formik.touched.Name && formik.errors.Name ? true : false
                  }
                  labelText="Name *"
                  name="Name"
                  id="Name"
                  required
                  value={formik.values.Name}
                  onChange={handleNameChange}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </Col>
              <Col lg={6}>
                <SearchableSelect
                  key={timeKey}
                  options={options}
                  singleSelectedData={singleSelectedData}
                  onChange={(selectedOption) => {
                    setSingleSelectedData(selectedOption);
                    formik.handleChange("Status")(selectedOption.value);
                  }}
                  placeholder="Status"
                  controlStyles={customStyles}
                  label="Status  *"
                  isRequired={
                    !formik.values.Status && formik.touched.Status
                      ? true
                      : false
                  }
                  errorMessage={formik.errors.Status}
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
                  router.push(ApplicationURLS.GROUPS);
                }}
              >
                Cancel
              </FormButton>
              <FormButton type={"submit"} className={styles.saveBtnStyle}>
                {/* {isEdit ? "Update" : "Save"} */}
                Next
              </FormButton>
            </div>
          </Form>
        );
      case "groupPrivileges":
        return (
          <div className={styles.previligesTable}>
            <PermissionsTable
              privilegesData={privilegesData}
              setPrivilegesData={setPrivilegesData}
              isEdit={isEdit}
              setModifiedData={(v: any) => setModifiedData(v)}
            />
            <div className={styles.btnContianer}>
              <FormButton
                type={"button"}
                className={styles.cancelBtnStyle}
                onClick={() => {
                  toast.info("No changes saved");
                  router.push(ApplicationURLS.GROUPS);
                }}
              >
                Cancel
              </FormButton>
              <FormButton
                type={"button"}
                className={styles.saveBtnStyle}
                disabled={loading}
                onClick={() => handleMainDataAPI()}
              >
                {isEdit ? "Update" : "Save"}
              </FormButton>
            </div>
          </div>
        );
      default:
        return <></>;
    }
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
            href: ApplicationURLS.GROUPS,
            label: "Groups",
            active: false,
          },
          {
            href: "",
            label: isEdit ? "Edit Group" : "Add Group",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <Row>
        <span className={styles.headerText}>{`${
          isEdit ? "Edit" : "Add"
        } Group`}</span>
      </Row>
      {!wrongIdCheck && (
        <TabContainer
          tabs={tabs}
          activeTab={activeTab}
          onTabClick={handleTabClick}
        />
      )}
      {wrongIdCheck ? (
        <div className={styles.noDataStyle}>No data available on this id</div>
      ) : (
        renderTabSwitch()
      )}
    </div>
  );
};

export default AddGroups;
