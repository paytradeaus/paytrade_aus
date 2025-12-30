"use client";
import React, { useEffect, useState } from "react";
import { usePaymentsContext } from "./PaymentContextProvider";
import {
  buttonType,
  DateFormat,
  InputType,
  OVERVIEW_TABS,
  VIEW,
  VIEW_ARCHIVE,
} from "@/shared/constant/general";
import { useRouter, useSearchParams } from "next/navigation";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";
import { deletePayment } from "./Payment.functions";
import { isEqual } from "lodash";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { deleteCookie, getCookie } from "cookies-next";
import { useAppDispatch } from "@/redux/store";
import {
  setPaymentAttachments,
  setPayments,
} from "@/redux/slices/subscribeRouteBackDetails";
import { useTokenDetails } from "@/hooks";
import FormikControl from "@/components/FormikControl";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import {
  formatDate,
  getCompanyIdFromStorage,
  getSubscriptionType,
  replaceDollarSymbol,
} from "@/utils";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  getSubscriptionDetailsByCompanyId,
  updateDelegatePowers,
} from "../Subscriptions/subscriptions.function";
import {
  FetchAllBankAccounts,
  SendMailForNotices,
  SendQbccMailForNotices,
} from "../AddUpdateBankAccount/AddUpdateBankAccount.function";

export default function PaymentFooterSection() {
  const {
    patchData,
    overViewTab,
    isEditable,
    screenMode,
    isViewMode,
    formik,
    setLoader,
    disableSaveButton,
    resetRetainedPaymentsData,
    navigateTo,
    overViewId,
    initialPatchedValues,
    previousPage,
    setSubscriptionPlanName,
    setDisplayPopup,
    displayPopup,
    loader,
    overViewPage,
    overviewProjectId,
    overviewType,
    displaySubscriptionModal,
    setDisplaySubscriptionModal,
    optionalFiles,
    compulsoryFiles,
    handleRoute,
    IsActivity,
    showNoticePopup,
    setShowNoticePopup,
    noticeFiles,
    setNoticeFiles,
    noticeMailUuids,
    setNoticeMailUuids,
    timeLeft,
    setTimeLeft,
    setLoaderInfo,
    qbccNoticeFiles,
    setQbccNoticeFiles,
    qbccNoticeUuids,
    setQbccNoticeUuids,
    delegateAuthorityAllowed,
    setDelegateAuthorityAllowed,
    noticesAutomated,
    setNoticesAutomated,
  }: any = usePaymentsContext();

  const router = useRouter();
  const queryParams = useSearchParams();
  const ImportScreen: any = queryParams.get("screen");
  const dispatch = useAppDispatch();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [displayDeleteModal, setDisplayDeleteModal] = useState(false);
  const [displayDatePopup, setDisplayDatePopup] = useState(false); // State to control the popup
  const [delegatePlanName, setDelegatePlanName] = useState<string>(""); // Example state, set accordingly

  const [datePopupAcknowledged, setDatePopupAcknowledged] = useState(false);

  const [tempselectedDate, setTempSelectedDate] = useState<any>();

  const [selectedDate, setSelectedDate] = useState<any>();

  const [displayOnCancel, setDisplayOnCancel] = useState(false);
  const { decodeTokenData } = useTokenDetails();
  const [bankAccountsOptions, setBankAccountsOptions] = useState<
    { label: string; value: number }[]
  >([]);

  const companyId: any =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("companyId"))
      : null;
  const [displayDelegationModel, setDisplayDelegationModel] = useState(false);
  const [multiSelectedData, setMultiSelectedData] = useState<
    { label: string; value: number }[]
  >([]);

  const [isAllSelected, setIsAllSelected] = useState(false);
  const displayedOptions = isAllSelected
    ? [{ label: "All", value: -1 }]
    : multiSelectedData;

  useEffect(() => {
    //update current subscription plan type to trigger notices on submit
    setSubscriptionPlanName(
      getSubscriptionType(decodeTokenData, selectedCompanyId)
    ); // Assuming setPlanName exists to store the plan name
  }, []);

  useEffect(() => {
    if (delegatePlanName !== "" && delegatePlanName !== "Basic") {
      getFetchBankAccountsLists();
    }
  }, [
    delegatePlanName,
    formik?.values?.payment_to_account,
    formik?.values?.payment_from_account,
  ]);

  useEffect(() => {
    // Check if decodeTokenData and companyId are available
    if (decodeTokenData && companyId) {
      // Filter to get the relevant company-specific role based on companyId
      const newData = decodeTokenData?.companySpecificRoles?.filter(
        (x: { companyId: number }) => String(x.companyId) === String(companyId)
      );

      // Check if the company role exists and contains subscription data
      const subscription = newData?.length > 0 ? newData[0].subscription : null;

      // Set the plan name from the subscription or default to "No plan"
      const planName = subscription?.plan_name;

      setDelegatePlanName(planName);
    }
  }, [companyId]);

  // 1️⃣ Fetch subscription on component mount or when needed
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        // setLoaderInfo("checking subscription details...");
        setLoader(true);
        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        const delegateItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Delegate authority"
          ) || null;

        const isAllowed =
          delegateItem &&
          String(delegateItem.limit_value).toLowerCase() === "true";
        setDelegateAuthorityAllowed(!!isAllowed);

        // ✅ Find "Notices"
        const noticesItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Notices"
          ) || null;

        const isNoticesAutomated =
          noticesItem &&
          String(noticesItem.limit_value).toLowerCase() === "automated";
        setNoticesAutomated(!!isNoticesAutomated);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setDelegateAuthorityAllowed(false); // fail-safe
      } finally {
        setLoader(false);
        setLoaderInfo("");
      }
    };

    fetchSubscription();
  }, []);

  function onSubmit() {
    if (
      bankAccountsOptions?.length > 0 &&
      Object.keys(formik?.errors ? formik?.errors : {}).length === 0 &&
      delegateAuthorityAllowed
    )
      setDisplayDelegationModel(true); // ✅ Allowed → open delegation modal
    else {
      formik.handleSubmit();
    }
  }

  async function getFetchBankAccountsLists() {
    const postData = {
      account_type: "Retention Trust Account, Project Trust Account",
      company_id: getCompanyIdFromStorage(),
      items_per_page: null,
      page: null,
      search: null,
      status: null,
      sorting_field: "",
      sorting_order: "",
      delegate_powers: "No",
    };

    const response = await FetchAllBankAccounts(postData);

    if (response?.extendedBankAccounts?.length > 0) {
      // Determine which bank accounts to consider based on claim_type
      let bankAccountIds: string[] = [];

      if (formik?.values?.claim_type === "Receivable") {
        bankAccountIds = [formik?.values?.payment_to_account];
      } else if (formik?.values?.claim_type === "Billable") {
        bankAccountIds = [
          formik?.values?.payment_to_account,
          formik?.values?.payment_from_account,
        ];
      }

      // Remove null/undefined values
      const validBankAccountIds = bankAccountIds.filter((id): id is string =>
        Boolean(id)
      );

      // Convert IDs to numbers and ensure uniqueness
      const uniqueBankAccountIds = Array.from(
        new Set(validBankAccountIds.map(Number))
      );

      // Filter response to match valid bank accounts
      const matchedAccounts = response.extendedBankAccounts.filter(
        (account: { bank_account_id: number }) =>
          uniqueBankAccountIds.includes(account.bank_account_id)
      );

      // Prepare options for dropdown
      const options =
        matchedAccounts.length > 0
          ? response.extendedBankAccounts.map(
              (account: {
                account_name: string;
                bank_account_id: string | number;
              }) => ({
                label: account.account_name,
                value: account.bank_account_id,
              })
            )
          : [];

      // Add "Select All" if multiple options exist
      const updatedOptions =
        options.length > 1
          ? [{ label: "Select All", value: -1 }, ...options]
          : options;

      setBankAccountsOptions(updatedOptions);
    } else {
      setBankAccountsOptions([]); // Set empty if no match
    }
  }

  const handleUpdateDelegatePowers = async () => {
    if (!multiSelectedData.length) {
      return;
    }

    const selectedBankAccountIds = multiSelectedData.map(
      (account) => account.value
    );
    const payload = {
      account_ids: selectedBankAccountIds,
      company_id: getCompanyIdFromStorage(),
    };
    try {
      setLoader(true); // Show loader while calling API
      const response = await updateDelegatePowers(payload);
      if (response) {
        setDisplayDelegationModel(false); // Close modal on success
        formik?.handleSubmit();
        return true;
      }
    } catch {
    } finally {
      setLoader(false); // Hide loader
    }
  };

  const handleSelectChange = (
    selectedOptions: { label: string; value: number }[] | null
  ) => {
    if (!selectedOptions) {
      setMultiSelectedData([]);
      setIsAllSelected(false);
      return;
    }

    const isSelectAllSelected = selectedOptions.some((opt) => opt.value === -1);

    if (isSelectAllSelected) {
      setMultiSelectedData(
        bankAccountsOptions.filter((opt) => opt.value !== -1)
      );
      setIsAllSelected(true);
    } else {
      setMultiSelectedData(selectedOptions);
      setIsAllSelected(false);
    }
  };

  async function handlePopupConfirm(value: any) {
    if (value) {
      setDisplayPopup(false); // Close the popup
      formik.setFieldValue("input_date", value);
      formik.handleSubmit(); // Proceed with form submission
    }
  }

  async function movePaymentToArchive() {
    const userMode =
      typeof window !== "undefined" ? localStorage.getItem("userMode") : null;
    const paymentType = formik?.values?.payment_type;

    const paymentTypesRequiringPopup = [
      "Pay Less - Full",
      "Pay Less - Part",
      "Pay - Zero",
      "pay 3rd party only",
      "3rd Party",
      null,
    ];

    // If popup conditions are met, show popup for date input
    if (
      !datePopupAcknowledged &&
      userMode !== "Normal" &&
      paymentTypesRequiringPopup.includes(paymentType)
    ) {
      setDisplayDatePopup(true);
      return true;
    } else {
      await handleDeletePayment(); // Directly proceed to delete payment
      return true;
    }
  }

  // Helper function to handle delete API call
  async function handleDeletePayment() {
    try {
      setLoader(true); // Show loader during API call

      // Prepare API payload
      const postData = {
        payment_id: patchData?.payment_id,
        status: "Deleted",
        input_date: tempselectedDate ? new Date(tempselectedDate) : null, // Use tempselectedDate
      };

      // Call the delete API
      const response = await deletePayment(postData);

      if (response) {
        resetRetainedPaymentsData();
        navigateTo("deleted"); // Redirect after successful deletion
      }

      setDisplayDeleteModal(false); // Close delete modal
      setLoader(false); // Hide loader
    } catch {
      setLoader(false); // Hide loader on error
    }
  }

  // Popup confirmation handler
  function handleDatePopupConfirm() {
    if (!tempselectedDate) {
      console.warn("Please select a date before confirming."); // Handle missing date
      return;
    }

    setDatePopupAcknowledged(true); // Mark popup as acknowledged
    setDisplayDatePopup(false); // Close the popup
    handleDeletePayment(); // Proceed with deletion
  }

  function handleClose() {
    // Destructure `formik.values` to exclude `total_amount` so we can compare the rest of the values.
    // `formikValues` now holds all values except `total_amount`.
    const { total_amount, ...formikValues } = formik?.values || {};

    // Check if `initialPatchedValues` and `formikValues` are equal.
    // `isEqual` is a utility function from lodash that performs a deep comparison.
    if (isEqual(initialPatchedValues, formikValues) || screenMode == VIEW) {
      // If values match, invoke `handleCloseRoutes` to proceed with closing the routes
      // without displaying any confirmation dialog.
      resetRetainedPaymentsData();
      handleCloseRoutes();
    } else {
      // If values differ, set `displayOnCancel` to true to show a confirmation dialog.
      setDisplayOnCancel(true);
    }
  }

  function handleCloseRoutes() {
    // First check for the ImportScreen condition
    if (ImportScreen === "import") {
      handleRoute(AppRoutes.USER_PAY_APPS);
    } else if (overviewType == OVERVIEW_TABS.project) {
      router.push(
        `${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewProjectId}?active_tab=${projectOverviewTabs.CLAIMS}`
      );
    }
    // If ImportScreen is not "import", continue with the other conditions
    else if (previousPage) {
      handleRoute(
        `${previousPage}?claim-type=${formik?.values.claim_type ?? ""}`
      );
      deleteCookie("from_page");
    } else if (overViewId && overViewTab) {
      handleRoute(
        `${
          overViewPage === "contracts"
            ? AppRoutes.USER_CONTRACTS_OVERVIEW
            : AppRoutes.USER_PROJECTS_OVERVIEW
        }/${overViewId}?from=${overViewTab}`
      );
    } else if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      handleRoute();
    }
  }

  function handleOnRouteToSubscribe() {
    const { values } = formik;

    dispatch(
      setPayments({
        ...values,
        payment_amount: replaceDollarSymbol(values?.payment_amount),
        payless_amount: replaceDollarSymbol(values?.payless_amount),
        retention_amount: replaceDollarSymbol(values?.retention_amount),

        formatted_payment_amount: replaceDollarSymbol(
          values?.formatted_payment_amount
        ),
        formatted_payless_amount: replaceDollarSymbol(
          values?.formatted_payless_amount
        ),
        formatted_retention_amount: replaceDollarSymbol(
          values?.formatted_retention_amount
        ),
        formatted_claim_amount: replaceDollarSymbol(
          values?.formatted_claim_amount
        ),
      })
    );
    dispatch(
      setPaymentAttachments({
        optional: optionalFiles,
        compulsory: compulsoryFiles,
      })
    );

    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  }

  function handleViewFileFromPath(filePath: string, fileName: string) {
    const pdfWindow = window.open("");
    pdfWindow?.document.write(
      `<iframe width='100%' height='100%' src='${filePath}' title='${fileName}'></iframe>`
    );
  }

  // Send Mail
  const handleSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      resetRetainedPaymentsData();
      navigateTo(); // return to payment list
      return true;
    }

    return false;
  };

  // Cancel
  const handleCancelSendMail = async () => {
    const hasNoticeMails = noticeMailUuids?.length > 0;
    const hasQbccNotices = qbccNoticeUuids?.length > 0;

    if (!hasNoticeMails && !hasQbccNotices) {
      return false; // nothing to send
    }

    setLoader(true);
    setLoaderInfo("Sending mail...");

    let success = true;

    // 1️⃣ Send regular notices if present
    if (hasNoticeMails) {
      const res = await SendMailForNotices(noticeMailUuids);
      if (!res) success = false;
    }

    // 2️⃣ Send QBCC notices if present
    if (hasQbccNotices) {
      const res = await SendQbccMailForNotices(qbccNoticeUuids);
      if (!res) success = false;
    }

    setLoader(false);

    if (success) {
      cleanupNoticePopup();
      resetRetainedPaymentsData();
      navigateTo(); // return to payment list
      return true;
    }

    return false;
  };

  // Common cleanup
  const cleanupNoticePopup = () => {
    setShowNoticePopup(false);
    setLoader(false);
    setLoaderInfo("");
    setNoticeFiles([]);
    setNoticeMailUuids([]);
    setQbccNoticeFiles([]);
    setQbccNoticeUuids([]);
  };

  return (
    <div className="pt_fullpageactions">
      <div>
        <a href="#">
          <button className="contrast" onClick={() => handleClose()}>
            <i className="fa-light fa-xmark-large"></i>
            {isViewMode ? "Close" : "Cancel"}
          </button>
        </a>
      </div>
      <div>
        {patchData?.payment_overview_buttons?.delete &&
          screenMode !== VIEW_ARCHIVE && (
            <CustomButton
              buttonName="Delete"
              iconClassName="fa-light fa-trash"
              buttonType={buttonType.CONTRAST} // Replace with your button style for "View"
              actionType="button"
              disabled={disableSaveButton}
              onClick={() => setDisplayDeleteModal(true)}
            />
          )}
        &nbsp;
        {(patchData?.payment_overview_buttons?.save ||
          patchData?.payment_overview_buttons?.edit ||
          isEditable) && (
          <CustomButton
            buttonName="Save"
            iconClassName="fa-light fa-circle-check"
            buttonType={buttonType.PRIMARY} // Replace with your button style for "View"
            actionType="button"
            disabled={ImportScreen === "import" ? false : disableSaveButton}
            onClick={() => onSubmit()}
          />
        )}
      </div>

      {displayDeleteModal && !loader && (
        <BaseModal
          displayModal={displayDeleteModal}
          modalId={"Payment confirmation"}
          onClose={() => setDisplayDeleteModal(false)}
          secondButtonName="Yes"
          firstButtonName="No"
          onConfirm={() => {
            movePaymentToArchive();
            return true;
          }}
        >
          <p className="text_center">
            Are you sure you wish to move this Payment to the archive?
          </p>
        </BaseModal>
      )}
      {/* {displayDatePopup && (
        <BaseModal
          displayModal={displayDatePopup}
          onClose={() => setDisplayDatePopup(false)} // Close popup on cancel
          secondButtonName="Close"
          firstButtonName="Save"
          title="Select Input Date"
          onConfirm={() => {
            if (tempselectedDate) {
              setSelectedDate(tempselectedDate);
              handleDatePopupConfirm(); // Save action only if a date is selected
              return true;
            } else {
              console.warn("Please select a date before saving.");
            }
          }} // Confirm submit
        >
          <div>
            <p>
              Only for onboarding mode for related transactions requiring the
              input date. Please input the required input date which will be
              input into your journal records if different from today.
            </p>
            <div style={{ marginTop: "1rem" }}>
              <label>
                <b>Select input date *</b>
              </label>
              <input
                type="date"
                value={tempselectedDate}
                onChange={(e) => setTempSelectedDate(e.target.value)}
                min={
                  formik?.values?.input_date
                    ? new Date(formik?.values?.input_date)
                        .toISOString()
                        .split("T")[0]
                    : undefined
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          </div>
        </BaseModal>
      )} */}
      {displayDatePopup && (
        <dialog id="date-input-popup" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => setDisplayDatePopup(false)}
                ></button>
              </div>
            </header>

            <p>
              Only for onboarding mode for related transactions requiring the
              input date. Please input the required input date which will be
              input into your journal records if different from today.
            </p>

            <div style={{ marginTop: "1rem" }}>
              <FormikControl
                control={InputType.DATE_PICKER}
                required
                label={"Select input date"}
                // showError={
                //   formik.touched.input_date && formik.errors.input_date
                // }
                selected={tempselectedDate}
                onChange={(selectedDate: string) => {
                  setTempSelectedDate(selectedDate);
                }}
                // error={formik.touched.input_date && formik.errors.input_date}
                format={DD_MM_YYYY}
                value={tempselectedDate}
                minDate={
                  formik?.values?.input_date
                    ? new Date(formik?.values?.input_date)
                    : null
                }
                // disabled={isViewMode}
              />
            </div>

            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => setDisplayDatePopup(false)}
              >
                Close
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => {
                  if (tempselectedDate) {
                    setSelectedDate(tempselectedDate);
                    handleDatePopupConfirm(); // Save action only if a date is selected
                  } else {
                    console.warn("Please select a date before saving.");
                  }
                }}
              >
                Save
              </button>
            </footer>
          </article>
        </dialog>
      )}
      {displayPopup && (
        <dialog id="input-date-confirmation" open>
          <article>
            <header>
              <div className="mb_1">
                <button
                  rel="prev"
                  aria-label="Close"
                  onClick={() => {
                    setDisplayPopup(false);
                    formik.setFieldValue("isOnboardingModelOpen", false); // Update Formik field
                  }}
                ></button>
              </div>
            </header>

            <p>
              Only for onboarding mode for related transactions requiring the
              input date. Please input the required input date which will be
              input into your journal records if different from today.
            </p>

            <div style={{ marginTop: "1rem" }}>
              <FormikControl
                control={InputType.DATE_PICKER}
                required
                label={"Select input date"}
                // showError={
                //   formik.touched.input_date && formik.errors.input_date
                // }
                selected={tempselectedDate}
                onChange={(selectedDate: string) => {
                  setTempSelectedDate(selectedDate);
                }}
                // error={formik.touched.input_date && formik.errors.input_date}
                format={DD_MM_YYYY}
                value={tempselectedDate}
                minDate={
                  formik?.values?.claim_type === "Billable"
                    ? formik?.values?.received_date
                      ? formatDate(
                          new Date(formik?.values?.received_date),
                          DateFormat.YYYY_MM_DD
                        )
                      : undefined
                    : formik?.values?.claim_type === "Receivable"
                    ? formik?.values?.sent_date
                      ? formatDate(
                          new Date(formik?.values?.sent_date),
                          DateFormat.YYYY_MM_DD
                        )
                      : undefined
                    : undefined
                }
                maxYear={new Date().getFullYear() + 50}
                disabled={isViewMode}
              />
            </div>

            <footer>
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setDisplayPopup(false);
                  formik.setFieldValue("isOnboardingModelOpen", false);
                }}
              >
                Close
              </button>
              <button
                className="primary"
                type="button"
                onClick={async () => {
                  if (tempselectedDate) {
                    formik.setFieldValue("input_date", tempselectedDate);
                    formik.setFieldValue("isOnboardingModelOpen", false);
                    handlePopupConfirm(tempselectedDate); // Save action only if a date is selected
                  } else {
                    console.warn("Please select a date before saving.");
                  }
                }}
              >
                Save
              </button>
            </footer>
          </article>
        </dialog>
      )}

      {displaySubscriptionModal && (
        <BaseModal
          title="Upgrade Subscription"
          modalId={"Upgrade Subscription"}
          displayModal={displaySubscriptionModal}
          onClose={async (triggered: any) => {
            if (triggered) {
              setDisplaySubscriptionModal(false);
              await formik?.setFieldValue("skipSubscription", true);
              formik.handleSubmit();
            }
          }}
          onConfirm={() => {
            setDisplaySubscriptionModal(false);
            handleOnRouteToSubscribe();
            return true;
          }}
          restrictOncloseFunctionInHeader
          onHeaderIconClose={() => {
            setDisplaySubscriptionModal(false);
          }}
          secondButtonName="Upgrade now"
          firstButtonName="Proceed with manual notices"
        >
          <h4 className="text_center">
            If you wish Pay Trade to submit your notices automatically to the
            QBCC, please upgrade your subscription.
          </h4>
        </BaseModal>
      )}
      {displayOnCancel && (
        <BaseModal
          displayModal={displayOnCancel}
          restrictOncloseFunctionInHeader
          onHeaderIconClose={() => setDisplayOnCancel(false)}
          onClose={(e: any) => {
            if (e == true) {
              setDisplayOnCancel(false);
              formik?.handleSubmit();
            }
          }}
          firstButtonName="Save"
          secondButtonName="Yes"
          onConfirm={() => {
            handleCloseRoutes();
            return true;
          }}
        >
          <p className="text_center">Are you sure to close and not save?</p>
        </BaseModal>
      )}
      {displayDelegationModel && (
        <BaseModal
          displayModal={displayDelegationModel}
          onClose={(e: any) => {
            if (e) {
              setDisplayDelegationModel(false);
              formik?.handleSubmit();
            }
          }}
          // halfScreenPopup={true}
          secondButtonName="Save"
          firstButtonName="Close"
          onConfirm={() => {
            handleUpdateDelegatePowers();
            return true;
          }}
        >
          <p className="text_center">
            You need to authorize Pay Trade to act on your behalf to automate
            notices (also known as delegated authority). <br />
            For project trusts, this needs to be done on the QBCC portal. <br />
            Once done, you can confirm here, and we can issue notices on your
            behalf. <br />
            Do you want to enable it now?
          </p>
          <br />
          <div>
            <SearchableSelect
              placeholder={
                bankAccountsOptions.length > 1
                  ? "Select bank accounts"
                  : "Select a bank account"
              }
              label={
                bankAccountsOptions.length > 1
                  ? "Select bank accounts"
                  : "Select a bank account"
              }
              name="BankAccount"
              required
              isMulti={true}
              isInPopup={true}
              options={bankAccountsOptions}
              multiSelectedData={displayedOptions}
              onChange={handleSelectChange}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <br />
          <p className="text_center">
            <span className="pt_yellow">Note:</span> On close your notices will
            not be sent automatically. Visit the notices pages to send manually.
          </p>
        </BaseModal>
      )}
      {showNoticePopup && (
        <BaseModal
          modalId="Generated Notices"
          displayModal={showNoticePopup}
          title="Preview generated notices"
          hideHeaderCloseIcon={true}
          onClose={(e: any) => {
            // 👈 closing modal via "X" or backdrop = just close, no API
            if (e === true) {
              setShowNoticePopup(false);
              return handleCancelSendMail();
            }
          }}
          onConfirm={() => {
            setShowNoticePopup(false);
            return handleSendMail();
          }}
          // onCancel={handleCancelSendMail}
          firstButtonName="Close"
          secondButtonName="Send Mail"
        >
          <p className="">
            <span className="pt_yellow">Note:</span> We have generated the
            documents below, and they are available to view. The system will
            send an email with these documents attached in{" "}
            <b className="pt_green">{timeLeft}</b> seconds.
            {qbccNoticeFiles?.length > 0 && (
              <>
                <br />
                <span className="pt_red">
                  QBCC documents will be verified by Paytrade admin and
                  submitted on your behalf.
                </span>
              </>
            )}
          </p>
          <br></br>
          {noticeFiles.map((file: any, idx: number) => (
            <div key={idx} className="pt_itemwithremove">
              <span>{file.file_name}</span>
              <div>
                <CustomButton
                  buttonName="View"
                  buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                  iconClassName="fa-light fa-eye"
                  actionType="button"
                  onClick={
                    () => handleViewFileFromPath(file.file, file.file_name) // base64 PDF
                  }
                />
              </div>
            </div>
          ))}
          {qbccNoticeFiles?.length > 0 && (
            <>
              {qbccNoticeFiles.map((file: any, idx: number) => (
                <div key={idx} className="pt_itemwithremove">
                  <span>{file?.file_name}</span>
                  <div>
                    <CustomButton
                      buttonName="View"
                      buttonType={`${buttonType.SECONDARY} ${buttonType.SMALL_BUTTON}`}
                      iconClassName="fa-light fa-eye"
                      actionType="button"
                      onClick={() =>
                        handleViewFileFromPath(
                          file.file_path || file.file, // prefer path, fallback to base64
                          file.file_name
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </BaseModal>
      )}
    </div>
  );
}
