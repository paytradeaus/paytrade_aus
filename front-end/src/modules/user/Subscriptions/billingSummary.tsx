import React, { Fragment, useEffect, useRef, useState } from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";
import {
  getSubscriptionDetailsByCompanyId,
  updateDelegatePowers,
  upgradeSubscriptionPlan,
  ValidateCouponService,
} from "./subscriptions.function";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import AddNewPayment from "./addNewPayment";
import CustomButton from "@/components/CustomButton/CustomButton";
import UpdateSignature from "../BusinessProfile/UpdateSignature";
import { getCompanyIdFromStorage } from "@/utils";
import { getCookie, setCookie } from "cookies-next";
import { CustomJwtPayload } from "@/modules/admin/AdminLoginForm";
import { jwtDecode } from "jwt-decode";
import { getAuthToken } from "@/network/apolloClient";
import { getCompanyProfilesWithLogos } from "@/app/api/companyRegistrationService";
import { useSubscriptionDispatch } from "@/redux/subscriptions.store";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";
import { useCustomDebounce, useTokenDetails } from "@/hooks";
import CryptoJS from "crypto-js";
import BaseModal from "@/components/BaseModal";
import { FetchAllBankAccounts } from "../AddUpdateBankAccount/AddUpdateBankAccount.function";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { useFormik } from "formik";

export default function BillingSummary() {
  const {
    selectedPlanForSub,
    setSelectedPlanForSub,
    setLoader,
    allExistingCardDetails,
    selectedCard,
    setSelectedCard,
    existingCardDetails,
    setDisplayBillingDetails,
    subscriptionData,
    setUpdateSubscriptionData,
    stripeCardError,
    stripeCardPaymentDetails,
    annualBilling,
    cardButtonRef,
    cardComplete,
    setAsDefaultCard,
    setAnnualBilling,
    setLoaderInfo,
    setStripeCardPaymentDetails,
    isYearly,
    isDemo,
  }: any = useSubscriptionsContext();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [displaySignatureUploader, setDisplaySignatureUploader] =
    useState(false);
  const [delegateAuthorityAllowed, setDelegateAuthorityAllowed] = useState<
    boolean | null
  >(null);
  const [modalHeading, setModalHeading] = useState<string>("");
  const [modalBodyContent, setModalBodyContent] = useState<string>("");
  const [openPlanModal, setOpenPlanModal] = useState<boolean>(false);
  const [displayDelegationModel, setDisplayDelegationModel] = useState(false);
  const [displayCancelModel, setDisplayCancelModel] = useState(false);
  const [bankAccountsOptions, setBankAccountsOptions] = useState<
    { label: string; value: number }[]
  >([]);
  const [multiSelectedData, setMultiSelectedData] = useState<
    { label: string; value: number }[]
  >([]);

  const [isAllSelected, setIsAllSelected] = useState(false);
  const dispatch: any = useSubscriptionDispatch();
  const [coupon, setCoupon] = useState("");
  const debouncedCoupon = useCustomDebounce(coupon, 600); // debounce 600ms
  const [couponExists, setCouponExists] = useState(false);
  const [finalAmount, setFinalAmount] = useState<number | null | any>(null);

  const extractNumber = (value: string): number => {
    if (!value) return 0;
    return Number(value.replace(/[^0-9.]/g, "")); // keeps only 0-9 & dot
  };

  useEffect(() => {
    const validate = async () => {
      if (!debouncedCoupon) {
        formik.setFieldValue("CouponId", "");
        setCouponExists(false);

        // Restore original price when coupon removed
        const originalPrice = extractNumber(
          selectedPlanForSub?.planPrice || handlePlanDuration(subscriptionData)
        );
        setFinalAmount(
          `${originalPrice.toFixed(2)}  ${
            annualBilling || isYearly ? "/yr" : "/mo"
          }  +VAT`
        );
        return;
      }

      try {
        const res = await ValidateCouponService({
          coupon: debouncedCoupon,
          companyId: Number(getCookie("companyId")) || null,
        });

        const originalPrice = extractNumber(
          selectedPlanForSub?.planPrice || handlePlanDuration(subscriptionData)
        );

        let formattedAmount = `${originalPrice.toFixed(2)} ${
          annualBilling || isYearly ? "/yr" : "/mo"
        } +VAT`;

        if (res?.percent_off) {
          const percent = res.percent_off;
          const discounted = originalPrice - (originalPrice * percent) / 100;
          formattedAmount = `${discounted.toFixed(2)} ${
            annualBilling || isYearly ? "/yr" : "/mo"
          } +VAT`;
        }

        setFinalAmount(formattedAmount);

        if (res?.coupon_id) {
          formik.setFieldValue("CouponId", res?.coupon_id);
          setCouponExists(true);
          showSuccessToast("Coupon applied Successfully");
        } else {
          formik.setFieldValue("CouponId", "");
          setCouponExists(false);
        }
      } catch {
        formik.setFieldValue("CouponId", "");
        setCouponExists(false);

        const originalPrice = extractNumber(
          selectedPlanForSub?.planPrice || handlePlanDuration(subscriptionData)
        );
        setFinalAmount(
          `${originalPrice.toFixed(2)} ${
            annualBilling || isYearly ? "/yr" : "/mo"
          } +VAT`
        );
      }
    };

    validate();
  }, [debouncedCoupon]);

  const formik: any = useFormik({
    initialValues: {
      CouponCode: "",
      CouponId: "",
    },
    onSubmit: () => {}, // required even if empty
    enableReinitialize: true,
  });

  useEffect(() => {
    setSelectedCard(getActiveCard());
    getFetchBankAccountsLists();
    fetchSubscription();
  }, []);

  // 1️⃣ Fetch subscription on component mount or when needed
  async function fetchSubscription() {
    try {
      const subscriptionResponse = await getSubscriptionDetailsByCompanyId();
      const isFree = subscriptionResponse?.is_free_plan_eligible === true;
      const delegateItem =
        subscriptionResponse?.plan_items?.find(
          (item: any) => item.item_name === "Delegate authority"
        ) || null;

      let isAllowed =
        delegateItem &&
        String(delegateItem.limit_value).toLowerCase() === "true";
      // setDelegateAuthorityAllowed(!!isAllowed);
      // 🔥 OVERRIDE RULE → FREE PLAN ALWAYS ALLOWS DELEGATION
      if (isFree) {
        isAllowed = true;
      }

      setDelegateAuthorityAllowed(!!isAllowed);
      return !!isAllowed;
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setDelegateAuthorityAllowed(false);
      return false;
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  function getActiveCard() {
    if (allExistingCardDetails?.length > 0) {
      return allExistingCardDetails.find((x: any) => x?.is_default) || [];
    }
  }

  function displaySubscriptionBtn() {
    if (isPlanChosen() && isAuthorized) {
      return false;
    } else {
      return true;
    }
  }

  function isPlanChosen() {
    return selectedPlanForSub?.id || existingCardDetails?.payment_method_id;
  }

  function getPricingId() {
    if (annualBilling) {
      return subscriptionData?.annual_price_id;
    } else {
      return selectedPlanForSub?.price_id;
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
      const options = response?.extendedBankAccounts?.map((account: any) => ({
        label: account.account_name,
        value: account.bank_account_id,
      }));

      // Add "Select All" only if there are multiple accounts
      const updatedOptions =
        options.length > 1
          ? [{ label: "Select All", value: -1 }, ...options]
          : options;

      setBankAccountsOptions(updatedOptions);
    }
  }

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

  // Modify the value passed to the dropdown
  const displayedOptions = isAllSelected
    ? [{ label: "All", value: -1 }]
    : multiSelectedData;

  async function handleSubscription(
    signedSignature?: string,
    signatureType?: string
  ) {
    try {
      setLoader(true);
      setLoaderInfo("Processing your subscription...");
      const postData = {
        createOrUpdateSubscriptionInput: {
          company_id: getCompanyIdFromStorage(),
          price_id: getPricingId(),
          payment_method_id:
            stripeCardPaymentDetails?.id || selectedCard?.payment_method_id,

          signature: signedSignature ?? subscriptionData?.signature,
          signature_type: signatureType ?? subscriptionData?.signature_type,
          coupon_id: formik.values.CouponId || null,
        },
      };

      const response = await upgradeSubscriptionPlan(postData);
      if (response) {
        await updateAccessToken();
        const isAllowed = await fetchSubscription();
        setUpdateSubscriptionData((prev: any) => !prev);
        //  Show delegation modal if bank accounts are available
        const validBankAccounts = bankAccountsOptions?.filter(
          (acc) => acc?.value !== -1
        );
        if (validBankAccounts?.length > 0) {
          if (isAllowed) {
            // ✅ Delegate authority allowed → show delegation modal
            setDisplayDelegationModel(true);
          } else {
            // ❌ Delegate authority not allowed → show subscription modal
            setModalHeading("Upgrade Subscription");
            setModalBodyContent(
              "Your current subscription does not allow delegate authority. Please upgrade your plan to enable this feature."
            );
            setOpenPlanModal(true);
          }
        } else {
          handleClose();
          return true;
        }
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function updateAccessToken() {
    if (!decodeTokenData?.emailId) return;

    try {
      const newToken: any = await getAuthToken(decodeTokenData?.emailId, false);

      localStorage.setItem("accessToken", newToken);
      const decodeTokensData: CustomJwtPayload = jwtDecode(newToken);

      const userDetails = JSON.parse(JSON.stringify(decodeTokensData));
      //changes for cookie storage issue
      const userTokenDetailsForMiddleware = CryptoJS.AES.encrypt(
        JSON.stringify({
          role: userDetails?.role,
          status: userDetails?.status,
          id: userDetails?.id,
          userName: userDetails?.userName,
          userFirstName: userDetails?.userFirstName,
          userLastName: userDetails?.userLastName,
          emailId: userDetails?.emailId,
          isAdmin: userDetails?.isAdmin,
          timezone: userDetails?.timezone,
          iat: userDetails?.iat,
          exp: userDetails?.exp,
        }),
        "token-verification"
      ).toString();

      setCookie("accessVerification", userTokenDetailsForMiddleware);

      const profiles = await getCompanyProfilesWithLogos();

      const companyId = getCompanyIdFromStorage();

      const data = profiles?.filter(
        (v: any, i: number) => String(v?.company_id) === String(companyId)
      );
      if (data?.length > 0) {
        dispatch(setUpdatedCompany(data[0]));
      }
    } catch (err: any) {
      console.log("updateAccessToken ~ err:", err);
    }
  }

  function handleClose() {
    setDisplayBillingDetails(false);
    setSelectedPlanForSub(null);
    setAnnualBilling(false);
    setStripeCardPaymentDetails(null);
    setDisplayDelegationModel(false);
  }

  async function handleSignature() {
    if (subscriptionData?.signature) {
      if (
        getActiveCard().payment_method_id !== selectedCard?.payment_method_id
      ) {
        setAsDefaultCard(selectedCard, true);
      }
      if (!stripeCardPaymentDetails && cardComplete) {
        cardButtonRef.current.click();
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      handleSubscription();
    } else if (!stripeCardError && stripeCardPaymentDetails) {
      setDisplaySignatureUploader(true);
    } else if (cardComplete) {
      cardButtonRef.current.click();
    }
  }

  function handlePlanDuration(data: any) {
    return (
      `${data?.annual_price_amount}${
        annualBilling || isYearly ? "/yr" : "/mo"
      }+VAT` || "$0.00 +VAT"
    );
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
        handleClose();
      }
    } catch (error) {
    } finally {
      setLoader(false); // Hide loader
    }
  };

  const handleConfirm = () => {
    setOpenPlanModal(false);
    // Redirect to subscription management page

    router.push(AppRoutes.SUBSCRIPTION_PRICING);
  };

  const handleCouponCodeChange = (e: any) => {
    const value = e.target.value.trim();
    formik.setFieldValue("CouponCode", value);
    setCoupon(value);
  };

  return (
    <div className="pt_centered pt_pricing">
      <div className="pricing_close_btn">
        <CustomButton
          actionType="button"
          buttonName="Close"
          buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
          onClick={() => handleClose()}
          iconClassName={"fa-light fa-xmark-large"}
        />
      </div>
      <div className="pt_centeredinner">
        <div className="pt_box_transparent">
          <div className="grid grid-1-2">
            <div className="center">
              <div className="pt_plan pt_premium">
                <span>Subscription summary</span>
                <h3 className="oceantext">
                  {selectedPlanForSub?.plan_name || subscriptionData?.plan_name}
                </h3>
                <p>
                  {selectedPlanForSub?.description ||
                    subscriptionData?.plan_name}
                </p>

                <h5>
                  {" "}
                  {selectedPlanForSub?.planPrice ||
                    handlePlanDuration(subscriptionData)}
                </h5>
                {Number(
                  selectedPlanForSub?.monthly_ai_credit ??
                    subscriptionData?.monthly_ai_credit ??
                    0,
                ) > 0 && (
                  <p style={{ fontSize: "0.85rem", color: "var(--ocean)" }}>
                    Includes $
                    {Number(
                      selectedPlanForSub?.monthly_ai_credit ??
                        subscriptionData?.monthly_ai_credit ??
                        0,
                    ).toFixed(2)}
                    /mo AI credits (no rollover)
                  </p>
                )}
                <hr />
                <p>
                  <b>What you'll pay today</b>
                  <br />
                  {/* {`You'll play ${
                    selectedPlanForSub?.planPrice ||
                    handlePlanDuration(subscriptionData) ||
                    "$0.00 +VAT"
                  } to cover the rest of this
                  billing period`} */}
                  {`You'll pay $${
                    finalAmount ??
                    extractNumber(
                      selectedPlanForSub?.planPrice ||
                        handlePlanDuration(subscriptionData)
                    )
                  } to cover the rest of this billing period`}
                </p>
              </div>
            </div>
            <div className="pt_box">
              <h4>Billing information</h4>
              {existingCardDetails?.payment_method_id && (
                <Fragment>
                  {" "}
                  <p>Select payment method</p>
                  {/* <select
                    name="favorite-cuisine"
                    aria-label="Select your favorite cuisine..."
                    required
                  >
                    <option selected disabled value="">
                      **** **** **** 1234
                    </option>
                    <option>**** **** **** 1234</option>
                    <option>**** **** **** 4321</option>
                    <option>Bank of Bank Worldwide</option>
                  </select> */}
                  <FormikControl
                    placeholder={"Select payment method"}
                    name={"paymentMethod"}
                    control={InputType.SELECT}
                    renderKey="dropdownLabel"
                    options={allExistingCardDetails}
                    valueKey="payment_method_id"
                    value={selectedCard?.payment_method_id}
                    onChange={(selectedOption: any) =>
                      setSelectedCard(selectedOption)
                    }
                    returnSelectedObject
                  />
                  <br />
                  <hr />
                </Fragment>
              )}

              <p>
                {existingCardDetails?.payment_method_id ? "Or add" : "Add"} a
                new payment method to your account
              </p>
              <div>
                <AddNewPayment hideCardValidationButton isDemo={isDemo} />
                <FormikControl type={InputType.CHECKBOX} />
                <div className="mb_1">
                  <FormikControl
                    control={InputType.CHECKBOX}
                    type={"checkbox"}
                    id={`default-checkbox`}
                    checked={isAuthorized}
                    onChange={(e: any) => {
                      setIsAuthorized((prev: any) => !prev);
                    }}
                    disabled={
                      !selectedPlanForSub?.id &&
                      !existingCardDetails?.payment_method_id
                    }
                  />
                  <span>
                    I authorize payment at the discounted amount, if any, for
                    the time periods specified above. If the Subscription
                    Summary section indicates I’m in a free trial, I authorize
                    payment at the end of the trial period. Otherwise, I
                    authorize payment today. After any discount period ends, I
                    authorize payment for the then current monthly or annual
                    subscription price plus tax. I understand I can cancel my
                    subscription at any time by going to the Billing &
                    subscription page.
                  </span>
                </div>
                <FormikControl
                  control={InputType.TEXT_FIELD}
                  label={"Coupon Code"}
                  name={"CouponCode"}
                  id={"CouponCode"}
                  placeholder="Enter a coupon code"
                  onChange={handleCouponCodeChange}
                  value={formik.values.CouponCode}
                />

                <CustomButton
                  buttonName={"Subscribe"}
                  buttonType={buttonType.PRIMARY}
                  disabled={displaySubscriptionBtn()}
                  onClick={() => handleSignature()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {displaySignatureUploader && (
        <UpdateSignature
          isDisplay={displaySignatureUploader}
          handleClose={() => setDisplaySignatureUploader(false)}
          onConfirmation={(signature: string, type: string) => {
            setDisplaySignatureUploader(false);
            handleSubscription(signature, type);
          }}
          title="Add signature"
          buttonName={"Apply changes"}
          useContext={false}
        />
      )}
      {displayDelegationModel && (
        <BaseModal
          displayModal={displayDelegationModel}
          onClose={() => {
            setDisplayCancelModel(true);
            setDisplayDelegationModel(false);
          }}
          secondButtonName="Save"
          firstButtonName="Close"
          onConfirm={handleUpdateDelegatePowers}
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
        </BaseModal>
      )}
      {displayCancelModel && (
        <BaseModal
          displayModal={displayCancelModel}
          firstButtonName="ok"
          hideSecondButton
          onClose={() => {
            handleClose();
            setDisplayCancelModel(false);
          }}
        >
          <p className="text_center">
            Your notices will not be sent automatically. Visit the notices pages
            to send manually.
          </p>
        </BaseModal>
      )}
      {openPlanModal && (
        <BaseModal
          displayModal={openPlanModal}
          onClose={async (triggered: any) => {
            if (triggered) {
              setOpenPlanModal(false);
            }
          }}
          title={modalHeading}
          secondButtonName="Upgrade Now"
          firstButtonName="Close"
          onConfirm={() => {
            handleConfirm();
            return true;
          }}
          restrictOncloseFunctionInHeader
          onHeaderIconClose={() => {
            setOpenPlanModal(false);
          }}
        >
          <h4 className="text_center">{modalBodyContent}</h4>
        </BaseModal>
      )}
    </div>
  );
}
