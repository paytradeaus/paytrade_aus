"use client";
import React, { useEffect, useRef, useState } from "react";

import { AppRoutes } from "@/shared/constant/appRoutes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FormikControl from "@/components/FormikControl";
import {
  ADD,
  ALPHANUMERIC,
  DEBOUNCE_TIMER,
  EDIT,
  EDITC,
  findSelectedOptions,
  InputType,
  NUMBER_REGEX,
  quickAddRoutes,
  VIEW,
} from "@/shared/constant/general";
import moment from "moment";
import {
  clientSupplierTypeOptions,
  entityType,
  queryParamsData,
  relatedEntityTypeOptions,
  statusTypeOptions,
  xeroGstTypeOptions,
} from "./AddClientsAndSuppliers.constant";
import PhoneInputField from "@/components/phoneNumberInput";
import GooglePlacesInput from "@/components/GooglePlaces";
import {
  setAddTrustRecord,
  setCompanyDetails,
} from "@/redux/slices/companyRegistrationDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { useAddClientsAndSuppliersContext } from "./AddClientsAndSuppliersContext";
import TrustRecordForms from "./TrustRecordForms";
import TrustRecordGrid from "./TrustRecordGrid";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import {
  fetchClientSuppliersById,
  verifyClientSuppliersExistence,
} from "./AddClientsAndSuppliers.functions";
// Task #41 — variable bill code per supplier: per-project override editor
// uses the dedicated mutation + the existing "list projects for company"
// helper so no extra backend query is needed.
import { getProjectsLists } from "../../AddUpdateClaims/AddUpdateClaims.function";
import { useCustomDebounce, useIsClient } from "@/hooks";
import {
  setAccountDetailsData,
  setClientsSuppliersData,
} from "@/redux/slices/clientSuppliersDetails";
import { isEqual } from "lodash";
import { ApiResponse } from "@/shared/constant/messages";

export default function AddClientsAndSuppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [initialRender, setInitialRender] = useState(true);

  const isClientRef = useRef(useIsClient());
  const isClient = isClientRef.current; // Avoid re-evaluating on each render
  const queryParams = useSearchParams();

  if (!isClient) return null; // Ensure consistent hook execution
  const {
    formik,
    displayTrainingRecords,
    setDisplayTrainingRecords,
    accountDetailsGridData,
    setAccountDetailsGridData,
    setDisplayAccountRecordsGrid,
    displayAccountRecordsGrid,
    displayStatusInfo,
    setDisplayStatusInfo,
    handleFormSubmit,
    routeBack,
    quickAddClientSupplier,
    setRoutedData,
    selectedType,
    setSelectedType,
    syncLogData,
    // Task #41 — per-supplier Xero account code override editor.
    projectAccountCodeOverrides,
    setProjectAccountCodeOverrides,
    setInitialProjectAccountCodeOverrides,
  } = useAddClientsAndSuppliersContext() as any;

  const params: any = useParams();
  const router = useRouter();

  const { id: slugData } = params;

  // Task #41 — Project picker options for the override editor. Loaded
  // lazily only when in edit/view mode so the add-supplier flow does
  // not pay the round-trip cost.
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  useEffect(() => {
    if (slugData?.length && slugData[0]?.toLowerCase() !== ADD) {
      const companyId = Number(localStorage.getItem("companyId"));
      if (companyId) {
        getProjectsLists(companyId, false)
          .then((rows: any) => {
            if (Array.isArray(rows)) setProjectOptions(rows);
          })
          .catch(() => {});
      }
    }
  }, [slugData?.[0]]);

  const [patchData, setPatchData] = useState<any>(null);

  const companyDetails: any = useAppSelector(
    (state: RootState) => state?.companyDetails
  );

  const { setLoader }: any = useLoaderContext();
  const [selectedClientSupplierType, setSelectedClientSupplierType] =
    useState("");

  const IsActivity: any = queryParams.get("from");

  const [selectedEntityType, setSelectedEntityType] = useState("");
  const screenTabType = queryParams.get("tab");
  const clientSupplierType = queryParams.get("type");
  const [selectedRelatedEntityType, setSelectedRelatedEntityType] =
    useState<any>("No");
  const errorFieldName = useRef("");

  const postType = useRef("");
  const [selectedStatusType, setSelectedStatusType] =
    useState<any>("Completed");
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const dispatch = useAppDispatch();
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  useEffect(() => {
    formik.setFieldValue("client_supplier_status", { value: "Completed" });

    if (companyDetails?.companyDetails?.values) {
      formik?.setValues({
        ...companyDetails?.companyDetails?.values,
        SubscriptionType: "Basic",
        Address: companyDetails?.companyDetails?.placeDetails?.fullAddress,
      });
    }

    if (companyDetails?.addTrustRecord?.length > 0) {
      setAccountDetailsGridData(companyDetails?.addTrustRecord);
    }
  }, []);
  useEffect(() => {
    if (clientSupplierType) {
      dispatch(setClientsSuppliersData(""));
      dispatch(setAccountDetailsData(""));
      patchClientsSuppliersField(clientSupplierType);
    }
  }, [queryParams.get("type")]);

  useEffect(() => {
    patchFormData();
  }, [patchData]);

  useEffect(() => {
    if (syncLogData) {
      const payload = syncLogData?.api_payload || {};
      const updates: Record<string, any> = {};
      if (payload.client_email_id) {
        updates.client_email_id = payload.client_email_id;
      }
      if (payload.client_supplier_name) {
        updates.client_supplier_name = payload.client_supplier_name;
      }
      if (Object.keys(updates).length > 0) {
        formik.setValues({
          ...formik.values,
          ...updates,
        });
      }
    }
  }, [syncLogData]);

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        if (
          postType.current == "clientEmailId" &&
          !selectedClientSupplierType
        ) {
          return;
        }
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object
        const postData = {
          companyId: Number(localStorage.getItem("companyId")),
          [postType.current]: searchTerm.trim(),
          ...(selectedClientSupplierType
            ? { clientSupplierType: selectedClientSupplierType }
            : {}),
        };

        const response = await verifyClientSuppliersExistence(postData);

        const currentId = formik.values.client_supplier_id;
        const filtered = currentId
          ? response?.filter(
              (item: any) =>
                String(item.client_supplier_id) !== String(currentId)
            )
          : response;

        if (filtered?.length > 0) {
          await formik.setFieldValue(errorFieldName.current, true);
        } else {
          await formik.setFieldValue(errorFieldName.current, false);
        }
      }
    }
    if (!initialRender) {
      afterDebounce();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm, selectedClientSupplierType]);

  useEffect(() => {
    if (slugData?.length) {
      const mode = slugData[0].toLowerCase();

      // Set initial values for "Add" mode
      if (mode === ADD) {
        formik.setFieldValue("client_supplier_status", statusTypeOptions[1]);
        formik.setFieldValue(
          "related_entity",
          relatedEntityTypeOptions[1]?.value
        );
      }

      // Set view mode
      setIsViewMode(mode === VIEW);

      // Fetch client suppliers if in "View" or "Edit" mode
      if (mode === VIEW || mode === EDIT) {
        getClientSuppliers();
      }
    }

    if (quickAddClientSupplier) {
      if (
        quickAddClientSupplier == quickAddRoutes.CLIENT ||
        quickAddClientSupplier == quickAddRoutes.SUPPLIER
      ) {
        patchClientsSuppliersField(quickAddClientSupplier);
      }
      getOnQuickRecord();
    }
  }, []);

  const title = slugData?.length
    ? slugData[0].toLowerCase() === EDITC
      ? "Edit"
      : slugData[0].toLowerCase() === ADD
      ? "Add"
      : slugData[0].charAt(0).toUpperCase() + slugData[0].slice(1).toLowerCase()
    : "";

  function handlePlacesInputChange(value: string, placeDetails: any) {
    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));
    // Handle the input change and place details here
    dispatch(setCompanyDetails({ placeDetails }));
    // Set the formik field value for the "Address" field as a string
    formik.setFieldValue("client_supplier_address", value);
    formik.setFieldValue("country", placeDetailsString.country);
    formik.setFieldValue("latitude", String(placeDetailsString.latitude));
    formik.setFieldValue("longitude", String(placeDetailsString.longitude));
    formik.setFieldValue("place_id", placeDetailsString.place_id);
    formik.setFieldValue("region", placeDetailsString.region);
  }

  function onClickOfPaymentDetails() {
    if (accountDetailsGridData?.length > 0) {
      setDisplayAccountRecordsGrid(true);
    } else {
      formik?.setFieldValue("isTrainingFieldsRequired", true);
      formik?.setFieldValue("isPaymentDetailsRequired", true); // New Fields
      setDisplayTrainingRecords(true);
    }
  }

  function handleNumberFieldChange(e: any, fieldName: string) {
    let value = e?.target?.value.trim();

    if (NUMBER_REGEX.test(value) || value === "") {
      formik.setFieldValue(fieldName, value);
    }
  }
  const getSelectedValue = (options: any, value: any) => {
    return options?.filter((obj: any) => obj?.value === value)?.length > 0
      ? options?.filter((obj: any) => obj?.value === value)?.[0]
      : null;
  };
  const handleRelatedEntityChange = (selectedOption: any) => {
    setSelectedRelatedEntityType(selectedOption);
    formik.setFieldValue("related_entity", selectedOption); // Update the formik field value
    formik.setFieldTouched("related_entity", false); // Reset the touched status
  };

  const updateValues = (obj: any) => {
    formik.setValues({
      client_supplier_id: obj?.client_supplier_id,
      isNameExist: obj?.isNameExist || false,
      client_supplier_name: obj?.client_supplier_name ?? "",
      client_supplier_type:
        getSelectedValue(
          clientSupplierTypeOptions,
          obj?.client_supplier_type
        ) ?? null,
      related_entity: obj?.related_entity ?? null,
      business_name: obj?.business_name ?? "",
      entity_type: getSelectedValue(entityType, obj?.entity_type) ?? null,
      client_supplier_address: obj?.client_supplier_address ?? "",
      latitude: obj?.latitude,
      longitude: obj?.longitude,
      place_id: obj?.place_id,
      region: obj?.region,
      country: obj?.country,
      client_phone_no: obj?.client_phone_no ?? "",
      isEmailExist: obj?.isEmailExist || false,
      client_email_id: obj?.client_email_id ?? "",
      client_website: obj?.client_website ?? "",
      acn_number: obj?.acn_number ?? "",
      abn_number: obj?.abn_number ?? "",
      tfn_number: obj?.tfn_number ?? "",
      isQbccExist: obj?.isQbccExist || false,
      qbcc_number: obj?.qbcc_number ?? "",
      account_details: obj?.account_details ?? "",
      client_supplier_status: obj?.client_supplier_status ?? null,
      // Phase 2 — per-contact Xero GST overrides.
      xero_sales_gst_setting: obj?.xero_sales_gst_setting ?? "",
      xero_purchases_gst_setting: obj?.xero_purchases_gst_setting ?? "",
      // Task #41 — per-supplier default Xero account code.
      xero_default_account_code: obj?.xero_default_account_code ?? "",
    });
    const seededOverrides = Array.isArray(
      obj?.xero_project_account_code_overrides,
    )
      ? obj.xero_project_account_code_overrides.map((row: any) => ({
          id: row?.id,
          project_id: row?.project_id,
          project_name: row?.project_name ?? "",
          account_code: row?.account_code ?? "",
        }))
      : [];
    setProjectAccountCodeOverrides(seededOverrides);
    setInitialProjectAccountCodeOverrides(
      seededOverrides.map((r: any) => ({ ...r })),
    );
    setSelectedEntityType(obj?.entity_type);
    setSelectedRelatedEntityType(obj?.related_entity);
    setSelectedStatusType(obj?.client_supplier_status);
    setSelectedClientSupplierType(obj?.client_supplier_type);
  };
  async function patchClientsSuppliersField(clientSupplierType: string) {
    if (clientSupplierType) {
      const queryValue: any =
        clientSupplierType === queryParamsData.CLIENT
          ? clientSupplierTypeOptions[0]
          : clientSupplierType === queryParamsData.SUPPLIER
          ? clientSupplierTypeOptions[1]
          : "";
      await formik.setFieldValue("client_supplier_type", queryValue);

      setSelectedClientSupplierType(queryValue?.value);
    }
  }
  async function patchFormData() {
    if (patchData) {
      // Update form fields with patch data
      await formik.setValues({
        ...patchData,
        account_details:
          accountDetailsGridData?.length || accountDetailsGridData === null
            ? accountDetailsGridData
            : patchData?.account_details,
      });
      // Update time key (it's for tracking form updates)
      setTimeKey(new Date().getTime());
    }
  }
  async function getClientSuppliers() {
    try {
      setLoader(true);
      // Prepare data for fetching client/supplier details by ID
      const postData = {
        id: slugData[1],
      };
      // Send request to fetch client/supplier details by ID from the backend API
      const response: any = await fetchClientSuppliersById(postData);
      if (response) {
        // Process the response data and update state variables with the fetched information
        const clientsSuppliersFormData = {
          ...response,
          client_supplier_type: response?.client_supplier_type
            ? findSelectedOptions(
                clientSupplierTypeOptions,
                response?.client_supplier_type
              )
            : "",
          related_entity: response?.related_entity || "",
          entity_type: response?.entity_type
            ? findSelectedOptions(entityType, response?.entity_type)
            : "",
          client_supplier_status: response?.client_supplier_status
            ? findSelectedOptions(
                statusTypeOptions,
                response?.client_supplier_status
              )
            : "",
        };

        setPatchData(clientsSuppliersFormData);
        updateValues(response);

        setAccountDetailsGridData(response?.account_details || "");
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }
  async function checkFieldDataExistence(
    fieldName: string,
    enteredValue: string,
    dynamicPostType: string,
    dynamicErrorFieldName: string
  ) {
    await formik?.setFieldValue(fieldName, enteredValue);
    await formik.setFieldTouched(fieldName, true);

    if (!enteredValue) {
      await formik?.setFieldError(`${fieldName} is required`);
      await formik.setFieldValue(errorFieldName, false);
      return; // Early return if field is empty
    }
    setSearchTerm(enteredValue);
    errorFieldName.current = dynamicErrorFieldName;
    postType.current = dynamicPostType;
  }

  function handleNameChange(
    fieldName: string,
    enteredValue: string,
    postType: string,
    errorFieldName: string
  ) {
    if (enteredValue?.length <= 150) {
      checkFieldDataExistence(
        fieldName,
        enteredValue,
        postType,
        errorFieldName
      );
    }
  }
  function handleCancel() {
    const existingFormValues = formik.values || {};
    const initialFormValues =
      slugData[0] === "add" ? formik.initialValues : patchData || {};

    if (isEqual(initialFormValues, existingFormValues)) {
      handleUnsavedChanges();
    } else {
      setDisplayClosePageConfirmation(true);
    }

    if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    }
  }

  function handleUnsavedChanges() {
    // Clear client/supplier and account details data
    dispatch(setClientsSuppliersData(""));
    dispatch(setAccountDetailsData(""));
    setAccountDetailsGridData([]);
    dispatch(setAddTrustRecord([]));
    routeBack();
  }
  function handleBusinessNameChange(value: any) {
    if ((ALPHANUMERIC.test(value) || !value) && value?.length <= 150) {
      formik.setFieldValue("business_name", value);
    }
  }
  function handleQbccChange(
    fieldName: string,
    enteredValue: string,
    postType: string,
    errorFieldName: string
  ) {
    if (NUMBER_REGEX.test(enteredValue) || !enteredValue) {
      // Trigger a function to check the existence of field data
      checkFieldDataExistence(
        fieldName,
        enteredValue,
        postType,
        errorFieldName
      );
    }
  }
  function navigateToEdit() {
    router.push(
      `${AppRoutes.USER_EDIT_CLIENTS_AND_SUPPLIERS}/${patchData?.id}`
    );
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    routeBack();
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  async function getOnQuickRecord() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();
      if (result.status == ApiResponse.SUCCESS) {
        if (result?.data?.displayClientPaymentForm) {
          onClickOfPaymentDetails();
        }
        setRoutedData(result?.data);
      }
    } catch {}
  }

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="grid">
              <div className="pt_login">
                <h4>{`${title} clients/suppliers`}</h4>
                <br />
                <FormikControl
                  placeholder={"Select a client or supplier"}
                  required
                  label={"Client/supplier"}
                  name={"client_supplier_type"}
                  options={clientSupplierTypeOptions}
                  control={InputType.SELECT}
                  error={formik.errors.client_supplier_type}
                  showError={
                    formik.touched.client_supplier_type &&
                    formik.errors.client_supplier_type
                  }
                  value={selectedClientSupplierType}
                  onBlur={formik.handleBlur("client_supplier_type")}
                  renderKey="label"
                  valueKey="value"
                  disabled={
                    isViewMode ||
                    quickAddClientSupplier == quickAddRoutes.CLIENT ||
                    quickAddClientSupplier == quickAddRoutes.SUPPLIER
                  }
                  onChange={(value: any) => {
                    setSelectedClientSupplierType(value);
                    setSelectedType(value);
                    formik.setFieldValue("client_supplier_type", {
                      value: value,
                    }); // Update the formik field value
                    formik.setFieldTouched("client_supplier_type", false); // Reset the touched status to hide error
                  }}
                />
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Name"}
                  name={"client_supplier_name"}
                  placeholder="Add business/sole trader/personal name"
                  error={formik.errors.client_supplier_name}
                  showError={
                    formik.touched.client_supplier_name &&
                    formik.errors.client_supplier_name
                  }
                  required
                  onChange={(e: any) =>
                    handleNameChange(
                      "client_supplier_name",
                      e?.target?.value,
                      "clientSupplierName",
                      "isNameExist"
                    )
                  }
                  onBlur={formik.handleBlur("client_supplier_name")}
                  value={formik.values.client_supplier_name}
                  disabled={
                    isViewMode || !formik?.values?.client_supplier_type?.value
                  }
                />
                {slugData?.length && slugData[0] !== ADD && (
                  <div className="mt-2">
                    <div className="cardFieldSubText">
                      {`Client/Supplier id - ${
                        formik?.values?.client_supplier_id ?? ""
                      }`}
                    </div>
                    {patchData?.created_on && (
                      <div className="cardFieldSubText">
                        {` Date - ${moment(patchData?.created_on).format(
                          "DD/MM/YYYY"
                        )}`}
                      </div>
                    )}
                  </div>
                )}

                <FormikControl
                  placeholder={"Select related entity"}
                  required
                  label={"Related entity"}
                  name={"related_entity"}
                  selectedData={formik.values.related_entity}
                  options={relatedEntityTypeOptions}
                  control={"select"} // Assuming InputType.SELECT resolves to "select"
                  error={formik.errors.related_entity}
                  showError={
                    formik.touched.related_entity &&
                    !!formik.errors.related_entity
                  }
                  value={formik.values.related_entity}
                  onBlur={formik.handleBlur("related_entity")}
                  renderKey="label"
                  valueKey="value"
                  disabled={isViewMode}
                  onChange={handleRelatedEntityChange}
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Business name (if applicable)"}
                  placeholder="Add business name"
                  name={"business_name"}
                  error={formik.errors.business_name}
                  disabled={isViewMode}
                  showError={
                    formik.touched.business_name && formik.errors.business_name
                  }
                  onChange={(e: any) =>
                    handleBusinessNameChange(e?.target?.value)
                  }
                  onBlur={formik.handleBlur("business_name")}
                  value={formik.values.business_name}
                />
                <FormikControl
                  placeholder={"Select a entity type"}
                  required
                  label={"Entity type"}
                  name={"entity_type"}
                  options={entityType}
                  control={InputType.SELECT}
                  disabled={isViewMode}
                  error={formik.errors.entity_type}
                  showError={
                    formik.touched.entity_type && formik.errors.entity_type
                  }
                  value={selectedEntityType}
                  onBlur={formik.handleBlur("entity_type")}
                  renderKey="label"
                  valueKey="value"
                  onChange={(value: any) => {
                    setSelectedEntityType(value);
                    formik.setFieldValue("entity_type", { value: value }); // Update the formik field value
                    formik.setFieldTouched("entity_type", false); // Reset the touched status to hide error
                  }}
                />
                <div className="address-field">
                  <label htmlFor="address">
                    <small>
                      Address<span className="required">*</span>
                    </small>
                  </label>
                  <div className={`google-places-field`}>
                    <GooglePlacesInput
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                      value={formik.values.client_supplier_address}
                      onChange={handlePlacesInputChange}
                      onBlur={formik.handleBlur("client_supplier_address")}
                      disabled={isViewMode}
                    />
                    {formik.touched.client_supplier_address &&
                      formik.errors.client_supplier_address && (
                        <div className={"error_wrap"}>
                          <small className={"invalid "}>
                            <i className="fa-light fa-circle-x" />
                            {formik.errors.client_supplier_address}
                          </small>
                        </div>
                      )}
                  </div>
                </div>
                <div>
                  <label htmlFor="phonenumber">
                    <small>
                      Phone number<span className="required">*</span>
                    </small>
                  </label>
                  <PhoneInputField
                    id="client_phone_no"
                    name="client_phone_no"
                    error={
                      !!(
                        formik.touched.client_phone_no &&
                        formik.errors.client_phone_no
                      )
                    }
                    value={formik.values.client_phone_no}
                    onChange={formik.handleChange("client_phone_no")}
                    onBlur={formik.handleBlur("client_phone_no")}
                    disabled={isViewMode}
                    showErrorIcon={Boolean(
                      formik.touched.client_phone_no &&
                        formik.errors.client_phone_no
                    )}
                  />
                  {formik.touched.client_phone_no &&
                    formik.errors.client_phone_no && (
                      <div className="mb_1">
                        <small className={"invalid"}>
                          <i className="fa-light fa-circle-x" />
                          {formik.errors.client_phone_no}
                        </small>
                      </div>
                    )}
                </div>

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Email address"}
                  required
                  name={"client_email_id"}
                  error={formik.errors.client_email_id}
                  disabled={isViewMode}
                  showError={
                    formik.touched.client_email_id &&
                    formik.errors.client_email_id
                  }
                  onChange={(e: any) =>
                    checkFieldDataExistence(
                      "client_email_id",
                      e?.target?.value,
                      "clientEmailId",
                      "isEmailExist"
                    )
                  }
                  onBlur={formik.handleBlur("client_email_id")}
                  value={formik.values.client_email_id}
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Website (if applicable)"}
                  placeholder="Add website"
                  name={"client_website"}
                  disabled={isViewMode}
                  error={formik.errors.client_website}
                  showError={
                    formik.touched.client_website &&
                    formik.errors.client_website
                  }
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur("client_website")}
                  value={formik.values.client_website}
                />
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"ACN (if applicable)"}
                  name={"acn_number"}
                  disabled={isViewMode}
                  maxLength={9}
                  error={formik.errors.acn_number}
                  showError={
                    formik.touched.acn_number && formik.errors.acn_number
                  }
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur("acn_number")}
                  value={formik.values.acn_number}
                />
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"ABN (if applicable)"}
                  name={"abn_number"}
                  disabled={isViewMode}
                  maxLength={11}
                  error={formik.errors.abn_number}
                  showError={
                    formik.touched.abn_number && formik.errors.abn_number
                  }
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur("abn_number")}
                  value={formik.values.abn_number}
                />

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"TFN (if applicable)"}
                  name={"tfn_number"}
                  disabled={isViewMode}
                  maxLength={9}
                  showError={
                    formik.touched.tfn_number && formik.errors.tfn_number
                  }
                  onChange={(e: any) =>
                    handleNumberFieldChange(e, "tfn_number")
                  }
                  onBlur={formik.handleBlur("tfn_number")}
                  value={formik.values.tfn_number}
                />

                {/* Phase 2 — per-contact Xero GST overrides. Optional;
                    leaving "Use organisation settings" lets the backend
                    fall through to the cached Xero org default and then
                    the company is_gst_registered flag. */}
                <FormikControl
                  control={InputType.SELECT}
                  label={"Xero GST — sales / income (optional)"}
                  name={"xero_sales_gst_setting"}
                  options={xeroGstTypeOptions}
                  disabled={isViewMode}
                  renderKey="label"
                  valueKey="value"
                  value={
                    xeroGstTypeOptions.find(
                      (o) =>
                        o.value === (formik.values.xero_sales_gst_setting ?? ""),
                    ) || xeroGstTypeOptions[0]
                  }
                  onChange={(value: any) =>
                    formik.setFieldValue(
                      "xero_sales_gst_setting",
                      value?.value ?? "",
                    )
                  }
                  onBlur={formik.handleBlur("xero_sales_gst_setting")}
                />
                <FormikControl
                  control={InputType.SELECT}
                  label={"Xero GST — purchases / expenses (optional)"}
                  name={"xero_purchases_gst_setting"}
                  options={xeroGstTypeOptions}
                  disabled={isViewMode}
                  renderKey="label"
                  valueKey="value"
                  value={
                    xeroGstTypeOptions.find(
                      (o) =>
                        o.value ===
                        (formik.values.xero_purchases_gst_setting ?? ""),
                    ) || xeroGstTypeOptions[0]
                  }
                  onChange={(value: any) =>
                    formik.setFieldValue(
                      "xero_purchases_gst_setting",
                      value?.value ?? "",
                    )
                  }
                  onBlur={formik.handleBlur("xero_purchases_gst_setting")}
                />

                {/* Task #41 — Per-supplier default Xero account code used
                    when "variable bill code" mode is on (Xero Settings).
                    Leave blank to fall through to the global Bill code
                    when the org allows fallback. */}
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Default Xero account code (optional)"}
                  placeholder="e.g. 200"
                  name={"xero_default_account_code"}
                  disabled={isViewMode}
                  onChange={(e: any) =>
                    formik.setFieldValue(
                      "xero_default_account_code",
                      (e?.target?.value ?? "").trim(),
                    )
                  }
                  onBlur={formik.handleBlur("xero_default_account_code")}
                  value={formik.values.xero_default_account_code ?? ""}
                />

                {/* Task #41 — Per-project Xero account code overrides.
                    Only shown in edit/view of an existing supplier so we
                    have a real client_supplier_id to write against. */}
                {slugData?.length &&
                  slugData[0]?.toLowerCase() !== ADD &&
                  formik?.values?.client_supplier_type?.value ===
                    "Supplier" && (
                    <div style={{ marginTop: 12 }}>
                      <label>
                        <small>
                          Per-project Xero account code overrides
                        </small>
                      </label>
                      {Array.isArray(projectAccountCodeOverrides) &&
                        projectAccountCodeOverrides
                          .map((row: any, idx: number) => ({ row, idx }))
                          .filter(({ row }) => !row?._deleted)
                          .map(({ row, idx }) => (
                            <div
                              key={`override-${idx}`}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "2fr 1fr auto",
                                gap: 8,
                                alignItems: "center",
                                marginTop: 6,
                              }}
                            >
                              <select
                                disabled={isViewMode}
                                value={row?.project_id ?? ""}
                                onChange={(e) => {
                                  const pid = Number(e.target.value);
                                  const matched = projectOptions.find(
                                    (p: any) =>
                                      Number(p.project_id) === pid,
                                  );
                                  const next = [
                                    ...projectAccountCodeOverrides,
                                  ];
                                  next[idx] = {
                                    ...next[idx],
                                    project_id: pid || null,
                                    project_name:
                                      matched?.project_name ?? "",
                                  };
                                  setProjectAccountCodeOverrides(next);
                                }}
                              >
                                <option value="">Select project…</option>
                                {projectOptions.map((p: any) => (
                                  <option
                                    key={p.project_id}
                                    value={p.project_id}
                                    disabled={projectAccountCodeOverrides.some(
                                      (other: any, oIdx: number) =>
                                        oIdx !== idx &&
                                        !other?._deleted &&
                                        Number(other?.project_id) ===
                                          Number(p.project_id),
                                    )}
                                  >
                                    {p.project_name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Account code"
                                disabled={isViewMode}
                                value={row?.account_code ?? ""}
                                onChange={(e) => {
                                  const next = [
                                    ...projectAccountCodeOverrides,
                                  ];
                                  next[idx] = {
                                    ...next[idx],
                                    account_code: (
                                      e.target.value ?? ""
                                    ).trim(),
                                  };
                                  setProjectAccountCodeOverrides(next);
                                }}
                              />
                              {!isViewMode && (
                                <button
                                  type="button"
                                  className="outline contrast"
                                  onClick={() => {
                                    const next = [
                                      ...projectAccountCodeOverrides,
                                    ];
                                    if (next[idx]?.id) {
                                      // Existing row: mark deleted so we
                                      // know to send an explicit "clear"
                                      // mutation on save.
                                      next[idx] = {
                                        ...next[idx],
                                        _deleted: true,
                                      };
                                    } else {
                                      next.splice(idx, 1);
                                    }
                                    setProjectAccountCodeOverrides(next);
                                  }}
                                  aria-label="Remove override"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                      {!isViewMode && (
                        <button
                          type="button"
                          className="outline secondary"
                          style={{ marginTop: 8 }}
                          onClick={() =>
                            setProjectAccountCodeOverrides([
                              ...(projectAccountCodeOverrides || []),
                              {
                                project_id: null,
                                project_name: "",
                                account_code: "",
                              },
                            ])
                          }
                        >
                          + Add project override
                        </button>
                      )}
                    </div>
                  )}

                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"QBCC no"}
                  type={"text"}
                  disabled={isViewMode}
                  name={"qbcc_number"}
                  maxLength={8}
                  error={formik.errors.qbcc_number}
                  showError={
                    formik.touched.qbcc_number && formik.errors.qbcc_number
                  }
                  onChange={(e: any) =>
                    handleQbccChange(
                      "qbcc_number",
                      e?.target?.value,
                      "qbccNumber",
                      "isQbccExist"
                    )
                  }
                  onBlur={formik.handleBlur("qbcc_number")}
                  value={formik.values.qbcc_number}
                />

                <label>
                  <small>Account details</small>
                </label>

                <button
                  className="secondary"
                  onClick={() => onClickOfPaymentDetails()}
                >
                  {accountDetailsGridData?.length === 0 &&
                  companyDetails?.addTrustRecord?.length === 0
                    ? "Add payment details"
                    : `Payment details added`}
                </button>
                <br />
                <br />
                <FormikControl
                  placeholder={"Select status"}
                  required
                  label={"Select status"}
                  name={"client_supplier_status"}
                  options={statusTypeOptions}
                  control={InputType.SELECT}
                  error={formik.errors.client_supplier_status}
                  showError={
                    formik.touched.client_supplier_status &&
                    formik.errors.client_supplier_status
                  }
                  value={selectedStatusType}
                  onBlur={formik.handleBlur("client_supplier_status")}
                  renderKey="label"
                  valueKey="value"
                  disabled={
                    isViewMode ||
                    patchData?.client_supplier_status?.value ===
                      statusTypeOptions[1].value
                  }
                  isRequired={
                    !!(
                      formik?.errors?.client_supplier_status &&
                      formik.touched.client_supplier_status
                    )
                  }
                  onChange={(value: any) => {
                    setSelectedStatusType(value);
                    formik.setFieldValue("client_supplier_status", {
                      value: value,
                    }); // Update the formik field value
                    formik.setFieldTouched("client_supplier_status", false); // Reset the touched status to hide error
                  }}
                />
                <br />
                <br />
                <div className="grid">
                  <input
                    type="button"
                    value={isViewMode ? "Close" : "Cancel"}
                    className="outline contrast"
                    onClick={handleCancel}
                  />
                  {!isViewMode ? (
                    <input
                      type="submit"
                      value="Save"
                      className="secondary"
                      onClick={() => formik?.handleSubmit()}
                    />
                  ) : screenTabType !== "archived" ? (
                    <input
                      type="button"
                      value="Edit"
                      className="secondary"
                      onClick={() => navigateToEdit()}
                    />
                  ) : null}
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

      {displayTrainingRecords && <TrustRecordForms />}
      {displayAccountRecordsGrid && <TrustRecordGrid />}
      {displayClosePageConfirmation && (
        <BaseModal
          modalId={"Payment confirmation"}
          displayModal={displayClosePageConfirmation}
          onClose={handlePageConfirmClose}
          onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
          onConfirm={handlePageConfirmSave}
          firstButtonName="Yes"
          secondButtonName="Save"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center"> Are you sure to close and not save?</h4>
        </BaseModal>
      )}
      {displayStatusInfo && (
        <BaseModal
          modalId={"Status Confirmation"}
          displayModal={displayStatusInfo}
          onClose={() => setDisplayStatusInfo(false)}
          onConfirm={() => {
            handleFormSubmit(true);
            setDisplayStatusInfo(false);
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Proceed"
        >
          <h4>
            {" "}
            This will save as draft. You won't be able to use this account in
            the system until marked as completed.
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
