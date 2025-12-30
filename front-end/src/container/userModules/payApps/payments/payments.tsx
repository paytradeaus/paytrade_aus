"use client";

import customStyles from "./payments.module.scss";
import Attachments from "./attachments";
import HeaderContent from "./headerContent";
import PaymentsType from "./paymentsType";
import Tabs from "./tabs";
import RetentionForms from "./retentionForms";
import { usePaymentsContext } from "./paymentsContext";
import { tabTypes } from "./payments.constant";
import { Row, Col, Button } from "react-bootstrap";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { useEffect, useState } from "react";
import { AppModal } from "@/components/model/model";
import { deletePayment } from "./payments.function";
import {
  commonCookies,
  EDIT,
  VIEW,
  VIEW_ARCHIVE,
} from "@/common/constants/general";
import { ApplicationURLS } from "@/common/applicationURLS";
import MatchedPaymentTransactions from "./matchedPaymentTransactions";
import { ModalFullScreen } from "@/components/ModalFullScreen/modalFullScreen";
import Notices from "./notices";
import { fetchAllPaymentClaims } from "../payApps.functions";
import { RowsPerPageInTable } from "@/common/constants";
import { useAppDispatch } from "@/redux/store";
import { setCompanyId } from "@/redux/slices/companyDetails";
import { useTokenDetails } from "@/common/commonHooks";
import { isEqual } from "lodash";
import { SUBSCRIPTION_UPGRADE } from "@/common/constants/messages";
import {
  getSubscriptionType,
  replaceDollarSymbol,
} from "@/common/commonFunctions";
import {
  setPaymentAttachments,
  setPayments,
} from "@/redux/slices/subscribeRouteBackDetails";
import _ from "lodash";

export default function Payments() {
  const {
    formik,
    isViewMode,
    previousPage,
    disableSaveButton,
    initialPatchedValues,
    isEditable,
    patchData,
    navigateTo,
    setLoader,
    screenMode,
    overViewId,
    overViewTab,
    overViewPage,
    loader,
    setSubscriptionPlanName,
    setSelectedClaim,
    setSelectedDate,
    displayPopup,
    setDisplayPopup,
    displaySubscriptionModal,
    setDisplaySubscriptionModal,
    optionalFiles,
    compulsoryFiles,
    resetRetainedPaymentsData,
  }: any = usePaymentsContext();

  const routePath = usePathname();

  const [displayDatePopup, setDisplayDatePopup] = useState(false); // State to control the popup

  const [datePopupAcknowledged, setDatePopupAcknowledged] = useState(false);

  const [tempselectedDate, setTempSelectedDate] = useState<any>();

  function handlePopupConfirm(value: any) {
    if (tempselectedDate) {
      setDisplayPopup(false); // Close the popup

      formik.handleSubmit(); // Proceed with form submission
    }
  }

  const [displayDeleteModal, setDisplayDeleteModal] = useState(false);
  //  import

  const dispatch = useAppDispatch();

  const queryParams = useSearchParams();

  const ImportScreen: any = queryParams.get("screen");
  const ImportCompanyId: any = queryParams.get("company_id");
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [displayImportModal, setDisplayImportModal] = useState(false);

  const [claimOptions, setClaimOptions] = useState<any[]>([]);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);

  const { decodeTokenData } = useTokenDetails();
  const [tempSelectedClaim, setTempSelectedClaim] = useState<any>(null);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);

  const router = useRouter();

  useEffect(() => {
    //update current subscription plan type to trigger notices on submit
    setSubscriptionPlanName(
      getSubscriptionType(decodeTokenData, selectedCompanyId)
    ); // Assuming setPlanName exists to store the plan name
  }, []);

  // import
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoader(true); // Show loader
        const { companySpecificRoles } = decodeTokenData || {};

        // Fetch company profiles if screen is 'import'
        if (ImportScreen === "import") {
          // Check if importCompanyId exists in the companySpecificRoles array from the token
          const companyExists = companySpecificRoles?.some(
            (role: any) => role.companyId === Number(ImportCompanyId)
          );

          // Redirect if the company is not found
          if (!companyExists) {
            router.push(ApplicationURLS.USER_LOGIN);
            return;
          }

          // Check if isSystemAdded is true and set the ProfileType accordingly
          const userPrivilage = companySpecificRoles?.find(
            (role: any) => role.companyId === Number(ImportCompanyId)
          );

          if (userPrivilage?.isSystemAdded === true) {
            // If isSystemAdded is true, set profile type to "User"
            localStorage.setItem("ProfileType", "User");
            setCookie("ProfileType", "User");
          } else {
            // Otherwise, set profile type to "Business"
            localStorage.setItem("ProfileType", "Business");
            setCookie("ProfileType", "Business");
          }

          // Set company data if found

          localStorage.setItem("companyId", ImportCompanyId);
          dispatch(setCompanyId(ImportCompanyId));
          setCookie("companyId", ImportCompanyId);
          // setCookie("redirectAfterLogin", fullRoute);

          // Only fetch data and show modal if company exists
          if (companyExists && ImportScreen === "import") {
            fetchData(page, perPage); // Fetch relevant data
            setDisplayImportModal(true); // Display the import modal
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoader(false); // Hide loader when done
      }
    };

    fetchDetails();
  }, [
    ImportCompanyId,
    ImportScreen,
    page, // Include page and perPage for pagination in fetchData
    perPage,
  ]);

  // Fetch data
  const fetchData = async (page: number, rowsPerPage: number) => {
    if (!selectedCompanyId) return; // Early return if selectedCompanyId is not present

    const response = await fetchAllPaymentClaims({
      cash_retention_type: null,
      claim_type: "Receivable",
      contract_id: null,
      company_id: selectedCompanyId || null,
      items_per_page: null,
      page: page,
      project_id: null,
      status: "",
    });

    // Assuming response contains a list of claims with claim_id and claim_name
    if (response) {
      const responseData = JSON.parse(JSON.stringify(response?.payment_claims));
      setClaimOptions(response.payment_claims || []);
      const options = responseData.map((claim: any) => ({
        label: claim?.payment_claim_id, // You can replace this with any appropriate label field
        value: claim?.payment_claim_id,
      }));
      setClaimOptions(options || []);
    }
  };

  function handleClose() {
    // Destructure `formik.values` to exclude `total_amount` so we can compare the rest of the values.
    // `formikValues` now holds all values except `total_amount`.
    const { total_amount, ...formikValues } = formik?.values || {};

    // Check if `initialPatchedValues` and `formikValues` are equal.
    // `isEqual` is a utility function from lodash that performs a deep comparison.
    if (isEqual(initialPatchedValues, formikValues)) {
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
      router.push(ApplicationURLS.USER_PAY_APPS);
    }
    // If ImportScreen is not "import", continue with the other conditions
    else if (previousPage) {
      router.push(`${previousPage}?claim-type=${formik?.values.claim_type}`);
      deleteCookie("from_page");
    } else if (overViewId && overViewTab) {
      router.push(
        `${
          overViewPage === "contracts"
            ? ApplicationURLS.USER_CONTRACTS_OVERVIEW
            : ApplicationURLS.USER_PROJECT_OVERVIEW
        }/${overViewId}?from=${overViewTab}`
      );
    } else {
      router.back();
    }
    resetRetainedPaymentsData();
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
    } else {
      await handleDeletePayment(); // Directly proceed to delete payment
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
        navigateTo(); // Redirect after successful deletion
      }

      setDisplayDeleteModal(false); // Close delete modal
      setLoader(false); // Hide loader
    } catch (err: any) {
      console.error("Error deleting payment:", err);
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

  function handleOnRouteToSubscribe() {
    const { values } = formik;

    sessionStorage.setItem(commonCookies.NAVIGATED_FROM, routePath);
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

    router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
  }

  function onSubmit() {
    formik.handleSubmit();
  }

  return (
    <ModalFullScreen
      displayFullScreenModal={true}
      onClose={() => handleClose()}
      customButtons={true}
      btnConfig={
        <Row className="w-100 d-flex align-items-center">
          <Col xl={7} lg={7} md={6} sm={12} xs={12}>
            <Button onClick={() => handleClose()} type="button">
              {isViewMode ? "Close" : "Cancel"}
            </Button>
          </Col>

          <Col
            xl={5}
            lg={5}
            md={5}
            sm={12}
            xs={12}
            className={`${customStyles.paymentButtonsAlign} ${"text-end"}`}
          >
            {patchData?.payment_overview_buttons?.delete &&
              screenMode !== VIEW_ARCHIVE && (
                <Button
                  className={`${customStyles.button} ${customStyles.deleteButton} `}
                  disabled={disableSaveButton}
                  type="button"
                  onClick={() => setDisplayDeleteModal(true)}
                >
                  Delete
                </Button>
              )}

            {(patchData?.payment_overview_buttons?.save ||
              patchData?.payment_overview_buttons?.edit ||
              isEditable) && (
              <Button
                className={`${customStyles.button} ${customStyles.editButton} `}
                type="button"
                disabled={disableSaveButton}
                onClick={() => onSubmit()}
              >
                Save
              </Button>
            )}
          </Col>
        </Row>
      }
    >
      <div className={customStyles.dataContainer}>
        <HeaderContent />
        <PaymentsType />
        <Tabs />
        <RenderDynamicTabs />
        <RenderDynamicAttachments />
        {isViewMode &&
          formik?.values?.payment_type !== tabTypes.PAY_LESS_ZERO &&
          formik?.values?.payment_type !== tabTypes.THIRD_PARTY && (
            <MatchedPaymentTransactions />
          )}
        {(screenMode === VIEW || screenMode === EDIT) && <Notices />}

        {displayDeleteModal && !loader && (
          <AppModal
            show={displayDeleteModal}
            onHide={() => setDisplayDeleteModal(false)}
            secondButtonLabel="No"
            firstButtonLabel="Yes"
            modalBodyContent={
              "Are you sure you wish to move this Payment to the archive?"
            }
            onConfirm={() => movePaymentToArchive()}
          />
        )}
        {displayOnCancel && (
          <AppModal
            show={displayOnCancel}
            onCancel={() => formik?.handleSubmit()}
            cancelfnButtonLabel="Save"
            firstButtonLabel="Yes"
            modalBodyContent={"Are you sure to close and not save?"}
            onConfirm={() => handleCloseRoutes()}
            closeButton
            onCloseIconClick={() => setDisplayOnCancel(false)}
          />
        )}
        {ImportScreen === "import" && (
          <AppModal
            show={displayImportModal}
            onHide={() => setDisplayImportModal(false)}
            firstButtonLabel="Confirm"
            modalHeading={"Select Appropriate Claim"}
            modalBodyContent={
              "Please select the appropriate claim from the below list."
            }
            onConfirm={() => {
              if (tempSelectedClaim) {
                // Set the selected claim value to the main state
                setSelectedClaim(tempSelectedClaim);
                // Close the modal after handling the selection
                setDisplayImportModal(false);
              } else {
                // Optionally handle the case where no claim is selected
                console.warn("No claim selected. Please select a claim.");
              }
            }}
            displaySelect={true} // This controls the visibility of the dropdown inside HOC
            select={{
              options: claimOptions, // Populated claim options
              onChange: (selectedObj: any) => {
                setTempSelectedClaim(selectedObj);
              },
              value: tempSelectedClaim, // Controlled by temporary state
              placeholder: "Select Claim *", // Placeholder text
            }}
          />
        )}
        {displayPopup && (
          <AppModal
            show={displayPopup}
            onHide={() => {
              setDisplayPopup(false);
              formik.setFieldValue("isOnboardingModelOpen", false); // Update Formik field
            }} // Close popup on cancel
            secondButtonLabel="Close"
            firstButtonLabel="Save"
            modalBodyContent={
              "Only for onboarding mode for related transactions requiring the input date.  Please input the required input date which will be input into your journal records if different from today"
            }
            onConfirm={() => {
              if (tempselectedDate) {
                formik.setFieldValue("input_date", tempselectedDate);
                formik.setFieldValue("isOnboardingModelOpen", false);
                handlePopupConfirm(tempselectedDate); // Save action only if a date is selected
              } else {
                console.warn("Please select a date before saving.");
              }
            }} // Confirm submit
            showDatePickerInput={true}
            datePickerLabel={"Select input date *"}
            datePickerValue={tempselectedDate}
            onDatePickerChange={(date) => setTempSelectedDate(date)}
            hasError={formik.touched.input_date && formik.errors.input_date}
            errorMessage={formik.errors.input_date}
            minimumDate={
              formik?.values?.claim_type === "Billable"
                ? formik?.values?.received_date
                  ? new Date(formik?.values?.received_date)
                  : null
                : formik?.values?.claim_type === "Receivable"
                ? formik?.values?.sent_date
                  ? new Date(formik?.values?.sent_date)
                  : null
                : null
            }
          />
        )}
        {displayDatePopup && (
          <AppModal
            show={displayDatePopup}
            onHide={() => setDisplayDatePopup(false)} // Close popup on cancel
            secondButtonLabel="Close"
            firstButtonLabel="Save"
            modalBodyContent={
              "Only for onboarding mode for related transactions requiring the input date.  Please input the required input date which will be input into your journal records if different from today"
            }
            onConfirm={() => {
              if (tempselectedDate) {
                setSelectedDate(tempselectedDate);
                handleDatePopupConfirm(); // Save action only if a date is selected
              } else {
                console.warn("Please select a date before saving.");
              }
            }} // Confirm submit
            showDatePickerInput={true}
            datePickerLabel={"Select input date *"}
            datePickerValue={tempselectedDate}
            onDatePickerChange={(date) => setTempSelectedDate(date)}
            minimumDate={
              formik?.values?.input_date
                ? new Date(formik?.values?.input_date)
                : null
            }
          />
        )}
        {displaySubscriptionModal && (
          <AppModal
            show={displaySubscriptionModal}
            cancelfnButtonLabel="Proceed with manual notices"
            firstButtonLabel="Upgrade now"
            modalHeading={"Upgrade Subscription"}
            onConfirm={() => handleOnRouteToSubscribe()}
            modalBodyContent={SUBSCRIPTION_UPGRADE}
            onCancel={async () => {
              setDisplaySubscriptionModal(false);
              await formik?.setFieldValue("skipSubscription", true);
              formik.handleSubmit();
            }}
          />
        )}
      </div>
    </ModalFullScreen>
  );
}

function RenderDynamicTabs() {
  const { formik }: any = usePaymentsContext();

  if (
    formik?.values?.payment_to === tabTypes.SUPPLIER &&
    (formik?.values?.payment_type === tabTypes.FULL ||
      formik?.values?.payment_type === tabTypes.PART ||
      formik?.values?.payment_type === tabTypes.PAY_LESS_FULL ||
      formik?.values?.payment_type === tabTypes.PAY_LESS_PART)
  ) {
    return (
      <RetentionForms
        displayRetentionForms={
          formik?.values?.cash_retention === tabTypes.RETENTION &&
          formik?.values?.cash_retention_type !== "Retention claim"
        }
      />
    );
  } else {
    return <></>;
  }
}

function RenderDynamicAttachments() {
  const { formik }: any = usePaymentsContext();

  function checkIsAttachmentCompulsory() {
    if (
      formik?.values?.claim_type === tabTypes.BILLABLES &&
      (formik?.values?.payment_type !== tabTypes.FULL ||
        formik?.values?.payment_to === tabTypes.THIRD_PARTY)
    ) {
      return true;
    } else {
      return false;
    }
  }

  return (
    <Attachments
      displayCompulsoryOptionalAttachment={checkIsAttachmentCompulsory()}
    />
  );
}
