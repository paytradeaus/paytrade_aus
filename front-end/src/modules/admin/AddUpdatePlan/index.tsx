"use client";
import TabSwitch from "@/components/TabSwitch";
import React, { Fragment, useEffect, useState } from "react";
import {
  planType,
  planTypes,
  statusOptions,
  subscriptionGridHeaders,
  // subscriptionRenderData,
  tabOptions,
} from "./addUpdatePlan.constants";
import FormikControl from "@/components/FormikControl";
import {
  DEBOUNCE_TIMER,
  InputType,
  TWO_DECIMAL_DIGITS_WITH_ONE_OPTIONAL,
} from "@/shared/constant/general";
import { validationSchema } from "./addUpdatePlan.validation";
import { useFormik } from "formik";
import { useCustomDebounce } from "@/hooks";
import {
  AdminAddSubscriptionPlan,
  AdminListSubscriptionItems,
  AdminUpdateSubscriptionPlan,
  CheckSubscriptionPlanNameExistence,
  ViewSubscriptionPlanById,
} from "./addUpdatePlan.functions";
import { formatDollars, removeCommas } from "@/utils";
import { useLoaderContext } from "@/context/useLoader";
import DynamicTable from "@/components/Table";
import _, { isEqual } from "lodash";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { showInfoToast } from "@/components/Toaster";
import moment from "moment";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import BreadCrumbs from "@/components/BreadCrumbs";

interface SubscriptionItem {
  id: string;
  limit_value?: string | number;
  is_unlimited?: boolean | null;
  checked?: boolean;
  limit_type?: "Checkbox" | "Dropdown" | "Numeric";
  dropdown_type?: Record<string, string>;
  // add other properties you need
}

export default function AddUpdateSubscriptionPlan({ editMode, viewMode }: any) {
  const router = useRouter();
  const params = useParams();
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const queryParams = useSearchParams();
  const isArchived = queryParams.get("tab");
  const [tabStatus, setTabStatus] = useState(tabOptions[0]?.value);
  const [searchTerm, setSearchTerm] = useState("");
  const [displaySaveConfirmation, setDisplaySaveConfirmation] = useState(false);
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [initialRender, setInitialRender] = useState(true);
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [subscriptionListItems, setSubscriptionListItems] = useState<
    SubscriptionItem[]
  >([]);

  const [selectedSubscriptionItems, setSelectedSubscriptionItems] = useState<
    SubscriptionItem[]
  >([]);

  const subscriptionRenderData = [
    { key: "item_name" },
    {
      key: "specification",
      render: (rowData: any, index: number) => {
        return renderSpecificationUI(rowData, index);
      },
    },
  ];

  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>({});

  const [tableLoader, setTableLoader] = useState(false);
  const [patchData, setPatchData] = useState<any>({});
  const formik: any = useFormik({
    initialValues: {
      plan_name: "",
      plan_type: "Free",
      description: "",
      plan_status: "Active",
      monthly_price: "",
      yearly_price: "",
      trial_period: "",
      isPlanNameExist: false,
      item_specification: [],
      tab_type: "details",
    },
    validationSchema,
    onSubmit: async () => {
      setTabStatus(tabOptions[1].value);
      if (tabStatus == tabOptions[1]?.value) {
        handleSubmit();
      } else {
        formik.setFieldValue("tab_type", tabOptions[1].value);
      }
    },
    validateOnMount: !!editMode,
  });

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (editMode || viewMode) {
      if (params?.id) {
        const formValues = {
          plan_name: patchData?.plan_name || "",
          description: patchData?.description || "",
          plan_type: patchData?.plan_type || "free",
          monthly_price:
            patchData?.plan_type === "Free"
              ? 0
              : patchData?.monthly_price
              ? formatDollars(patchData?.monthly_price)
              : "",
          yearly_price:
            patchData?.plan_type === "Free"
              ? 0
              : patchData?.yearly_price
              ? formatDollars(patchData?.yearly_price)
              : "",
          trial_period: patchData?.trial_period || 0,
          plan_status: patchData?.plan_status || "",
          tab_type: "details",
        };
        formik.setValues(formValues);

        const itemIds =
          (patchData?.plan_items?.length &&
            patchData?.plan_items.map((each: any) => {
              return each?.id;
            })) ||
          [];

        // let updateSelectedItems: any = [];
        // if (itemIds?.length > 0) {
        //   updateSelectedItems = subscriptionListItems.map((x: any) => {
        //     return { ...x, checked: !!itemIds.includes(x.id) };
        //   });
        //   setSubscriptionListItems(updateSelectedItems);
        //   setSelectedSubscriptionItems(updateSelectedItems);
        // }

        let updateSelectedItems: any = [];
        if (itemIds?.length > 0) {
          updateSelectedItems = subscriptionListItems.map((x: any) => {
            const apiItem = patchData?.plan_items?.find(
              (pi: any) => pi.id === x.id
            );

            return {
              ...x,
              checked: !!itemIds.includes(x.id),
              limit_value: apiItem?.limit_value ?? null,
              is_unlimited: apiItem?.is_unlimited ?? false,
            };
          });

          setSubscriptionListItems(updateSelectedItems);
          setSelectedSubscriptionItems(updateSelectedItems);

          // also update formik.item_specification with same values
          formik.setFieldValue(
            "item_specification",
            updateSelectedItems.map((x: any) => ({
              id: x.id,
              limit_value:
                x.limit_type === "Checkbox"
                  ? x.limit_value ?? "false"
                  : x.limit_type === "Dropdown"
                  ? x.limit_value ?? ""
                  : x.limit_type === "Numeric"
                  ? x.is_unlimited
                    ? ""
                    : x.limit_value ?? ""
                  : x.limit_value,

              is_unlimited: x.is_unlimited,
              checked: x.checked,
              limit_type: x.limit_type,
            }))
          );
        }

        setInitialPatchedValues({
          formData: formValues,
          gridData: updateSelectedItems,
        });
      } else {
        setWrongIdCheck(true);
      }
    }
  }, [patchData]);

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object

        // Check data existence using verifyClientSuppliersExistence
        const response = await CheckSubscriptionPlanNameExistence(
          searchTerm.trim()
        );

        // Update error field based on existence check results
        if (response) {
          await formik.setFieldValue("isPlanNameExist", true);
        } else {
          await formik.setFieldValue("isPlanNameExist", false);
        }
      }
    }
    if (!initialRender) {
      afterDebounce();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm]);

  function handleTabChange(value: string) {
    setTabStatus(value);
    formik.setFieldValue("tab_type", value);
  }

  function handlePlanNameChange(e: any) {
    setSearchTerm(e?.target?.value);
    formik.setFieldValue("plan_name", e?.target?.value);
  }

  function onPlanTypeChange(selectedOption: any) {
    formik.handleChange("plan_type")(selectedOption);

    // If plan type is "Free", clear the monthly and yearly price fields
    if (selectedOption.value === "Free") {
      formik.setFieldValue("monthly_price", 0);
      formik.setFieldValue("yearly_price", 0);
    }
  }

  function handleAmountChange(e: any, fieldTypes: string) {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$ ") {
      formik.setFieldValue(fieldTypes, "");
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

    // Update form value
    formik.setFieldValue(fieldTypes, formattedValue);
  }

  function handleTrailPeriod(e: any) {
    let trail = e?.target?.value.trim();
    if (TWO_DECIMAL_DIGITS_WITH_ONE_OPTIONAL.test(trail) || trail === "") {
      formik.setFieldValue("trial_period", trail ? +trail : "");
    }
  }

  async function fetchSubscriptionDetails() {
    try {
      setLoader(true);
      let itemsData = await AdminListSubscriptionItems({ status: "Active" });
      setSubscriptionListItems(itemsData?.subscriptionItems);

      formik.setFieldValue(
        "item_specification",
        itemsData?.subscriptionItems ?? []
      );

      if ((editMode || viewMode) && params?.id) {
        setLoader(true);
        const payload: any = {
          viewSubscriptionPlanByIdId: params?.id || "",
        };
        const subscriptionsPlanData = await ViewSubscriptionPlanById(payload);

        if (subscriptionsPlanData?.id) {
          setPatchData(subscriptionsPlanData);
        }
        setLoader(false);
      } else {
        setInitialPatchedValues({
          formData: formik?.initialValues,
          gridData: [],
        });
      }
      setLoader(false);
    } catch (err: any) {
      setTableLoader(false);
      setLoader(false);
    }
  }

  const handleSelectedData = (selectedData: SubscriptionItem[]) => {
    const item_specification: any[] = formik?.values?.item_specification ?? [];
    const updatedItems = subscriptionListItems.map((item) => ({
      ...item,
      checked: selectedData.some((sel) => sel.id === item.id),
    }));
    const itemChecked = item_specification?.map((item) => ({
      ...item,
      checked: selectedData.some((sel) => sel.id === item.id),
    }));
    formik.setFieldValue("item_specification", itemChecked);
    setSubscriptionListItems(updatedItems);
    setSelectedSubscriptionItems(updatedItems.filter((x) => x.checked));
  };

  async function handleSubmit() {
    try {
      if (selectedSubscriptionItems.length === 0) {
        showInfoToast(
          `Select any subscription items before ${editMode ? "update" : "save"}`
        );
        return;
      }

      const { isPlanNameExist, ...otherValues } = formik.values;

      const yearlyPaymentValues = removeCommas(otherValues?.yearly_price);
      const yearlyOnlyValues = yearlyPaymentValues.replace(/[^0-9.]/g, "");

      const monthlyPaymentValues = removeCommas(otherValues?.monthly_price);
      const monthlyOnlyValues = monthlyPaymentValues.replace(/[^0-9.]/g, "");

      const itemSpecification = selectedSubscriptionItems.map((item) => {
        let limit_value = null;

        if (item.limit_type === "Checkbox") {
          limit_value = item.limit_value ?? "false";
        } else if (item.limit_type === "Dropdown") {
          limit_value = item.limit_value ?? null;
        } else if (item.limit_type === "Numeric") {
          limit_value = item.is_unlimited ? null : item.limit_value ?? null;
        }

        return {
          item_id: item.id,
          limit_value,
          is_unlimited:
            item.limit_type === "Numeric" ? item.is_unlimited ?? null : null,
        };
      });

      const payLoad = {
        yearly_price: yearlyOnlyValues ? Number(yearlyOnlyValues) : 0,
        monthly_price: monthlyOnlyValues ? Number(monthlyOnlyValues) : 0,
        itemIds: selectedSubscriptionItems
          .filter((x: any) => x?.checked)
          .map((x: any) => x?.id),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        [editMode ? "updated_on" : "created_on"]: moment().format("YYYY-MM-DD"),
        plan_status: formik?.values?.plan_status,
        description: formik?.values?.description || null,
        trial_period: formik?.values?.trial_period || 0,
        // itemIds: selectedSubscriptionItems.map((x) => x.id),
        item_specification: itemSpecification,
      };
      setLoaderInfo(
        editMode
          ? "Updating subscription plan..."
          : "Saving subscription plan..."
      );
      setLoader(true);

      if (editMode) {
        let modifiedPayload = {
          updateSubscriptionPlanInput: {
            ...payLoad,
            id: patchData?.id,
          },
        };
        let response = await AdminUpdateSubscriptionPlan(
          modifiedPayload,
          "This subscription has been updated."
        );
        if (response) {
          router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN);
        }
      } else {
        let addedCreatedBy = {
          addSubscriptionPlanInput: {
            ...payLoad,
            plan_name: formik?.values?.plan_name,
            plan_type: formik?.values?.plan_type,
          },
        };
        const response = await AdminAddSubscriptionPlan(
          addedCreatedBy,
          "New subscription has been added."
        );
        if (response) {
          router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN);
        }
      }
    } catch {
      setLoader(false);
      setLoaderInfo(""); // Clear loader info when done
    } finally {
      setLoader(false);
      setLoaderInfo(""); // Clear loader info when done
    }
  }

  function onClose(appRoute?: string) {
    const route = appRoute ?? AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN;
    router.push(route);
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

  function handleCancel() {
    const formComparisonResult = isEqual(
      initialPatchedValues.formData,
      formik?.values
    );

    let gridListComparison: boolean = false;
    if (editMode) {
      gridListComparison =
        (selectedSubscriptionItems?.length &&
          selectedSubscriptionItems.every((x: any) =>
            initialPatchedValues?.gridData.some((y: any) => y?.id == x?.id)
          )) ||
        false;
    } else {
      gridListComparison = selectedSubscriptionItems?.length > 0;
    }

    if (!formComparisonResult || !gridListComparison) {
      setDisplayClosePageConfirmation(true);
    } else if (formComparisonResult) {
      onClose();
    }
  }

  const hasChanges = () => {
    // Use your already initialized base data from state
    const baseFormData = initialPatchedValues?.formData ?? {};
    const baseGridData = initialPatchedValues?.gridData ?? [];

    if (!baseFormData && !baseGridData) {
      console.warn("⚠️ No baseline data found for comparison.");
      return false;
    }

    // Helper to normalize and clean form data
    const normalize = (obj: any) =>
      JSON.parse(
        JSON.stringify(obj, (_, value) => {
          if (typeof value === "string")
            return value.replace(/[$,]/g, "").trim();
          if (value === null || value === undefined) return "";
          return value;
        })
      );

    // Helper to remove unwanted keys (like tab_type, item_specification)
    const clean = (obj: any, excludeKeys: string[] = []) => {
      if (!obj || typeof obj !== "object") return obj;
      const clone = { ...obj };
      excludeKeys.forEach((key) => delete clone[key]);
      return clone;
    };

    // Normalize and clean form values (ignore tab_type + item_specification)
    const currentForm = clean(normalize(formik.values), [
      "tab_type",
      "item_specification",
    ]);
    const oldForm = clean(normalize(baseFormData), [
      "tab_type",
      "item_specification",
    ]);

    // Compare form changes
    const formChanged = JSON.stringify(currentForm) !== JSON.stringify(oldForm);

    // Compare item list changes separately
    const currentItems = selectedSubscriptionItems.map((x: any) => ({
      id: x.id,
      checked: x.checked,
      limit_value: x.limit_value ?? "",
      is_unlimited: !!x.is_unlimited,
    }));

    const originalItems = baseGridData.map((x: any) => ({
      id: x.id,
      checked: x.checked,
      limit_value: x.limit_value ?? "",
      is_unlimited: !!x.is_unlimited,
    }));

    const itemsChanged =
      JSON.stringify(currentItems) !== JSON.stringify(originalItems);

    if (formChanged || itemsChanged) {
      console.warn("✅ Changes detected:", { formChanged, itemsChanged });
    } else {
      console.warn("🟢 No actual changes detected.");
    }

    return formChanged || itemsChanged;
  };

  function renderSpecificationUI(item: any, index: number) {
    let currentFieldObj = formik?.values?.item_specification?.find(
        (e: any) => e?.id === item?.id
      ),
      currentFieldErr = formik?.errors?.item_specification?.filter(
        (e: any, i: number) => i === index
      )?.[0];

    const handleSpecChange = (
      index: number,
      limit_value: any,
      is_unlimited: boolean | null,
      field_type?: "check" | "text" | "dropdown" | "unlimitedCheck"
    ) => {
      const preVal = formik?.values?.item_specification ?? [];
      const updated: SubscriptionItem[] = [...subscriptionListItems];
      currentFieldObj = preVal?.find((e: any) => e?.id === item?.id);
      const isCustomVal = field_type === "unlimitedCheck";

      preVal[index] = {
        ...preVal[index],
        ...(isCustomVal && { is_unlimited }),
        limit_value,
      };

      updated[index] = {
        ...updated[index],
        limit_value,
        is_unlimited,
        checked: true, // mark as selected when user interacts
      };
      setSubscriptionListItems(updated);
      setSelectedSubscriptionItems(updated.filter((x) => x.checked));
      formik.setFieldValue("item_specification", preVal);
    };

    const commonStyles = { width: "15rem" };

    switch (item.limit_type) {
      case "Checkbox":
        return (
          <FormikControl
            id={`checkbox-${item.id}`}
            name={`checkbox-${item.id}`}
            control={InputType.CHECKBOX}
            // checked={currentFieldObj?.limit_value === "true"} // will be false initially if no value
            value={
              formik?.values?.item_specification?.find(
                (e: any) => e?.id === item?.id
              )?.limit_value === "true"
            }
            onChange={(e: any) => {
              return handleSpecChange(
                index,
                e.target.checked ? "true" : "false",
                null,
                "check"
              );
            }}
            disabled={false}
            style={commonStyles}
          />
        );

      case "Dropdown":
        return (
          <div style={{ maxWidth: "15rem", marginTop: "1rem" }}>
            <FormikControl
              id={`dropdown-${item.id}`}
              name={`dropdown-${item.id}`}
              control={InputType.SELECT}
              placeholder="Select an option"
              options={
                item.dropdown_type
                  ? Object.entries(item.dropdown_type).map(([key, val]) => ({
                      label: String(val),
                      value: String(val),
                    }))
                  : []
              }
              value={currentFieldObj?.limit_value || ""} // empty initially
              onChange={(val: string) => {
                return handleSpecChange(index, val, null, "dropdown");
              }}
              error={currentFieldErr?.limit_value}
              showError={
                currentFieldObj?.checked && currentFieldErr?.limit_value
              }
              renderKey={"label"}
              valueKey={"value"}
            />
          </div>
        );

      case "Numeric":
        return (
          <div
            className="numeric-spec"
            style={{
              display: "contents",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <FormikControl
              id={`numeric-unlimited-${item.id}`}
              control={InputType.CHECKBOX}
              label="Unlimited"
              value={currentFieldObj?.is_unlimited || false} // false initially
              onChange={(e: any) =>
                handleSpecChange(
                  index,
                  null,
                  e.target.checked ? true : false,
                  "unlimitedCheck"
                )
              }
              disabled={false}
            />
            <div style={{ maxWidth: "15rem" }}>
              <FormikControl
                id={`numeric-${item.id}`}
                name={`numeric-${item.id}`}
                control={InputType.TEXT_FIELD}
                value={currentFieldObj?.limit_value || ""} // empty initially
                placeholder="Enter a value"
                onChange={(val: any) => {
                  const text = val?.target?.value?.trim();
                  handleSpecChange(index, text, false, "text");
                }}
                error={currentFieldErr?.limit_value}
                showError={
                  currentFieldObj?.checked && currentFieldErr?.limit_value
                }
                disabled={currentFieldObj?.is_unlimited}
                maxLength={6}
              />
            </div>
          </div>
        );

      default:
        return null;
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
                path: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN,
                name: "Manage plans",
              },
            ]}
            activeRoute={
              editMode
                ? "Edit subscription plan"
                : viewMode
                ? "View subscription plan"
                : "Add subscription plan"
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
                      } subscription plan`}</h4>
                      <br />
                      <div className="pt_filters ">
                        <TabSwitch
                          tabOptions={tabOptions}
                          tabValue={tabStatus}
                          onChange={(value: any) => handleTabChange(value)}
                          disabled={!_.isEmpty(formik?.errors)}
                        />
                      </div>
                      {tabStatus == tabOptions[0]?.value && (
                        <Fragment>
                          <FormikControl
                            control={InputType.TEXT_FIELD}
                            label={"Plan name"}
                            name={"plan_name"}
                            placeholder={"Enter the plan name"}
                            error={formik.errors?.plan_name}
                            showError={
                              formik.touched.plan_name &&
                              formik.errors.plan_name
                            }
                            required
                            disabled={viewMode || editMode}
                            onChange={handlePlanNameChange}
                            onBlur={formik.handleBlur("plan_name")}
                            value={formik.values?.plan_name}
                          />
                          <FormikControl
                            label={"Plan type"}
                            name={"plan_type"}
                            required
                            options={planTypes}
                            value={formik.values?.plan_type}
                            onChange={onPlanTypeChange}
                            error={formik.errors?.plan_type}
                            showError={
                              formik.touched.plan_type &&
                              formik.errors.plan_type
                            }
                            renderKey={"label"}
                            valueKey={"value"}
                            disabled={viewMode || editMode}
                            onBlur={formik.handleBlur("plan_type")}
                            control={InputType.SELECT}
                          />

                          {formik.values.plan_type !== planType.FREE && (
                            <Fragment>
                              <FormikControl
                                label={"Monthly price"}
                                name={"monthly_price"}
                                placeholder={"Enter monthly price"}
                                value={formik.values?.monthly_price}
                                error={formik.errors?.monthly_price}
                                showError={
                                  formik.touched.monthly_price &&
                                  formik.errors.monthly_price
                                }
                                disabled={viewMode}
                                onChange={(e: any) =>
                                  handleAmountChange(e, "monthly_price")
                                }
                                onBlur={formik.handleBlur("monthly_price")}
                                control={InputType.TEXT_FIELD}
                              />

                              <FormikControl
                                label={"Yearly price"}
                                name={"yearly_price"}
                                required
                                placeholder={"Enter yearly price"}
                                value={formik.values?.yearly_price}
                                onChange={(e: any) =>
                                  handleAmountChange(e, "yearly_price")
                                }
                                error={formik.errors?.yearly_price}
                                showError={
                                  formik.touched.yearly_price &&
                                  formik.errors.yearly_price
                                }
                                disabled={viewMode}
                                onBlur={formik.handleBlur("yearly_price")}
                                control={InputType.TEXT_FIELD}
                              />
                            </Fragment>
                          )}

                          <FormikControl
                            label={"Status"}
                            name={"plan_status"}
                            required
                            options={statusOptions}
                            value={formik.values?.plan_status}
                            onChange={(selectedOption: any) =>
                              formik.setFieldValue(
                                "plan_status",
                                selectedOption
                              )
                            }
                            placeholder="Status"
                            error={formik.errors?.plan_status}
                            showError={
                              formik.touched.plan_status &&
                              formik.errors.plan_status
                            }
                            renderKey={"label"}
                            valueKey={"value"}
                            disabled
                            onBlur={formik.handleBlur("plan_status")}
                            control={InputType.SELECT}
                          />

                          {formik.values.plan_type !== planType.FREE && (
                            <FormikControl
                              label={"Trial period"}
                              name={"yearly_price"}
                              placeholder={"Enter trial period in months"}
                              value={formik.values?.trial_period}
                              onChange={handleTrailPeriod}
                              error={formik.errors?.trial_period}
                              showError={
                                formik.touched.trial_period &&
                                formik.errors.trial_period
                              }
                              disabled={viewMode}
                              onBlur={formik.handleBlur("trial_period")}
                              control={InputType.TEXT_FIELD}
                              hint={
                                !formik?.values?.trial_period
                                  ? ""
                                  : formik?.values?.trial_period == 1
                                  ? "month"
                                  : "months"
                              }
                            />
                          )}

                          <FormikControl
                            control={InputType.TEXT_AREA}
                            label={"Description"}
                            name={"description"}
                            placeholder={"Enter the description"}
                            error={formik.errors?.description}
                            showError={
                              formik.touched.description &&
                              formik.errors.description
                            }
                            disabled={viewMode}
                            onChange={formik?.handleChange}
                            onBlur={formik.handleBlur("description")}
                            value={formik.values?.description}
                          />
                        </Fragment>
                      )}

                      {tabStatus == tabOptions[1]?.value && (
                        <DynamicTable
                          headers={subscriptionGridHeaders}
                          gridData={
                            subscriptionListItems?.length
                              ? subscriptionListItems
                              : []
                          }
                          renderRowList={subscriptionRenderData}
                          hidePagination
                          loaderColSpan={2}
                          enableCheckbox
                          checkBoxId={"id"}
                          onGridCheckboxChange={(selectedData: any) => {
                            handleSelectedData(selectedData);
                          }}
                          showLoader={tableLoader}
                          selectedCheckboxRows={selectedSubscriptionItems}
                          disableCheckBox={viewMode}
                        />
                      )}
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
                                `${AppRoutes.ADMIN_EDIT_SUBSCRIPTION_PLAN}/${params?.id}`
                              )
                            }
                          />
                        )}

                        <input
                          type="button"
                          value={
                            tabStatus == tabOptions[0]?.value ? "Next" : "Save"
                          }
                          disabled={formik?.isSubmitting}
                          className="secondary"
                          onClick={() => {
                            if (tabStatus == tabOptions[0]?.value) {
                              formik.handleSubmit(); // move to next tab
                              return;
                            }

                            // show confirmation ONLY when updating and something changed
                            if (editMode && hasChanges()) {
                              setDisplaySaveConfirmation(true);
                            } else if (!editMode) {
                              // for new add mode, just save directly without confirmation
                              formik.handleSubmit();
                            } else {
                              showInfoToast("No changes to save");
                            }
                          }}
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
                modalId={"updatePlan confirmation"}
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
            {displaySaveConfirmation && (
              <BaseModal
                modalId={"savePlanConfirmation"}
                displayModal={displaySaveConfirmation}
                onClose={() => setDisplaySaveConfirmation(false)}
                onHeaderIconClose={() => setDisplaySaveConfirmation(false)}
                onConfirm={() => {
                  setDisplaySaveConfirmation(false);
                  formik.handleSubmit();
                  return true;
                }}
                firstButtonName="Cancel"
                secondButtonName="Save"
              >
                <h4 className="text_center">
                  Have you confirmed this change in writing to existing user ?
                </h4>
              </BaseModal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
