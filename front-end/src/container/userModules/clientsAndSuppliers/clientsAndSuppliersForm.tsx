//default imports
"use client";
import React, { Fragment, useEffect, useRef, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
//import from reactstrap components and icons
import {
  CaretRightFill,
  ExclamationTriangleFill,
  PersonBoundingBox,
} from "react-bootstrap-icons";
import { Button, Container, Form } from "react-bootstrap";
//import from customized components
import { AppModal } from "@/components/model/model";
import {
  ADD,
  ALPHANUMERIC,
  DEBOUNCE_TIMER,
  EDIT,
  NUMBER_REGEX,
  VIEW,
} from "@/common/constants/general";
import TextField from "@/components/TextField/textField";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import GooglePlacesInput from "@/components/googlePlacesApi/googlePlacesAutocomplete";
import PhoneInputField from "@/components/phoneNumberInput/phoneNumberInput";
import FormButton from "@/components/Button/button";
//import customized styles
import commonStyles from "../../../common/commonStyles.module.scss";
import customStyles from "./clientsAndSuppliers.module.scss";
//import from external libraries
import moment from "moment";
import { useFormik } from "formik";
import { toast } from "react-toastify";
//import from constants, interfaces ,functions and services
import { ApplicationURLS } from "@/common/applicationURLS";
import {
  clientSupplierStatus,
  clientAndSupplierOptions,
  entityTypeOptions,
  relatedEntityOptions,
} from "./clientSuppliers.constant";
import {
  updateClientSuppliersById,
  fetchClientSuppliersById,
  postAddClientSuppliersFormData,
  verifyClientSuppliersExistence,
} from "./clientSuppliers.functions";
import {
  findSelectedOptions,
  upperCaseFirstLetter,
} from "@/common/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  setAccountDetailsData,
  setClientsSuppliersData,
} from "@/redux/slices/clientSuppliersDetails";
import { addClientSuppliersSchema } from "./clientsSuppliers.validations";
import { useLoaderContext } from "@/context/useLoader";
import { useCustomDebounce } from "@/common/commonHooks";
//module level constants and interfaces

export default function ClientsAndSuppliersForm() {
  //Other Hooks
  const router = useRouter();
  const dispatch = useAppDispatch();
  const routePath = usePathname();

  const { setLoader }: any = useLoaderContext();

  const clientSupplierFormData: any = useAppSelector(
    (state: any) => state?.clientsSuppliers?.clientsSuppliersData
  );

  const accountDetailsFormData: any = useAppSelector(
    (state: any) => state?.clientsSuppliers?.accountDetailsData
  );
  console.log(
    "🚀 ~ ClientsAndSuppliersForm ~ accountDetailsFormData:",
    accountDetailsFormData
  );

  const deletedAccountDetailsId: any = useAppSelector(
    (state: any) => state?.clientsSuppliers?.deletedAccountDetails
  );

  const params: any = useParams();
  const queryParams = useSearchParams();
  const overviewId = queryParams.get("overview");
  const overviewTab = queryParams.get("from");
  const screenTabType = queryParams.get("tab");

  const { id: slugData } = params;

  //useState and useEffect Management
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER); // Debounce delay of 700ms
  const [patchData, setPatchData] = useState<any>(null);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const postType = useRef("");
  const errorFieldName = useRef("");
  const [initialRender, setInitialRender] = useState(true);

  const [isViewMode, setIsViewMode] = useState(false);
  console.log("🚀 ~ ClientsAndSuppliersForm ~ isViewMode:", isViewMode);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);

  /**
   * Handles side effects based on changes in `slugData`.
   */
  useEffect(() => {
    // Set initial values based on slug data
    if (slugData[0] === ADD) {
      formik.setFieldValue("client_supplier_status", clientSupplierStatus[0]);
      formik.setFieldValue(
        "related_entity",
        clientSupplierFormData?.related_entity || relatedEntityOptions[0]
      );
    }

    // Set view mode based on slug data
    setIsViewMode(slugData[0] === VIEW);

    // Fetch client suppliers on view or edit mode
    (slugData[0] === VIEW || slugData[0].toLowerCase() === EDIT) &&
      getClientSuppliers();
  }, []);

  useEffect(() => {
    const type = queryParams.get("type");
    if (type) {
      dispatch(setClientsSuppliersData(""));
      dispatch(setAccountDetailsData(""));
      patchClientsSuppliersField(type);
    }
  }, [queryParams.get("type")]);

  useEffect(() => {
    // Call patchFormData function whenever the patchData state set value on edit and view mode
    // This ensures the form data is patched only when formData is available
    patchFormData();
  }, [patchData]);

  useEffect(() => {
    async function afterDebounce() {
      if (debouncedSearchTerm) {
        // Fetch data or perform some action with the debounced search term
        // Construct POST data object
        const postData = {
          companyId: Number(localStorage.getItem("companyId")),
          [postType.current]: searchTerm.trim(),
        };

        // Check data existence using verifyClientSuppliersExistence
        const response = await verifyClientSuppliersExistence(postData);

        // Update error field based on existence check results
        if (response?.length > 0) {
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
  }, [debouncedSearchTerm]);

  //Formik Handling

  const formik: any = useFormik({
    initialValues: {
      client_supplier_id: clientSupplierFormData?.client_supplier_id,
      isNameExist: clientSupplierFormData?.isNameExist || false,
      client_supplier_name: clientSupplierFormData?.client_supplier_name ?? "",
      client_supplier_type:
        clientSupplierFormData?.client_supplier_type ?? null,
      related_entity: clientSupplierFormData?.related_entity ?? null,
      business_name: clientSupplierFormData?.business_name ?? "",
      entity_type: clientSupplierFormData?.entity_type ?? null,
      client_supplier_address:
        clientSupplierFormData?.client_supplier_address ?? "",
      latitude: clientSupplierFormData?.latitude,
      longitude: clientSupplierFormData?.longitude,
      place_id: clientSupplierFormData?.place_id,
      region: clientSupplierFormData?.region,
      country: clientSupplierFormData?.country,
      client_phone_no: clientSupplierFormData?.client_phone_no ?? "",
      isEmailExist: clientSupplierFormData?.isEmailExist || false,
      client_email_id: clientSupplierFormData?.client_email_id ?? "",
      client_website: clientSupplierFormData?.client_website ?? "",
      acn_number: clientSupplierFormData?.acn_number ?? "",
      abn_number: clientSupplierFormData?.abn_number ?? "",
      tfn_number: clientSupplierFormData?.tfn_number ?? "",
      isQbccExist: clientSupplierFormData?.isQbccExist || false,
      qbcc_number: clientSupplierFormData?.qbcc_number ?? "",
      account_details: accountDetailsFormData ?? "",
      client_supplier_status:
        clientSupplierFormData?.client_supplier_status ?? null,
    },
    validationSchema: addClientSuppliersSchema,
    onSubmit: () => handleSubmit(),
  });

  //Functions

  /**
   * Updates the form data with provided patch data, if available.
   */
  async function patchFormData() {
    if (patchData) {
      // Update form fields with patch data
      await formik.setValues({
        ...patchData,
        account_details:
          accountDetailsFormData?.length || accountDetailsFormData === null
            ? accountDetailsFormData
            : patchData?.account_details,
      });
      // Update time key (it's for tracking form updates)
      setTimeKey(new Date().getTime());
    }
  }

  /**
   * Handles updates to the address field and related form fields based on provided place details.
   */
  async function handleAddressChange(value: string, placeDetails: any) {
    // Create a copy of place details to avoid unintended modifications
    const placeDetailsString = JSON.parse(JSON.stringify(placeDetails));

    // Update individual form fields asynchronously
    await formik.setFieldValue("client_supplier_address", value);
    await formik.setFieldValue("country", placeDetailsString.country);
    await formik.setFieldValue("latitude", String(placeDetailsString.latitude));
    await formik.setFieldValue(
      "longitude",
      String(placeDetailsString.longitude)
    );
    await formik.setFieldValue("place_id", placeDetailsString.place_id);
    await formik.setFieldValue("region", placeDetailsString.region);
  }
  console.log("🚀 ~ handleAddressChange ~ formik:", formik?.values);

  /**
   * Handles form submission for account details and navigates to the account details page.
   */
  function handleAccountDetails() {
    // Dispatch action to update client/supplier data
    dispatch(setClientsSuppliersData(formik?.values));

    // Construct the dynamic route based on slug data
    const dynamicRoute = slugData[1]
      ? `${ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS_ACCOUNT_DETAILS}/${slugData[0]}/${slugData[1]}`
      : `${ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS_ACCOUNT_DETAILS}/${slugData[0]}`;

    // Navigate to the account details page
    router.push(`${dynamicRoute}?tab=${screenTabType ?? ""}`);
  }

  /**
   * Handles user cancellation action, displaying a toast message and triggering unsaved changes handling.
   */
  function handleCancel() {
    // Display toast notification for cancellation
    if (!isViewMode) {
      toast.info(
        `This clients and suppliers record has not been ${
          slugData[0] === "add" ? "added" : "updated"
        }.`
      );
    }

    // Handle unsaved changes
    handleUnsavedChanges();
  }

  /**
   * Handles discarding unsaved client/supplier data and navigates back to the main clients and suppliers page.
   */
  function handleUnsavedChanges() {
    // Clear client/supplier and account details data
    dispatch(setClientsSuppliersData(""));
    dispatch(setAccountDetailsData(""));

    routeBack();
  }

  /**
   * Checks for the existence of data associated with a specific field and updates the form state accordingly.
   *
   * @param fieldName {string} - The name of the form field to check.
   * @param enteredValue {string} - The value entered in the form field.
   * @param postType {string} - The property name within the POST data object corresponding to the field.
   * @param errorFieldName {string} - The name of the form field for displaying the existence error.
   * @returns - A promise that resolves when the field check is complete, or undefined if Formik is not available.
   */
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

  /**
   * Handles name input changes, performing basic validation and triggering existence checks.
   *
   * @param fieldName {string} - Name of the form field for the name.
   * @param enteredValue {string} - The value entered in the field by the user.
   * @param postType {string} -  The property name within the POST data object corresponding to the field.
   * @param errorFieldName {string} - Name of the form field to control error display.
   */
  function handleNameChange(
    fieldName: string,
    enteredValue: string,
    postType: string,
    errorFieldName: string
  ) {
    // if validation for alphanumeric characters and length limit satisfies, it'll check for name existence
    // (ALPHANUMERIC_WITH_FRENCH_CHARACTERS.test(enteredValue) ||
    //   !enteredValue) &&
    if (enteredValue?.length <= 150) {
      checkFieldDataExistence(
        fieldName,
        enteredValue,
        postType,
        errorFieldName
      );
    }
  }

  /**
   * Handles the form submission for adding or updating client/supplier details.
   * This function prepares the form data and sends a request to the backend API accordingly.
   * It handles both the addition of new client/supplier details and the update of existing ones.
   */
  async function handleSubmit() {
    try {
      setLoader(true);
      // Extract necessary values from the formik values
      const {
        isEmailExist,
        isQbccExist,
        isNameExist,
        __typename,
        client_supplier_id,
        ...formValues
      } = formik.values;

      let modifiedAccountDetails = [];

      // Modify account details based on the form submission mode (add or update)
      if (accountDetailsFormData?.length > 0) {
        modifiedAccountDetails = accountDetailsFormData.map((data: any) => {
          if (slugData[0] === ADD) {
            const { addMode, ...restAccountDetails } = data;
            return {
              ...restAccountDetails,
              id: null,
            };
          } else {
            const { __typename, addMode, ...restAccountDetails } = data;
            return {
              ...restAccountDetails,
              client_supplier_id: formik?.values?.client_supplier_id,
              id: addMode ? null : restAccountDetails?.id,
            };
          }
        });
      }

      // Prepare data for adding a new client/supplier
      const addPostData = {
        createClientSuppliersDetailInput: {
          business_name: formValues?.business_name,
          client_email_id: formValues?.client_email_id,
          client_phone_no: formValues?.client_phone_no,
          client_supplier_address: formValues?.client_supplier_address,
          client_supplier_name: formValues?.client_supplier_name,
          client_website: formValues?.client_website,
          country: formValues?.country,
          latitude: formValues?.latitude,
          longitude: formValues?.longitude,
          place_id: formValues?.place_id,
          qbcc_number: formValues?.qbcc_number,
          region: formValues?.region,
          company_id: Number(localStorage.getItem("companyId")),
          client_supplier_status: formValues?.client_supplier_status?.value,
          client_supplier_type: formValues?.client_supplier_type?.value,
          entity_type: formValues?.entity_type?.value,
          related_entity: formValues?.related_entity?.value,
          abn_number: formValues?.abn_number.toString(),
          acn_number: formValues?.acn_number.toString(),
          tfn_number: formValues?.tfn_number.toString(),
          account_details: modifiedAccountDetails ?? [],
        },
      };

      // Prepare data for updating an existing client/supplier
      const updatePostData = {
        updateClientSuppliersDetailInput: {
          ...addPostData?.createClientSuppliersDetailInput,
          id: formValues?.id,
          // client_supplier_id: client_supplier_id,
          removed_account_ids: deletedAccountDetailsId ?? [],
        },
      };

      // Determine the API function based on the submission mode (add or update)
      const api =
        slugData[0] === "add"
          ? postAddClientSuppliersFormData(addPostData)
          : updateClientSuppliersById(updatePostData);
      // Send request to the backend API

      const clientsResponse: any = await api;

      // Check if the request was successful
      if (clientsResponse?.status) {
        // Display success message and reset form on successful submission
        toast.success(clientsResponse?.message);
        dispatch(setClientsSuppliersData(""));
        dispatch(setAccountDetailsData(""));
        formik.resetForm();

        routeBack();
        setLoader(false);
      } else {
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  /**
   * Retrieves client/supplier details by ID from the backend API and updates the state with the fetched data.
   * This function sends a request to fetch client/supplier details based on the ID provided in the slugData.
   * Once the data is fetched, it updates the state variables with the retrieved information.
   */
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
          client_supplier_type: findSelectedOptions(
            clientAndSupplierOptions,
            response?.client_supplier_type
          ),
          related_entity: findSelectedOptions(
            relatedEntityOptions,
            response?.related_entity
          ),
          entity_type: findSelectedOptions(
            entityTypeOptions,
            response?.entity_type
          ),
          client_supplier_status: findSelectedOptions(
            clientSupplierStatus,
            response?.client_supplier_status
          ),
        };

        // Update state with the fetched client/supplier data
        setPatchData(clientsSuppliersFormData);
        dispatch(setClientsSuppliersData(clientsSuppliersFormData));
        // Update state with the fetched account details data, if available
        dispatch(
          setAccountDetailsData(
            accountDetailsFormData?.length || accountDetailsFormData === null
              ? accountDetailsFormData
              : response?.account_details
          )
        );
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  /**
   * Handles changes in the business name input field.
   * This function checks if the input value matches the alphanumeric pattern,
   * and if its length does not exceed 150 characters. If the conditions are met,
   * it updates the formik field "business_name" with the new value.
   *
   * @param value - The new value entered in the business name input field.
   */
  function handleBusinessNameChange(value: any) {
    if ((ALPHANUMERIC.test(value) || !value) && value?.length <= 150) {
      formik.setFieldValue("business_name", value);
    }
  }

  /**
   * Handles changes in the QBCC input field.
   * This function checks if the entered value matches the alphanumeric pattern,
   * or if it's empty. If the condition is met, it checks the existence of field data
   * using the provided parameters and initiates the relevant action.
   *
   * @param fieldName - The name of the field being checked.
   * @param enteredValue - The value entered in the QBCC input field.
   * @param postType -  The property name within the POST data object corresponding to the field.
   * @param errorFieldName - The name of the field to update in case of an error.
   */
  function handleQbccChange(
    fieldName: string,
    enteredValue: string,
    postType: string,
    errorFieldName: string
  ) {
    // Validate the entered value against an alphanumeric pattern or check if it's empty
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

  async function patchClientsSuppliersField(clientSupplierType: string) {
    if (clientSupplierType) {
      await formik.setFieldValue(
        "client_supplier_type",
        clientSupplierType === "clients"
          ? clientAndSupplierOptions[0]
          : clientAndSupplierOptions[1]
      );
    }
  }

  function routeBack() {
    if (overviewTab && overviewId) {
      router.push(
        `${ApplicationURLS.USER_PROJECT_OVERVIEW}/${overviewId}?from=${overviewTab}`
      );
    } else {
      router.push(ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS);
    }
  }

  function navigateToEdit() {
    router.push(
      `${ApplicationURLS.USER_EDIT_CLIENTS_AND_SUPPLIERS}/${patchData?.id}`
    );
  }

  //Render Template
  return (
    <Fragment>
      <div className={customStyles?.breadcrumb}>
        <ReusableBreadcrumb
          items={[
            {
              href: ApplicationURLS.USER_DASHBOARD,
              label: "Home",
              active: routePath === ApplicationURLS.USER_DASHBOARD,
            },
            {
              href: ApplicationURLS.USER_CLIENTS_AND_SUPPLIERS,
              label: "Clients & Suppliers",
            },
            {
              href: "",
              label: `${upperCaseFirstLetter(slugData[0])} Clients/Suppliers`,
              active: true,
            },
          ]}
          separator={<span className={customStyles.separatorStyle}>&gt;</span>}
        />
      </div>
      <Container fluid>
        <Form className={customStyles.card} onSubmit={formik.handleSubmit}>
          <PersonBoundingBox className={customStyles?.profileIcon} />
          <div className="mb-5">
            <h5
              className={customStyles.title}
            >{`${slugData[0]} Clients/Suppliers`}</h5>
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add business/sole trader/personal name"
              type="text"
              errorText={formik.errors.client_supplier_name}
              isInvalid={
                !!(
                  formik.touched.client_supplier_name &&
                  formik.errors.client_supplier_name
                )
              }
              labelText="Name *"
              name="client_supplier_name"
              value={formik.values.client_supplier_name}
              onChange={(e: any) =>
                handleNameChange(
                  "client_supplier_name",
                  e?.target?.value,
                  "clientSupplierName",
                  "isNameExist"
                )
              }
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
            {slugData[0] !== ADD && (
              <div className="mt-2">
                <div className={customStyles.cardFieldSubText}>
                  {`Client/Supplier id - ${
                    formik?.values?.client_supplier_id ?? ""
                  }`}
                </div>
                {patchData?.created_on && (
                  <div className={customStyles.cardFieldSubText}>
                    {` Date - ${moment(patchData?.created_on).format(
                      "DD/MM/YYYY"
                    )}`}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={customStyles.textFieldStyles}>
            <SearchableSelect
              options={clientAndSupplierOptions}
              selectedData={formik.values.client_supplier_type}
              onChange={(selectedOption) => {
                formik.setFieldValue("client_supplier_type", selectedOption);
              }}
              placeholder="Select client or supplier"
              label="Client/Supplier *"
              disabled={isViewMode}
              isRequired={
                !!(
                  formik?.errors?.client_supplier_type &&
                  formik.touched.client_supplier_type
                )
              }
              errorMessage={formik?.errors?.client_supplier_type}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <SearchableSelect
              options={relatedEntityOptions}
              selectedData={formik.values.related_entity}
              onChange={(selectedOption) => {
                formik.setFieldValue("related_entity", selectedOption);
              }}
              placeholder="Select related entity"
              label="Related entity *"
              disabled={isViewMode}
              isRequired={
                !!(
                  formik?.errors?.related_entity &&
                  formik.touched.related_entity
                )
              }
              errorMessage={formik?.errors?.related_entity}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add business name"
              type="text"
              errorText={formik.errors.business_name}
              isInvalid={
                !!(formik.touched.business_name && formik.errors.business_name)
              }
              labelText="Business name (if applicable)"
              name="business_name"
              value={formik.values.business_name}
              onChange={(e: any) => handleBusinessNameChange(e?.target?.value)}
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <SearchableSelect
              options={entityTypeOptions}
              selectedData={formik.values.entity_type}
              onChange={(selectedOption) => {
                formik.setFieldValue("entity_type", selectedOption);
              }}
              placeholder="Select trading type"
              controlStyles={customStyles}
              label="Entity type *"
              disabled={isViewMode}
              isRequired={
                !!(formik?.errors?.entity_type && formik.touched.entity_type)
              }
              errorMessage={formik?.errors?.entity_type}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <div className={customStyles.googlFiledStyles}>
              <label>Address *</label>
              <GooglePlacesInput
                key={timeKey}
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                isInvalid={
                  !!(
                    formik.touched.client_supplier_address &&
                    formik.errors.client_supplier_address
                  )
                }
                value={formik.values.client_supplier_address}
                onChange={handleAddressChange}
                onBlur={formik.handleBlur("client_supplier_address")}
                disabled={isViewMode}
              />
              {formik.touched.client_supplier_address &&
                formik.errors.client_supplier_address && (
                  <div className={customStyles.errorContainer}>
                    <ExclamationTriangleFill className={customStyles.error} />
                    <span className={customStyles.errorTextStyles}>
                      {formik.errors.client_supplier_address}
                    </span>
                  </div>
                )}
            </div>
          </div>

          <div className={customStyles.textFieldStyles}>
            <div className={customStyles.phoneNumberStyles}>
              <label className={customStyles.labelStyle} id="phone_number">
                Phone Number *
              </label>

              <PhoneInputField
                id="phone_number"
                name="phone_number"
                error={
                  !!(
                    formik.touched.client_phone_no &&
                    formik.errors.client_phone_no
                  )
                }
                value={formik.values.client_phone_no}
                onChange={formik.handleChange("client_phone_no")}
                onBlur={formik.handleBlur("client_phone_no")}
                showErrorIcon={Boolean(
                  formik.touched.client_phone_no &&
                    formik.errors.client_phone_no
                )}
                disabled={isViewMode}
              />
              {formik.touched.client_phone_no &&
                formik.errors.client_phone_no && (
                  <div className={customStyles.errorContainer}>
                    <ExclamationTriangleFill className={customStyles.error} />
                    <span className={customStyles.errorTextStyles}>
                      {formik.errors.client_phone_no}
                    </span>
                  </div>
                )}
            </div>
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add email address"
              type="text"
              errorText={formik.errors.client_email_id}
              isInvalid={
                !!(
                  formik.touched.client_email_id &&
                  formik.errors.client_email_id
                )
              }
              labelText="Email address *"
              name="client_email_id"
              value={formik.values.client_email_id}
              onChange={(e: any) =>
                checkFieldDataExistence(
                  "client_email_id",
                  e?.target?.value,
                  "clientEmailId",
                  "isEmailExist"
                )
              }
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add website"
              type="text"
              errorText={formik.errors.client_website}
              isInvalid={
                !!(
                  formik.touched.client_website && formik.errors.client_website
                )
              }
              labelText="Website (if applicable)"
              name="client_website"
              value={formik.values.client_website}
              onChange={formik.handleChange}
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add ACN"
              type="text"
              errorText={formik.errors.acn_number}
              isInvalid={
                !!(formik.touched.acn_number && formik.errors.acn_number)
              }
              maxLength={9}
              labelText="ACN (if applicable)"
              name="acn_number"
              value={formik.values.acn_number}
              onChange={formik.handleChange}
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add ABN"
              type="text"
              errorText={formik.errors.abn_number}
              isInvalid={
                !!(formik.touched.abn_number && formik.errors.abn_number)
              }
              labelText="ABN (if applicable)"
              name="abn_number"
              maxLength={11}
              value={formik.values.abn_number}
              onChange={formik.handleChange}
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add TFN"
              type="text"
              errorText={formik.errors.tfn_number}
              isInvalid={
                !!(formik.touched.tfn_number && formik.errors.tfn_number)
              }
              labelText="TFN (if applicable)"
              name="tfn_number"
              maxLength={9}
              value={formik.values.tfn_number}
              onChange={formik.handleChange}
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Add QBCC number"
              type="text"
              inputMode="numeric"
              errorText={formik.errors.qbcc_number}
              isInvalid={
                !!(formik.touched.qbcc_number && formik.errors.qbcc_number)
              }
              labelText="QBCC No"
              maxLength={8}
              name="qbcc_number"
              value={formik.values.qbcc_number}
              onChange={(e: any) =>
                handleQbccChange(
                  "qbcc_number",
                  e?.target?.value,
                  "qbccNumber",
                  "isQbccExist"
                )
              }
              disabled={isViewMode}
              classNames={commonStyles.inputFieldControl}
            />
          </div>

          <div
            className={`${customStyles.textFieldStyles} ${customStyles?.cursorPointer}`}
            onClick={() => {
              isViewMode &&
              !formik?.values?.account_details?.length &&
              !accountDetailsFormData?.length
                ? {}
                : handleAccountDetails();
            }}
          >
            <TextField
              placeholder={
                formik?.values?.account_details?.length ||
                accountDetailsFormData?.length
                  ? "Payment details added"
                  : "Add payment details"
              }
              type="text"
              errorText={formik.errors.account_details}
              isInvalid={
                !!(
                  formik.touched.account_details &&
                  formik.errors.account_details
                )
              }
              labelText="Account details"
              name="account_details"
              classNames={`${commonStyles.inputFieldControl} ${customStyles.disabledTextField}`}
              endingData={
                <CaretRightFill className={customStyles.disabledFieldIcon} />
              }
              disabled={
                isViewMode &&
                !formik?.values?.account_details?.length &&
                !accountDetailsFormData?.length
              }
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>

          <div className={customStyles.textFieldStyles}>
            <SearchableSelect
              options={clientSupplierStatus}
              selectedData={formik.values.client_supplier_status}
              onChange={(selectedOption) => {
                formik.setFieldValue("client_supplier_status", selectedOption);
              }}
              placeholder="Select status"
              controlStyles={customStyles}
              label="Status *"
              disabled={
                isViewMode ||
                patchData?.client_supplier_status?.value ===
                  clientSupplierStatus[1].value
              }
              isRequired={
                !!(
                  formik?.errors?.client_supplier_status &&
                  formik.touched.client_supplier_status
                )
              }
              errorMessage={formik?.errors?.client_supplier_status}
            />
          </div>

          {!isViewMode ? (
            <FormButton className={customStyles.submitButton} type="submit">
              Save
            </FormButton>
          ) : screenTabType !== "archived" ? (
            <FormButton
              className={customStyles.submitButton}
              type="button"
              onClick={() => navigateToEdit()}
            >
              Edit
            </FormButton>
          ) : (
            ""
          )}
          <Button
            className={customStyles.cancelButton}
            type="button"
            onClick={() => handleCancel()}
          >
            {isViewMode ? "Close" : "Cancel"}
          </Button>
        </Form>
      </Container>
      <AppModal
        show={displayConfirmationModal}
        onHide={() => setDisplayConfirmationModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalBodyContent="You have unsaved changes in the screen. Do you want to continue?"
        onConfirm={handleUnsavedChanges}
      />
    </Fragment>
  );
}
