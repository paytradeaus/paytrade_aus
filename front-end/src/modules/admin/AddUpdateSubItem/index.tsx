"use client";
import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  buttonType,
  DEBOUNCE_TIMER,
  InputType,
} from "@/shared/constant/general";
import { useFormik } from "formik";
import React, { useEffect, useState } from "react";
import { editSubscriptionDetails } from "../ManageItems/manageItems.functions";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { useRouter, useSearchParams } from "next/navigation";

import { useCustomDebounce } from "@/hooks";
import {
  AdminAddSubscriptionItem,
  AdminGetSubscriptionItemById,
  checkSubscriptionItemNameExistence,
} from "./addUpdateSubItem.functions";
import { useParams } from "next/navigation";
import {
  initialValues,
  validationSchema,
} from "./addUpdateSubItem.validations";
import BaseModal from "@/components/BaseModal";
import { isEqual } from "lodash";
import BreadCrumbs from "@/components/BreadCrumbs";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  limitTypeOptions,
  unitOptions,
} from "../AddUpdatePlan/addUpdatePlan.constants";
import CustomButton from "@/components/CustomButton/CustomButton";

export default function AddUpdateSubItems({ editMode, viewMode }: any) {
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const router = useRouter();
  const queryParams = useSearchParams();
  const isArchived = queryParams.get("tab");
  const params = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER);
  const [initialRender, setInitialRender] = useState(true);
  const [patchData, setPatchData] = useState<any>(null);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);

  const [wrongIdCheck, setWrongIdCheck] = useState(false);

  const formik: any = useFormik({
    initialValues: initialValues,
    validationSchema,
    onSubmit: async () => handleSubmit(),
  });

  useEffect(() => {
    if (editMode || viewMode) {
      if (params?.id) {
        fetchManageItems();
      } else {
        setWrongIdCheck(true);
      }
    } else {
      const { isItemNameExist, ...formValues } = formik?.initialValues || {};
      setInitialPatchedValues(formValues);
    }
  }, []);

  function handleItemNameChange(e: any) {
    const value = e.target.value;
    setSearchTerm(value);
    formik.setFieldValue("item_name", value);
  }

  // Debounced search effect for checking item name existence
  useEffect(() => {
    const checkItemNameExistence = async () => {
      if (debouncedSearchTerm) {
        const response = await checkSubscriptionItemNameExistence(
          debouncedSearchTerm.trim()
        );

        if (response?.item_status && response?.item_status !== "Deleted") {
          formik.setFieldValue("isItemNameExist", true);
        } else {
          formik.setFieldValue("isItemNameExist", false);
        }
      }
    };
    if (!initialRender) {
      checkItemNameExistence();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm]);

  async function fetchManageItems() {
    try {
      setLoader(true);
      const payload = {
        id: params.id || "",
      };

      const itemData = await AdminGetSubscriptionItemById(payload);

      if (itemData?.id) {
        setPatchData(itemData);

        // 🔹 Convert dropdown_type object → array for formik
        let dropdownArray: { key: string; value: string }[] = [];
        if (itemData.dropdown_type) {
          dropdownArray = Object.entries(itemData.dropdown_type).map(
            ([k, v]) => ({
              key: k,
              value: v as string,
            })
          );
        }

        // 🔹 Set formik values
        formik.setValues({
          item_name: itemData.item_name || "",
          description: itemData.description || "",
          item_status: itemData.item_status || "Active",
          limit_type: itemData.limit_type || "",
          dropdown_type: dropdownArray.length ? dropdownArray : [],
          unit_type: itemData.unit_type || "",
        });

        setInitialPatchedValues({
          item_name: itemData.item_name,
          description: itemData.description,
          item_status: itemData.item_status,
          limit_type: itemData.limit_type,
          dropdown_type: dropdownArray,
          unit_type: itemData.unit_type,
        });
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  async function handleSubmit() {
    const { values } = formik || {};
    if (setLoader) {
      setLoader(true); // Prevent multiple submissions
    }

    try {
      // 🔹 Convert dropdown array into object if present
      let dropdownPayload: Record<string, string> | null = null;
      if (values.limit_type === "Dropdown" && values.dropdown_type?.length) {
        dropdownPayload = values.dropdown_type.reduce(
          (acc: Record<string, string>, cur: { value?: string }) => {
            if (cur.value) {
              acc[cur.value] = cur.value; // ✅ key and value are the same
            }
            return acc;
          },
          {}
        );
      }
      if (editMode) {
        setLoaderInfo("Updating subscription item...");
        // If `editMode` is true, call the edit service
        const success = await editSubscriptionDetails({
          updateSubscriptionItemInput: {
            id: patchData?.id, // Assuming you have the `id` in form values
            item_name: values?.item_name,
            description: values?.description,
            item_status: values?.item_status,
            limit_type: values?.limit_type,
            unit_type:
              values?.limit_type === "Numeric" ? values?.unit_type : null,
            dropdown_type: dropdownPayload,
          },
        });

        if (success) {
          showSuccessToast("Subscription item updated successfully");
          router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_ITEMS);
        }
        setLoader(false);
      } else {
        // If `isEdit` is false, check if the item name exists first
        if (formik?.values?.isItemNameExist) {
          showErrorToast("Item name already exists.");
          setLoader(false);
          return;
        }
        setLoaderInfo("Saving subscription item...");
        // Call the service to add a subscription item
        const success = await AdminAddSubscriptionItem({
          addSubscriptionItemInput: {
            item_name: values?.item_name,
            description: values?.description,
            item_status: values?.item_status,
            limit_type: values?.limit_type,
            unit_type:
              values?.limit_type === "Numeric" ? values?.unit_type : null,
            dropdown_type: dropdownPayload,
          },
        });

        if (success) {
          router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_ITEMS);
        }
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
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

  function onClose() {
    router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_ITEMS);
  }

  function handleCancel() {
    const { isItemNameExist, ...formValues } = formik?.values || {};

    if (isEqual(initialPatchedValues, formValues)) {
      onClose();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                path: AppRoutes.ADMIN_DASHBOARD,
                name: "Home",
              },
              {
                path: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_ITEMS,
                name: "Manage items",
              },
            ]}
            activeRoute={
              editMode
                ? "Edit subscription item"
                : viewMode
                ? "View subscription item"
                : "Add subscription item"
            }
          />
        </div>
        <br />
        {wrongIdCheck ? (
          <div className="text_center">No data available on this id</div>
        ) : (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{`${
                        editMode ? "Edit" : viewMode ? "View" : "Add"
                      } subscription item`}</h4>
                      <br />

                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Item name"}
                        name={"item_name"}
                        placeholder="Enter item name"
                        error={formik.errors?.item_name}
                        showError={
                          formik.touched.item_name && formik.errors.item_name
                        }
                        required
                        maxLength={150}
                        disabled={viewMode || editMode}
                        onChange={handleItemNameChange}
                        onBlur={formik.handleBlur("item_name")}
                        value={formik.values?.item_name}
                      />

                      <FormikControl
                        label={"Status"}
                        name={"item_status"}
                        required
                        options={statusOptions}
                        value={formik.values?.item_status}
                        onChange={(selectedOption: any) =>
                          formik.setFieldValue("item_status", selectedOption)
                        }
                        placeholder="Status"
                        error={formik.errors?.item_status}
                        showError={
                          formik.touched.item_status &&
                          formik.errors.item_status
                        }
                        renderKey={"label"}
                        valueKey={"value"}
                        disabled={viewMode}
                        onBlur={formik.handleBlur("item_status")}
                        control={InputType.SELECT}
                      />

                      <FormikControl
                        control={InputType.TEXT_AREA}
                        label={"Description"}
                        name={"description"}
                        placeholder={"Enter description"}
                        error={formik.errors?.description}
                        showError={
                          formik.touched.description &&
                          formik.errors.description
                        }
                        disabled={viewMode}
                        rows={3}
                        maxLength={200}
                        onChange={formik?.handleChange}
                        onBlur={formik.handleBlur("description")}
                        value={formik.values?.description}
                      />

                      <div>
                        {/* Limit Type Select */}
                        <FormikControl
                          label={"Limit Type"}
                          placeholder={"Select a limit type"}
                          name={"limit_type"}
                          required
                          options={limitTypeOptions}
                          value={formik.values?.limit_type}
                          onChange={(selected: any) => {
                            formik.setFieldValue("limit_type", selected);
                            // 🔹 Reset dependent fields whenever limit_type changes
                            if (selected === "Dropdown") {
                              formik.setFieldValue("dropdown_type", [
                                { key: "", value: "" },
                              ]);
                              formik.setFieldValue("unit_type", "");
                            } else if (selected === "Numeric") {
                              formik.setFieldValue("unit_type", "");
                              formik.setFieldValue("dropdown_type", []);
                            } else if (selected === "Checkbox") {
                              formik.setFieldValue("dropdown_type", []);
                              formik.setFieldValue("unit_type", "");
                            }
                          }}
                          renderKey="label"
                          valueKey="value"
                          control={InputType.SELECT}
                          disabled={viewMode}
                          error={formik.errors?.limit_type}
                          showError={
                            formik.touched.limit_type &&
                            formik.errors.limit_type
                          }
                          onBlur={formik.handleBlur("limit_type")}
                        />

                        {/* Dropdown */}

                        {formik.values.limit_type === "Dropdown" && (
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                marginBottom: "10px",
                              }}
                            >
                              <label>Dropdown Options</label>
                              <span className="required">*</span>
                            </div>

                            {formik.values.dropdown_type.map(
                              (row: { value?: string }, idx: number) => (
                                <div key={idx} className="optRow">
                                  {/* Left side: serial no (1,2,..) OR + on last row */}
                                  {idx ===
                                  formik.values.dropdown_type.length - 1 ? (
                                    <CustomButton
                                      actionType="button"
                                      buttonName="" // show plus only in last row
                                      buttonType={buttonType.SECONDARY}
                                      aria-label="Add option"
                                      disabled={viewMode}
                                      onClick={() =>
                                        formik.setFieldValue("dropdown_type", [
                                          ...formik.values.dropdown_type,
                                          { value: "" },
                                        ])
                                      }
                                      iconClassName="fa-light fa-plus"
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: 40,
                                        height: 40,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 400,
                                      }}
                                    >
                                      {idx + 1} )
                                    </div>
                                  )}

                                  {/* Input field */}
                                  <div className="fieldWrap">
                                    <FormikControl
                                      type="text"
                                      name={`dropdown_type[${idx}].value`}
                                      value={row.value ?? ""}
                                      placeholder="Enter a value"
                                      required
                                      control={InputType.TEXT_FIELD}
                                      onChange={(e: any) => {
                                        const updated = [
                                          ...formik.values.dropdown_type,
                                        ];
                                        updated[idx] = {
                                          value: e.target.value,
                                        };
                                        formik.setFieldValue(
                                          "dropdown_type",
                                          updated
                                        );
                                      }}
                                      onBlur={() =>
                                        formik.setFieldTouched(
                                          `dropdown_type[${idx}].value`,
                                          true
                                        )
                                      }
                                      error={
                                        formik.errors?.dropdown_type?.[idx]
                                          ?.value
                                      }
                                      showError={
                                        formik.touched?.dropdown_type?.[idx]
                                          ?.value &&
                                        Boolean(
                                          formik.errors?.dropdown_type?.[idx]
                                            ?.value
                                        )
                                      }
                                    />
                                  </div>

                                  {/* Delete icon only from 2nd row onwards */}
                                  {idx > 0 && !viewMode ? (
                                    <CustomButton
                                      actionType="button"
                                      buttonName=""
                                      buttonType={buttonType.CONTRAST}
                                      aria-label="Delete option"
                                      onClick={() => {
                                        const updated = [
                                          ...formik.values.dropdown_type,
                                        ];
                                        updated.splice(idx, 1);
                                        formik.setFieldValue(
                                          "dropdown_type",
                                          updated
                                        );
                                      }}
                                      iconClassName="fa-light fa-trash"
                                      disabled={viewMode}
                                    />
                                  ) : (
                                    <span style={{ width: 40, height: 40 }} />
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* Numeric */}
                        {formik.values.limit_type === "Numeric" && (
                          <SearchableSelect
                            placeholder="Select a unit type"
                            name="unit_type"
                            label="Unit Type"
                            required
                            options={unitOptions}
                            onChange={(selected: any) =>
                              formik.setFieldValue("unit_type", selected?.value)
                            }
                            renderKey="label"
                            valueKey="value"
                            selectedData={unitOptions.find(
                              (opt) => opt.value === formik.values.unit_type
                            )}
                            disabled={viewMode}
                            isRequired={Boolean(
                              formik.errors.unit_type &&
                                formik.touched.unit_type
                            )}
                            errorMessage={formik?.errors?.unit_type as string}
                          />
                        )}
                      </div>

                      <br />
                      <br />
                      <div className="grid">
                        <input
                          type="button"
                          value={viewMode ? "Close" : "Cancel"}
                          className="outline contrast"
                          onClick={() => handleCancel()}
                        />
                        {viewMode && !isArchived && (
                          <input
                            type="button"
                            value={"Edit"}
                            className="secondary"
                            onClick={() =>
                              router.push(
                                `${AppRoutes.ADMIN_EDIT_SUBSCRIPTION_ITEMS}/${params?.id}`
                              )
                            }
                          />
                        )}
                        {!viewMode && (
                          <input
                            type="submit"
                            value={"Save"}
                            className="secondary"
                            onClick={() => formik?.handleSubmit()}
                          />
                        )}
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
                modalId={"plan items confirmation"}
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

const statusOptions = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];
