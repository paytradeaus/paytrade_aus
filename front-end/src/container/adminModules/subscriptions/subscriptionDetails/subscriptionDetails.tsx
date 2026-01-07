"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { useParams, usePathname, useRouter } from "next/navigation";
import commonStyles from "./../../../../common/commonStyles.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import TabContainer from "./tabsContainer";
import styles from "./subscriptionDetails.module.scss";
import { toast } from "@/app/Toaster";
import {
  AdminAddSubscriptionPlan,
  ViewSubscriptionPlanById,
  AdminListSubscriptionItems,
  AdminUpdateSubscriptionPlan,
} from "../subscriptions.functions";
import Table from "react-bootstrap/Table";
import CheckBox from "@/components/CheckBox/checkBox";
import { useCustomDebounce } from "@/common/commonHooks";
import { CheckSubscriptionPlanNameExistence } from "@/app/api/existanceAPIsCheck";
import {
  DEBOUNCE_TIMER,
  TWO_DIGITS_WITH_ONE_OPTIONAL,
} from "@/common/constants/general";
import moment from "moment";
import { useLoaderContext } from "@/context/useLoader";
import {
  formatDollars,
  removeCommas,
  replaceDollarSymbol,
} from "@/common/commonFunctions";
import { planType } from "@/container/userModules/manageSubscriptions/manageSubscriptions.constant";

const AddSubscription = (props: any) => {
  const { isEdit = false, isView = false } = props;
  const routePath = usePathname();
  const router = useRouter();
  const params = useParams();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [initialRender, setInitialRender] = useState(true);
  const { setLoader }: any = useLoaderContext();

  const tabs = [
    { id: "details", label: "Details", hasError: false },
    { id: "items", label: "Subscription Items", hasError: true },
    // Add more tabs as needed
  ];
  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];
  const planTypes = [
    { value: "Free", label: "Free" },
    { value: "Paid", label: "Paid" },
  ];

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const [editData, setEditData] = useState<any>({});

  const [planTypeData, setPlanTypeData] = useState<any>({
    value: "Free",
    label: "Free",
  });

  const [allSubscriptionItems, setAllSubscriptionItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedSubscriptionItems, setSelectedSubscriptionItems] = useState<
    string[]
  >([]);

  function handleTabClick(tabId: string) {
    if (activeTab === tabId) {
      return;
    }
    const planTypeError = formik.touched.plan_type && formik.errors.plan_type;
    const planNameError = formik.touched.plan_name && formik.errors.plan_name;
    const statusError = formik.touched.plan_status && formik.errors.plan_status;

    // If there's an error in the Description field, keep the current active tab
    if (planNameError || planTypeError || statusError) {
      return;
    }

    if (
      formik.values.plan_name &&
      formik.values.plan_type &&
      formik.values.plan_status
    ) {
      setActiveTab(tabId);
    } else {
      setActiveTab(tabs[0].id);
    }
  }
  useEffect(() => {
    if (!isEdit || !isView) {
      formik.setFieldValue(
        "plan_status",
        statusOptions.find((x: any) => x?.value === "Active")
      );
    }

    initialInvoke();
  }, []);

  async function initialInvoke() {
    try {
      setLoader(true);
      let itemsData = await AdminListSubscriptionItems({ status: "Active" });

      let modifiedItemsData = itemsData?.subscriptionItems?.map((each: any) => {
        return {
          label: each?.item_name,
          value: each?.id,
          checked: false,
        };
      });
      setAllSubscriptionItems(modifiedItemsData);
      if ((isEdit || isView) && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const subscriptionsPlanData = await ViewSubscriptionPlanById(payload);

        if (subscriptionsPlanData?.id) {
          setEditData(subscriptionsPlanData);
        } else {
          setWrongIdCheck(true);
        }
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

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

  useEffect(() => {
    // Set initial values for formik once editData is available
    if ((isEdit || isView) && editData?.id) {
      formik.setValues({
        plan_name: editData?.plan_name || "",
        description: editData?.description || "",
        plan_type: editData?.plan_type || "free",
        monthly_price:
          editData?.plan_type === "Free"
            ? 0
            : editData?.monthly_price
            ? formatDollars(editData?.monthly_price)
            : "",
        yearly_price:
          editData?.plan_type === "Free"
            ? 0
            : editData?.yearly_price
            ? formatDollars(editData?.yearly_price)
            : "",
        trial_period: editData?.trial_period || 0,
        plan_status:
          statusOptions.find(
            (each: any) => each.value === editData?.plan_status
          ) || "",
      });
      const itemIds =
        (editData?.plan_items?.length &&
          editData?.plan_items.map((each: any) => {
            return each?.id;
          })) ||
        [];

      if (itemIds?.length > 0) {
        const updateSelectedItems: any = allSubscriptionItems.map((x: any) => {
          return { ...x, checked: !!itemIds.includes(x.value) };
        });
        const allSelected = updateSelectedItems.every(
          (item: any) => item.checked
        );
        setSelectAll(allSelected);

        setAllSubscriptionItems(updateSelectedItems);
      }

      let plantOpt =
        planTypes.find((each) => each.value === editData?.plan_type) || {};

      setPlanTypeData(plantOpt);
      setTimeKey(new Date().getTime());
      setSelectedSubscriptionItems(itemIds);
    }
  }, [isView, isEdit, editData]);

  const validationSchema = Yup.object().shape(
    {
      plan_name: Yup.string()
        .required("Plan name is required")
        .max(20, "Plan name must be at most 20 characters")
        .test("plan_name", function (value, formData: any) {
          const isPlanNameExist = formData.parent.isPlanNameExist;
          if (!value) return true; // Handle empty email
          if (isPlanNameExist) {
            return formData.createError({
              path: formData.path,
              message: "Plan name already exist",
            });
          }
          return true;
        }),
      plan_status: Yup.object().required("status is required"),
      plan_type: Yup.string().required("plan type is required"),

      // trial_period: Yup.string().when("plan_type", (formValue: any) => {
      //   if (formValue[0] !== planType.FREE) {
      //     return Yup.string().required("Trial period is required");
      //   } else {
      //     return Yup.string().notRequired();
      //   }
      // }),
      trial_period: Yup.string().notRequired(),

      // yearly_price: Yup.string().when("plan_type", {
      //   is: (val: string) => val !== "Free",
      //   then: (schema) => schema.required("Yearly price is required"),
      // }),

      yearly_price: Yup.string().when(["plan_type"], (otherFieldData: any) => {
        if (otherFieldData[0] !== "Free") {
          return Yup.string()
            .required("Yearly price is required")
            .test("yearly_price", function (value, formData: any) {
              if (replaceDollarSymbol(value) <= 0) {
                return formData.createError({
                  path: formData.path,
                  message: "Yearly price should be greater than zero",
                });
              }
              return true;
            });
        }
        return Yup.string().notRequired(); // Return the schema without any additional validation
      }),

      description: Yup.string().max(
        200,
        "Description must be at most 200 characters"
      ),
    },
    [
      ["plan_type", "plan_type"],
      ["yearly_price", "yearly_price"],
    ]
  );

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
    },
    validationSchema,
    onSubmit: async (values) => {
      setActiveTab(tabs[1].id);
    },
  });

  async function handleSubmit() {
    try {
      if (selectedSubscriptionItems.length === 0) {
        toast.info(
          `Select any subscription items before ${isEdit ? "update" : "save"}`
        );
        return;
      }

      const { isPlanNameExist, ...otherValues } = formik.values;

      const yearlyPaymentValues = removeCommas(otherValues?.yearly_price);
      const yearlyOnlyValues = yearlyPaymentValues.replace(/[^0-9.]/g, "");

      const monthlyPaymentValues = removeCommas(otherValues?.monthly_price);
      const monthlyOnlyValues = monthlyPaymentValues.replace(/[^0-9.]/g, "");

      const payLoad = {
        yearly_price: yearlyOnlyValues ? Number(yearlyOnlyValues) : 0,
        monthly_price: monthlyOnlyValues ? Number(monthlyOnlyValues) : 0,
        itemIds: selectedSubscriptionItems,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        [isEdit ? "updated_on" : "created_on"]: moment().format("YYYY-MM-DD"),
        plan_status: formik?.values?.plan_status?.value,
        description: formik?.values?.description || null,
        trial_period: formik?.values?.trial_period || 0,
      };

      setLoader(true);
      if (isEdit) {
        let modifiedPayload = {
          updateSubscriptionPlanInput: {
            ...payLoad,
            id: editData?.id,
          },
        };
        let response = await AdminUpdateSubscriptionPlan(
          modifiedPayload,
          "This subscription has been updated."
        );
        if (response) {
          router.push(ApplicationURLS.ADMIN_SUBSCRIPTION);
        }
        setLoader(false);
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
          router.push(ApplicationURLS.ADMIN_SUBSCRIPTION);
        }
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  // Main function to handle contract value formatting
  const handleAmountChange = useCallback((e: any, fieldTypes: string) => {
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

    // Update form value
    formik.setFieldValue(fieldTypes, formattedValue);
  }, []);

  function handlePlanNameChange(e: any) {
    setSearchTerm(e?.target?.value);
    formik.setFieldValue("plan_name", e?.target?.value);
  }

  function handleTrailPeriod(e: any) {
    let trail = e?.target?.value.trim();
    if (TWO_DIGITS_WITH_ONE_OPTIONAL.test(trail) || trail === "") {
      formik.setFieldValue("trial_period", trail ? +trail : "");
    }
  }

  const handleCheckboxChange = (index: number) => {
    const updatedItemsData: any = [...allSubscriptionItems];
    updatedItemsData[index].checked = !updatedItemsData[index].checked;
    setAllSubscriptionItems(updatedItemsData);

    // Update selectedItems based on checkbox status
    const selectedItemValue = updatedItemsData[index].value;
    if (updatedItemsData[index].checked) {
      setSelectedSubscriptionItems((prevSelectedItems) => [
        ...prevSelectedItems,
        selectedItemValue,
      ]);
    } else {
      setSelectedSubscriptionItems((prevSelectedItems) =>
        prevSelectedItems.filter((item) => item !== selectedItemValue)
      );
    }
    // Check if all items are selected or not
    const allSelected = updatedItemsData.every((item: any) => item.checked);
    setSelectAll(allSelected);
  };

  // Function to handle select all checkbox change
  const handleSelectAllChange = () => {
    const updatedItemsData: any = allSubscriptionItems.map((item: any) => ({
      ...item,
      checked: !selectAll,
    }));
    setAllSubscriptionItems(updatedItemsData);

    // Update selectedItems based on the new selection status
    const selectedItemsValues = updatedItemsData
      .filter((item: any) => item.checked)
      .map((item: any) => item.value);
    setSelectedSubscriptionItems(selectAll ? [] : selectedItemsValues);

    // Toggle the selectAll state
    setSelectAll(!selectAll);
  };

  function onPlanTypeChange(selectedOption: any) {
    setPlanTypeData(selectedOption);
    formik.handleChange("plan_type")(selectedOption.value);

    // If plan type is "Free", clear the monthly and yearly price fields
    if (selectedOption.value === "Free") {
      formik.setFieldValue("monthly_price", 0);
      formik.setFieldValue("yearly_price", 0);
    }
  }

  function renderTabSwitch() {
    switch (activeTab) {
      case "details":
        return (
          <Form
            onSubmit={formik.handleSubmit}
            noValidate
            className={styles.formStyle}
          >
            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6} className={styles.eachFieldBottom}>
                <TextField
                  placeholder="Enter Plan Name"
                  type="text"
                  errorText={formik.errors.plan_name}
                  isInvalid={
                    !!(formik.touched.plan_name && formik.errors.plan_name)
                  }
                  labelText="Plan Name *"
                  name="plan_name"
                  id="plan_name"
                  required
                  value={formik.values.plan_name}
                  onChange={handlePlanNameChange}
                  onBlur={formik.handleBlur}
                  disabled={isView || isEdit}
                  classNames={commonStyles.inputFieldControl}
                />
              </Col>
              <Col lg={6} className={styles.eachFieldBottom}>
                <SearchableSelect
                  key={timeKey}
                  options={planTypes}
                  selectedData={planTypeData}
                  onChange={(selectedOption) =>
                    onPlanTypeChange(selectedOption)
                  }
                  placeholder="Plan Type"
                  label="Plan Type  *"
                  isRequired={
                    !!(!formik.values.plan_type && formik.touched.plan_type)
                  }
                  disabled={isView || isEdit}
                  errorMessage={formik.errors.plan_type}
                />
              </Col>
            </Row>
            {formik.values.plan_type !== planType.FREE && (
              <Row className={`${styles.textFieldStyles}`}>
                <Col lg={6} className={styles.eachFieldBottom}>
                  <TextField
                    placeholder="Enter Monthly Price"
                    errorText={formik.errors.monthly_price}
                    isInvalid={
                      !!(
                        formik.touched.monthly_price &&
                        formik.errors.monthly_price
                      )
                    }
                    labelText="Monthly Price"
                    name="monthly_price"
                    id="monthly_price"
                    required
                    value={formik.values.monthly_price}
                    // onChange={(e: any) =>
                    //   AppendSymbolWithCurrentValue(
                    //     e?.target?.value,
                    //     "monthly_price",
                    //     formik
                    //   )
                    // }
                    onChange={(e: any) =>
                      handleAmountChange(e, "monthly_price")
                    }
                    disabled={isView}
                    onBlur={formik.handleBlur}
                    classNames={commonStyles.inputFieldControl}
                  />
                </Col>
                <Col lg={6}>
                  <TextField
                    placeholder="Enter Yearly Price"
                    errorText={formik.errors.yearly_price}
                    isInvalid={
                      !!(
                        formik.touched.yearly_price &&
                        formik.errors.yearly_price
                      )
                    }
                    labelText="Yearly Price *"
                    name="yearly_price"
                    id="yearly_price"
                    required
                    value={formik.values.yearly_price}
                    // onChange={(e: any) =>
                    //   AppendSymbolWithCurrentValue(
                    //     e?.target?.value,
                    //     "yearly_price",
                    //     formik
                    //   )
                    // }
                    onChange={(e: any) => handleAmountChange(e, "yearly_price")}
                    disabled={isView}
                    onBlur={formik.handleBlur}
                    classNames={commonStyles.inputFieldControl}
                  />
                </Col>
              </Row>
            )}
            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6} className={styles.eachFieldBottom}>
                <SearchableSelect
                  key={timeKey}
                  options={statusOptions}
                  selectedData={formik?.values?.plan_status}
                  onChange={(selectedOption) =>
                    formik.setFieldValue("plan_status", selectedOption)
                  }
                  placeholder="Status"
                  label="Status *"
                  isRequired={
                    !!(!formik.values.plan_status && formik.touched.plan_status)
                  }
                  disabled
                  errorMessage={formik.errors.plan_status}
                />
              </Col>
              {formik.values.plan_type !== planType.FREE && (
                <Col lg={6}>
                  <TextField
                    placeholder="Enter Trial Period in months"
                    type="number"
                    errorText={formik.errors.trial_period}
                    isInvalid={
                      !!(
                        formik.touched.trial_period &&
                        formik.errors.trial_period
                      )
                    }
                    rightAlignedText={{
                      text:
                        formik.values.trial_period === 1 ? "month" : "months",
                      isVisible: !!formik.values.trial_period,
                    }}
                    rightAlignedTextStyles={styles.endTextStyle}
                    labelText={"Trial Period"}
                    name="trial_period"
                    id="trial_period"
                    required
                    value={formik.values.trial_period}
                    onChange={handleTrailPeriod}
                    onBlur={formik.handleBlur}
                    disabled={isView}
                    classNames={commonStyles.inputFieldControl}
                  />
                </Col>
              )}
            </Row>

            <Row className={styles.textareaStyles}>
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  name="description"
                  className={
                    formik.touched.description && formik.errors.description
                      ? styles.errorBorder
                      : ""
                  }
                  disabled={isView}
                  placeholder="Enter Description"
                />
              </Form.Group>
              {formik.touched.description && formik.errors.description && (
                <div className={styles.errorContainer}>
                  <ExclamationTriangleFill className={styles.crossiconsSyles} />
                  <span className={styles.errorTextStyles}>
                    {formik.errors.description}
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
                  router.push(ApplicationURLS.ADMIN_SUBSCRIPTION);
                }}
              >
                {isView ? "Close" : "Cancel"}
              </FormButton>

              <FormButton type={"submit"} className={styles.saveBtnStyle}>
                Next
              </FormButton>
            </div>
          </Form>
        );
      case "items":
        return (
          <>
            <Table bordered responsive>
              <thead>
                <tr className="text-center">
                  <th>
                    <CheckBox
                      label=""
                      type="checkbox"
                      className={styles.checkBoxHeights}
                      checked={selectAll}
                      disabled={isView}
                      onChange={handleSelectAllChange}
                    />
                  </th>
                  <th>Subscription Items</th>
                </tr>
              </thead>
              <tbody>
                {allSubscriptionItems.map((eachItem: any, index) => (
                  <tr key={eachItem?.id}>
                    <td className="text-center">
                      <CheckBox
                        label=""
                        type="checkbox"
                        className={styles.checkBoxHeights}
                        checked={eachItem?.checked}
                        disabled={isView}
                        onChange={() => handleCheckboxChange(index)}
                      />
                    </td>
                    <td>{eachItem?.label}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className={styles.btnContianer}>
              <FormButton
                type={"button"}
                className={styles.cancelBtnStyle}
                onClick={() => {
                  toast.info("No changes saved");
                  router.push(ApplicationURLS.ADMIN_SUBSCRIPTION);
                }}
              >
                {isView ? "Close" : "Cancel"}
              </FormButton>
              {!isView && (
                <FormButton
                  type={"button"}
                  className={styles.saveBtnStyle}
                  onClick={() => handleSubmit()}
                >
                  {isEdit ? "Update" : "Save"}
                </FormButton>
              )}
            </div>
          </>
        );
      default:
        return <></>;
    }
  }

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.ADMIN_DASHBOARD,
          },
          {
            href: ApplicationURLS.ADMIN_SUBSCRIPTION,
            label: "Manage Plans",
            active: routePath === ApplicationURLS.ADMIN_SUBSCRIPTION,
          },
          {
            href: "",
            label: isEdit ? "Edit subscription plan" : "Add subscription plan",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <Row>
        <span className={styles.headerText}>{`${
          isEdit ? "Edit" : isView ? "View" : "Add"
        } subscription plan`}</span>
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

export default AddSubscription;
