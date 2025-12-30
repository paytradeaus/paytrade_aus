"use client";
import BaseModal from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { DEBOUNCE_TIMER, InputType } from "@/shared/constant/general";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useState } from "react";
import {
  groupGridHeaders,
  groupRenderData,
  statusOptions,
  tabOptions,
} from "./addUpdateGroups.constants";
import { useFormik } from "formik";
import * as Yup from "yup";
import TabSwitch from "@/components/TabSwitch";
import _, { isEqual } from "lodash";
import DynamicTable from "@/components/Table";
import {
  AdminFetchListOfAllMenus,
  GetGroupDetailsById,
  InsertAdminGroupDetails,
  UpdateGroupDetails,
} from "./addUpdateGroups.functions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useLoaderContext } from "@/context/useLoader";
import { CheckGroupNameExistence } from "@/network/existanceAPIsCheck";
import { useCustomDebounce } from "@/hooks";
import BreadCrumbs from "@/components/BreadCrumbs";

export default function AddUpdateAdminGroups({ editMode }: any) {
  const router = useRouter();
  const params = useParams();
  const queryParams = useSearchParams();
  const IsActivity: any = queryParams.get("from");
  const { setLoader }: any = useLoaderContext();
  const [tabStatus, setTabStatus] = useState(tabOptions()[0]?.value);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [wrongStatusCheck, setWrongStatusCheck] = useState("");

  const [tableLoader, setTableLoader] = useState(false);
  const [groupPrivilegesList, setGroupPrivilegesList] = useState([]);
  const [selectedPrivileges, setSelectedPrivileges] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [patchData, setPatchData] = useState<any>(null);
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [initialRender, setInitialRender] = useState(true);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>({});

  const validationSchema = Yup.object().shape({
    Name: Yup.string()
      .required("Name is required")
      .max(20, "Name must be at most 20 characters")
      .test(function (value: any, formData: any) {
        if (editMode && value === editMode?.group_name) return true;
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

  const formik = useFormik({
    initialValues: {
      Name: "",
      Status: "Active",
      Description: "",
      isNameExistence: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setTabStatus(tabOptions()[1].value);
      if (tabStatus == tabOptions()[1]?.value) {
        handleSubmit();
      }
    },
    validateOnMount: !!editMode,
  });

  useEffect(() => {
    initialInvoke();
  }, []);

  async function initialInvoke() {
    if (!editMode) {
      setInitialPatchedValues({
        formData: formik?.initialValues,
        gridData: [],
      });
    }
    fetchGroupPrivilegesList();
  }

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object

        // Check data existence using verifyClientSuppliersExistence
        const response = await CheckGroupNameExistence(searchTerm.trim());

        // Update error field based on existence check results
        if (response) {
          await formik.setFieldValue("isNameExistence", true);
        } else {
          await formik.setFieldValue("isNameExistence", false);
        }
      }
    }
    if (!initialRender) {
      afterDebounce();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm]);

  async function fetchAddedGroups(listData: any) {
    if (editMode && params?.id) {
      setTableLoader(true);
      const payload: any = {
        id: params?.id || "",
      };

      const response = await GetGroupDetailsById(payload);
      if (response) {
        const formPatch = {
          Name: response?.group_name,
          Status: response?.group_status,
          Description: response?.group_description,
          isNameExistence: false,
        };
        formik.setValues(formPatch);
        setWrongStatusCheck(response?.group_status);
        setPatchData(response);
        const modifiedResponse: any = listData.map((dataObj: any) => {
          return {
            id: dataObj?.menuId,
            checked: response.menuPrivileges.length
              ? response.menuPrivileges.some(
                  (x: any) => x?.menuId == dataObj?.id
                )
              : false,
            ...dataObj,
          };
        });
        setGroupPrivilegesList(modifiedResponse);

        setSelectedPrivileges(modifiedResponse);
        setInitialPatchedValues({
          formData: formPatch,
          gridData: modifiedResponse,
        });
      }
      setTableLoader(false);
    }
  }

  async function fetchGroupPrivilegesList() {
    try {
      setLoader(true);
      const response = await AdminFetchListOfAllMenus();
      if (response?.length) {
        if (editMode) {
          fetchAddedGroups(response);
        }
        setGroupPrivilegesList(response);
      } else {
        setGroupPrivilegesList([]);
      }
      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  function handleNameChange(e: any) {
    let firstName = e?.target?.value.trim()
      ? e?.target?.value
      : e?.target?.value.trim();
    setSearchTerm(e?.target?.value);
    formik.setFieldValue("Name", firstName);
  }

  function handleCancel() {
    const formComparisonResult = isEqual(
      initialPatchedValues.formData,
      formik?.values
    );

    let gridListComparison: boolean = false;
    if (editMode) {
      gridListComparison =
        (selectedPrivileges?.length &&
          initialPatchedValues?.gridData?.length &&
          initialPatchedValues?.gridData.every((x: any) =>
            selectedPrivileges.some((y: any) => y?.id == x?.id)
          )) ||
        false;
    } else if (IsActivity === "log") {
      router.push(AppRoutes.ADMIN_ACTIVITY_LOG);
    } else {
      gridListComparison = selectedPrivileges?.length > 0;
    }
    if (!formComparisonResult || (editMode && !gridListComparison)) {
      setDisplayClosePageConfirmation(true);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.ADMIN_ACTIVITY_LOG);
    } else if (formComparisonResult) {
      onClose();
    }
  }

  function handleTabChange(value: string) {
    setTabStatus(value);
  }

  async function handleSubmit() {
    try {
      const modifiedData = groupPrivilegesList.map((data: any) => {
        return {
          menuId: data?.id,
          listPermission: true,
          viewPermission: true,
          insertPermission: true,
          updatePermission: true,
          deletePermission: true,
          printPermission: true,
          exportPermission: true,
          allPermission: selectedPrivileges.some(
            (obj: any) => obj?.id == data?.id
          ),
        };
      });
      const payload = {
        group_name: formik?.values?.Name,
        group_description: formik?.values?.Description,
        group_status: formik?.values?.Status,
        menuPrivileges: modifiedData,
      };
      setLoader(true);
      if (editMode) {
        let modifiedPayload = {
          ...payload,
          id: patchData?.id,
        };
        let response = await UpdateGroupDetails(
          modifiedPayload,
          "This group has been updated."
        );
        if (response) {
          router.push(AppRoutes.GROUPS);
        }
        setLoader(false);
      } else {
        const response = await InsertAdminGroupDetails(
          payload,
          "New group has been added."
        );
        if (response) {
          router.push(AppRoutes.GROUPS);
        }
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  function handleSelectedData(selectedData: any) {
    const selectedObj: any = groupPrivilegesList.map((x: any) => {
      return {
        ...x,
        checked: selectedData?.some((y: any) => x?.id == y?.id),
      };
    });

    setGroupPrivilegesList(selectedObj);
    setSelectedPrivileges(selectedData);
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  function onClose(appRoute?: string) {
    const route = appRoute ?? AppRoutes.GROUPS;
    router.push(route);
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                path: AppRoutes.ADMIN_DASHBOARD,
                name: "Dashboard",
              },
              {
                path: AppRoutes.GROUPS,
                name: "Manage groups",
              },
            ]}
            activeRoute={editMode ? "Edit group" : "Add group"}
          />
        </div>
        <br />
        {wrongStatusCheck === "Deleted" ? (
          <div className="text_center">
            Respective details are no longer available
          </div>
        ) : (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{`${editMode ? "Edit" : "Add"} group`}</h4>
                      <br />
                      <div className="pt_filters ">
                        <TabSwitch
                          tabOptions={tabOptions(!formik?.values?.Name)}
                          tabValue={tabStatus}
                          onChange={(value: any) => handleTabChange(value)}
                        />
                      </div>
                      {tabStatus == tabOptions()[0]?.value && (
                        <Fragment>
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            label={"Name"}
                            name={"Name"}
                            placeholder={"Enter the plan name"}
                            error={formik.errors?.Name}
                            showError={
                              formik.touched.Name && formik.errors.Name
                            }
                            required
                            onChange={handleNameChange}
                            onBlur={formik.handleBlur("Name")}
                            value={formik.values?.Name}
                          />
                          <FormikControl
                            label={"Status"}
                            name={"Status"}
                            required
                            options={statusOptions}
                            value={formik.values?.Status}
                            onChange={(selectedValue: string) =>
                              formik?.setFieldValue("Status", selectedValue)
                            }
                            error={formik.errors?.Status}
                            showError={
                              formik.touched.Status && formik.errors.Status
                            }
                            renderKey={"label"}
                            valueKey={"value"}
                            onBlur={formik.handleBlur("Status")}
                            control={InputType.SELECT}
                          />

                          <FormikControl
                            control={InputType.TEXT_AREA}
                            label={"Description"}
                            name={"description"}
                            placeholder={"Enter the description"}
                            error={formik.errors?.Description}
                            showError={
                              formik.touched.Description &&
                              formik.errors.Description
                            }
                            onChange={(e: any) =>
                              formik?.setFieldValue(
                                "Description",
                                e?.target?.value
                              )
                            }
                            onBlur={formik.handleBlur("Description")}
                            value={formik.values?.Description}
                          />
                        </Fragment>
                      )}

                      {tabStatus == tabOptions()[1]?.value && (
                        <DynamicTable
                          headers={groupGridHeaders}
                          gridData={groupPrivilegesList}
                          renderRowList={groupRenderData}
                          hidePagination
                          loaderColSpan={2}
                          enableCheckbox
                          checkBoxId={"id"}
                          onGridCheckboxChange={(selectedData: any) => {
                            handleSelectedData(selectedData);
                          }}
                          showLoader={tableLoader}
                          selectedCheckboxRows={selectedPrivileges}
                          headerClassName="manage_admin_groups_header"
                        />
                      )}
                      <br />
                      <br />
                      <div className="grid">
                        <input
                          type="button"
                          value={"Cancel"}
                          className="outline contrast"
                          onClick={() => handleCancel()}
                        />

                        <input
                          type="submit"
                          value={
                            tabStatus == tabOptions()[0]?.value
                              ? "Next"
                              : editMode
                              ? "Update"
                              : "Save"
                          }
                          className="secondary"
                          onClick={() => formik?.handleSubmit()}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="paytradeffectwrap">
              <div className="paytradeffect">
                <div className="themeshade"></div>
                <div className="oceanshade"></div>
                <div className="crabshade"></div>
              </div>
            </div>
            <div className="noise"></div>
            {displayClosePageConfirmation && (
              <BaseModal
                modalId={"updateGroup confirmation"}
                displayModal={displayClosePageConfirmation}
                onClose={handlePageConfirmClose}
                onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
                onConfirm={handlePageConfirmSave}
                firstButtonName="Yes"
                secondButtonName="Save"
                restrictOncloseFunctionInHeader
              >
                <h4 className="text_center">
                  {" "}
                  Are you sure to close and not save?
                </h4>
              </BaseModal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
