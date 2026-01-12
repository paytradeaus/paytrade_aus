import React, { Fragment, useEffect, useRef, useState } from "react";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BaseModal from "@/components/BaseModal";
import { isEqual } from "lodash";
import { changeStatusOfAPaymentClaim } from "../PayApps/payApps.functions";
import { buttonType } from "@/shared/constant/general";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { toggleOptions } from "../PayApps/payApps.constant";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  getSubscriptionDetailsByCompanyId,
  updateDelegatePowers,
} from "../Subscriptions/subscriptions.function";
import { getCompanyIdFromStorage } from "@/utils";
import {
  FetchAllBankAccounts,
  SendMailForNotices,
  SendQbccMailForNotices,
} from "../AddUpdateBankAccount/AddUpdateBankAccount.function";
import { useTokenDetails } from "@/hooks";
import CustomButton from "@/components/CustomButton/CustomButton";

export default function FooterSection() {
  const {
    formik,
    togglePaymentBillables,
    setDelegateAuthorityAllowed,
    delegateAuthorityAllowed,
    handleSubmit,
    isEditable,
    claimData,
    router,
    isViewMode,
    delegationBankId,
    initialPatchedValues,
    disableDraftButton,
    setDisableDraftButton,
    setLoader,
    paymentType,
    Type,
    handleRoute,
    paymentId,
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
    noticesAutomated,
    setNoticesAutomated,
    setIsFree,
  }: any = useAddUpdateClaimsContext();
  const { decodeTokenData } = useTokenDetails();

  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [bankAccountsOptions, setBankAccountsOptions] = useState<
    { label: string; value: number }[]
  >([]);

  const [delegatePlanName, setDelegatePlanName] = useState<string>(""); // Example state, set accordingly
  const [displayDeleteConfirmationModal, setDisplayDeleteConfirmationModal] =
    useState(false);
  const [paymentSelectionModel, setPaymentSelectionModel] = useState(false);
  const [displayDelegationModel, setDisplayDelegationModel] = useState(false);

  const [multiSelectedData, setMultiSelectedData] = useState<
    { label: string; value: number }[]
  >([]);
  const companyId: any =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("companyId"))
      : null;
  const [isAllSelected, setIsAllSelected] = useState(false);
  const displayedOptions = isAllSelected
    ? [{ label: "All", value: -1 }]
    : multiSelectedData;

  function handleDraftChanges(e: any) {
    if (disableDraftButton) return;

    e?.stopPropagation();
    e?.preventDefault();

    const { values } = formik ?? {};

    if (values?.projectId && values?.contractId) {
      setDisableDraftButton(true);
      handleSubmit(true, true);
    } else {
      formik?.setFieldTouched("projectId", true);
      formik?.setFieldTouched("contractId", true);
    }
  }

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

  useEffect(() => {
    if (
      delegationBankId !== null &&
      delegatePlanName !== "" &&
      delegatePlanName !== "Basic" &&
      !togglePaymentBillables()
    ) {
      getFetchBankAccountsLists();
    }
  }, [delegationBankId]);

  useEffect(() => {
    if (paymentSelectionModel && dialogRef.current) {
      dialogRef.current.showModal(); // Open the dialog
    } else if (dialogRef.current) {
      dialogRef.current.close(); // Close the dialog if needed
    }
  }, [paymentSelectionModel]);

  // 1️⃣ Fetch subscription on component mount or when needed
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        // setLoader(true);
        // setLoaderInfo("Checking subscription...");

        const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
        const delegateItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Delegate authority"
          ) || null;

        let isAllowed =
          delegateItem &&
          String(delegateItem.limit_value).toLowerCase() === "true";
        // setDelegateAuthorityAllowed(!!isAllowed);

        // ✅ Find "Notices"
        const noticesItem =
          subscriptionResponse?.plan_items?.find(
            (item: any) => item.item_name === "Notices"
          ) || null;

        const isNoticesAutomated =
          noticesItem &&
          String(noticesItem.limit_value).toLowerCase() === "automated";
        // setNoticesAutomated(!!isNoticesAutomated);

        const isFreePlanEligible =
          subscriptionResponse?.is_free_plan_eligible ?? false;
        // 🔥🔥 OVERRIDE RULE:
        // If free plan is TRUE → force delegate to TRUE
        if (isFreePlanEligible) {
          isAllowed = true;
          setIsFree(isFreePlanEligible);
          setNoticesAutomated(true);
        } else {
          setNoticesAutomated(!!isNoticesAutomated);
        }
        // 🔹 Final set states
        setDelegateAuthorityAllowed(!!isAllowed);
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
      // Ensure delegationBankId is an array before using filter()
      // const bankAccountIds: string[] = Array.isArray(delegationBankId)
      //   ? delegationBankId
      //   : [];

      const bankAccountIds: number[] = delegationBankId
        ? Array.isArray(delegationBankId)
          ? delegationBankId.map(Number)
          : [Number(delegationBankId)]
        : [];

      // Remove null/undefined values
      const validBankAccountIds = bankAccountIds.filter((id): id is any =>
        Boolean(id)
      );

      // Convert IDs to numbers and ensure uniqueness
      const uniqueBankAccountIds = Array.from(
        new Set(validBankAccountIds.map(Number))
      );

      // Filter response to match valid bank accounts
      const matchedAccounts = response.extendedBankAccounts.filter(
        (account: { bank_account_id: number }) =>
          uniqueBankAccountIds.includes(Number(account.bank_account_id))
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

  // const handleClaimSubmitClick = () => {
  //   if (
  //     bankAccountsOptions?.length > 0 &&
  //     Object.keys(formik?.errors ? formik?.errors : {}).length === 0
  //   ) {
  //     setDisplayDelegationModel(true);
  //   } else {
  //     formik?.handleSubmit();
  //     formik.setFieldTouched("retentionPercentage");
  //     formik.setFieldTouched("retentionAmount");
  //   }
  // };

  const handleClaimSubmitClick = () => {
    // Use pre-fetched subscription value with bank account checks
    if (
      bankAccountsOptions?.length > 0 &&
      Object.keys(formik?.errors ?? {}).length === 0 &&
      delegateAuthorityAllowed
    ) {
      if (delegateAuthorityAllowed) {
        setDisplayDelegationModel(true); // show delegation modal
      }
    } else {
      // No bank accounts or form errors → submit directly
      formik?.handleSubmit();
      formik.setFieldTouched("retentionPercentage");
      formik.setFieldTouched("retentionAmount");
    }
  };

  const handleUpdateDelegatePowers = async () => {
    if (!multiSelectedData.length) {
      // alert("Please select at least one bank account.");
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

  function handleCancel() {
    const { contractTotal: formContractValue, ...existingFormValues } =
      formik.values || {};
    const { contractTotal: initialContractValue, ...initialFormValues } =
      initialPatchedValues || {};

    if (isEqual(initialFormValues, existingFormValues) || isViewMode) {
      handleRoute();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    handleRoute(AppRoutes.USER_PAY_APPS);
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  async function handleDeleteFunction() {
    try {
      setLoader(true);
      const response = await changeStatusOfAPaymentClaim({
        payment_claim_id: claimData?.payment_claim_id,
        status: "Deleted",
      });
      if (response) {
        // Refresh the contract list after deletion
        router.back();
      }
      setDisplayDeleteConfirmationModal(false);
      setLoader(false);
    } catch (error) {
      setDisplayDeleteConfirmationModal(false);
      setLoader(false);
    }
  }

  function handleViewPayments(isMultiplePayments: boolean) {
    if (isMultiplePayments) {
      handleRoute(AppRoutes.USER_PAYMENTS_LIST);
    } else {
      handleRoute(
        `${AppRoutes.USER_ADD_PAYMENT}?claim=${claimData?.payment_claim_id}&mode=view&payment=${paymentId}&crt=${claimData?.cash_retention_type}&routed-from=claim`
      );
    }
  }

  function handleNextPayment() {
    setCookie("PaymentType", paymentType);

    handleRoute(
      `${AppRoutes.USER_ADD_PAYMENT}?claim=${claimData?.payment_claim_id}&tab=${Type}&next-payment=true`
    );
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
      router.push(
        `${AppRoutes.USER_PAY_APPS}?claim-type=${formik.values?.claim_type}&retention-type=${formik.values?.cash_retention_type}`
      );
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
      router.push(
        `${AppRoutes.USER_PAY_APPS}?claim-type=${formik.values?.claim_type}&retention-type=${formik.values?.cash_retention_type}`
      );
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
    <Fragment>
      <div className="pt_fullpageactions">
        <div>
          <button className="contrast" onClick={() => handleCancel()}>
            <i className="fa-light fa-xmark-large"></i>
            {isViewMode ? "Close" : "Cancel"}
          </button>
        </div>
        {!isViewMode && (
          <div>
            {(!isEditable ||
              (isEditable && claimData?.status !== "Confirmed")) && (
              <span className="mr_zero_point_five">
                <button
                  className="secondary"
                  type="button"
                  onClick={(e: any) => handleDraftChanges(e)}
                  disabled={disableDraftButton}
                >
                  <i className="fa-light fa-floppy-disk"></i>Save as draft
                </button>
              </span>
            )}
            &nbsp;
            <button
              onClick={handleClaimSubmitClick}
              type="button"
              disabled={formik?.isSubmitting}
            >
              <i className="fa-light fa-paper-plane-top"></i>
              {togglePaymentBillables() ? "Completed" : "Complete and send"}
            </button>
          </div>
        )}
        {isViewMode && (
          <div>
            {claimData?.claim_overview_buttons?.delete && (
              <button
                onClick={() => setDisplayDeleteConfirmationModal(true)}
                type="button"
                disabled={formik?.isSubmitting}
                className="mr_zero_point_five"
              >
                <i className="fa-light fa-trash"></i>
                {"Delete"}
              </button>
            )}

            {claimData?.claim_overview_buttons?.edit && (
              <button
                onClick={() =>
                  handleRoute(
                    `${AppRoutes.USER_EDIT_CLAIMS}/${
                      claimData?.payment_claim_id
                    }?&cash-retention-type=${
                      claimData?.cash_retention_type === "Retention claim"
                        ? "RetentionClaim"
                        : ""
                    }&ctype=${claimData?.claim_type}`
                  )
                }
                type="button"
                className={`${buttonType.SECONDARY} mr_zero_point_five`}
              >
                <i className="fa-light fa-pen-to-square"></i>
                {"Edit"}
              </button>
            )}

            {claimData?.claim_overview_buttons?.add_payment && (
              <button
                onClick={() => setPaymentSelectionModel(true)}
                type="button"
                className={`${buttonType.SECONDARY} mr_zero_point_five`}
              >
                <i className="fa-light fa-money-bill-simple"></i>
                Add payment
              </button>
            )}

            {claimData?.claim_overview_buttons?.view_notice && (
              <button
                onClick={() => {
                  const baseUrl = `${AppRoutes.USER_NOTICES}?payment-claim=${claimData?.payment_claim_id}`;
                  const isArchived = claimData?.status === "Deleted";
                  const finalUrl = isArchived
                    ? `${baseUrl}&archived=true`
                    : baseUrl;

                  handleRoute(finalUrl);
                }}
                type="button"
                className={`${buttonType.SECONDARY} mr_zero_point_five`}
              >
                <i className="fa-light fa-message-dollar"></i>
                {"View notices"}
              </button>
            )}

            {claimData?.claim_overview_buttons?.view_payment && (
              <button
                onClick={() => handleViewPayments(false)}
                type="button"
                className={`${buttonType.SECONDARY} mr_zero_point_five`}
              >
                <i className="fa-light fa-file-invoice-dollar"></i>
                View Payment
              </button>
            )}

            {claimData?.claim_overview_buttons?.add_next_payment && (
              <button
                onClick={() => handleNextPayment()}
                type="button"
                className={`${buttonType.SECONDARY} mr_zero_point_five`}
              >
                <i className="fa-light fa-money-bill-transfer"></i>
                Add Next Payment
              </button>
            )}

            {claimData?.claim_overview_buttons?.view_all_payment && (
              <button
                onClick={() => handleViewPayments(true)}
                type="button"
                className={`${buttonType.SECONDARY} mr_zero_point_five`}
              >
                <i className="fa-light fa-file-invoice-dollar"></i>
                View All Payment
              </button>
            )}
          </div>
        )}
      </div>
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
          <h4 className="text_center width_100">
            {" "}
            Are you sure to close and not save?
          </h4>
        </BaseModal>
      )}
      {displayDeleteConfirmationModal && (
        <BaseModal
          modalId={"claims delete modal"}
          displayModal={displayDeleteConfirmationModal}
          onHeaderIconClose={() => setDisplayDeleteConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayDeleteConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {
              "Are you sure you wish to move this claim to the archive list with status set to Deleted?"
            }
          </h4>
        </BaseModal>
      )}
      {paymentSelectionModel && (
        <dialog id="paytype" ref={dialogRef}>
          <article>
            <header>
              <button
                aria-label="Close"
                rel="prev"
                data-target="paytype"
                onClick={() => setPaymentSelectionModel(false)}
              ></button>
              <p>
                <strong>Select payment type</strong>
              </p>
            </header>

            {claimData?.beneficiary_type === "Self" ? (
              <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                <Link
                  href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${claimData?.payment_claim_id}`}
                  onClick={() => setCookie("PaymentType", "Full")}
                  className="pt_selectbox"
                >
                  <h4>Full payment</h4>
                  <p>Where you intend to pay the full claim in full.</p>
                </Link>
                <Link
                  href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${claimData?.payment_claim_id}`}
                  onClick={() => setCookie("PaymentType", "Part")}
                  className="pt_selectbox"
                >
                  <h4>Part payment</h4>
                  <p>
                    Where you intend to pay the claim in full, but due to
                    available funds, will need to pay part now and part later.
                    You will be required to notify the QBCC where this is the
                    case.
                  </p>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      claimData?.payment_claim_id
                    }&tab=${
                      claimData?.cash_retention_type === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${claimData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Full");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Full payment</h4>
                    <p>Where you intend to pay the full claim in full.</p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      claimData?.payment_claim_id
                    }&tab=${
                      claimData?.cash_retention_type === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${claimData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Part");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Part payment</h4>
                    <p>
                      Where you intend to pay the claim in full, but due to
                      available funds, will need to pay part now and part later.
                      You will be required to notify the QBCC where this is the
                      case.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      claimData?.payment_claim_id
                    }&tab=${
                      claimData?.cash_retention_type === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${claimData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay Less - Full");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay Less - Full</h4>
                    <p>
                      Where you intend to pay less due to part completed work or
                      other reduced payment reason. You will be required to
                      confirm the reasons why and input the reduced payment
                      amount.
                    </p>
                  </Link>
                </div>
                <div className="grid" style={{ columnGap: "var(--space-s)" }}>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      claimData?.payment_claim_id
                    }&tab=${
                      claimData?.cash_retention_type === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${claimData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay Less - Part");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay Less - Part</h4>
                    <p>
                      Where you intend to pay less due to part completed work or
                      other reduced payment reason and due to available funds,
                      will need to pay part now and part later. You will be
                      required to notify the QBCC where this is the case.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      claimData?.payment_claim_id
                    }&tab=${
                      claimData?.cash_retention_type === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${claimData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "Pay - Zero");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>Pay - Zero</h4>
                    <p>
                      Where you don’t intend to pay anything to settle the
                      claim. This may be due to a claim error. You will be
                      required to confirm to the sub-contractor the reason why.
                    </p>
                  </Link>
                  <Link
                    href={`${AppRoutes.USER_ADD_PAYMENT}?claim=${
                      claimData?.payment_claim_id
                    }&tab=${
                      claimData?.cash_retention_type === toggleOptions[1]?.value
                        ? "retention-claim"
                        : ""
                    }&beneficiary=${claimData?.beneficiary_type || ""}`}
                    onClick={() => {
                      setCookie("PaymentType", "3rd Party");
                      setCookie("from_page", AppRoutes.USER_PAY_APPS);
                    }}
                    className="pt_selectbox"
                  >
                    <h4>3rd Party</h4>
                    <p>Where you intend to pay a third party.</p>
                  </Link>
                </div>
              </>
            )}
          </article>
        </dialog>
      )}
      {displayDelegationModel && (
        <BaseModal
          displayModal={displayDelegationModel}
          onClose={async (triggered: any) => {
            if (triggered) {
              setDisplayDelegationModel(false);
              await formik?.handleSubmit();
            }
          }}
          secondButtonName="Save"
          firstButtonName="Close"
          onConfirm={() => {
            handleUpdateDelegatePowers();
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
    </Fragment>
  );
}
