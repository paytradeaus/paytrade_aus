"use client";
import React, { useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";

import { useRouter, useSearchParams } from "next/navigation";

import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

import { useLoaderContext } from "@/context/useLoader";

import { useFormik } from "formik";

import { showErrorToast, showInfoToast } from "@/components/Toaster";
import {
  DeletePayments,
  UpdateInterestChargesPaymentStatus,
} from "../otherPayments.functions";
import { useTokenDetails } from "@/hooks";
import {
  dateStringToUtcConversion,
  formatDate,
  formatDollars,
  getDatePickerFormat,
  removeCommas,
} from "@/utils";
import { getListActionButtons } from "@/app/api/commonApi";
import BaseModal from "@/components/BaseModal";
import { checkBoxConfirmationMessage } from "../otherPayments.constants";
import FormikControl from "@/components/FormikControl";
import { buttonType, DateFormat, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import { AppRoutes } from "@/shared/constant/appRoutes";
import ShowMatchTxnTable from "../showingMatchTransactions";
import ShowPaymentTxnTable from "../showingPaymentTransactions";

const BankChargeTopUpForm = (props: any) => {
  const queryParams = useSearchParams();
  const {
    isEdit,
    handleAddPayment,
    trustAccountList,
    data,
    isView,
    fromMatchScreen,
    fromMatchScreenBankID,
  } = props;
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const router = useRouter();
  const { setLoader }: any = useLoaderContext();

  const [selectedValue, setSelectedValue] = useState<any>("");
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [openModal, setOpenModal] = useState(false);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);

  const validationSchema = Yup.object().shape({
    accountId: Yup.number().required("Account is required"),
    paymentAmount: Yup.string().required("Payment amount is required"),
    paymentDate: Yup.string()
      .required("Payment date is required")
      .test(
        "payment Date",
        "Payment Date must be greater then bank account opening Date",
        function (value) {
          if (selectedValue?.value) {
            let dataCon = new Date(selectedValue?.data?.opening_date);
            return new Date(value) > dataCon;
          } else {
            return true;
          }
        }
      ),
    // memo: Yup.string(),
    confirmReceived: Yup.boolean(),
  });

  useEffect(() => {
    const bankIDFrom = queryParams?.get("bid");
    if (bankIDFrom) {
      try {
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        setSelectedValue(accountList);
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [queryParams]);

  useEffect(() => {
    const bankIDFrom = fromMatchScreen ? fromMatchScreenBankID : null;
    if (bankIDFrom) {
      try {
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        setSelectedValue(accountList);
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [fromMatchScreen, fromMatchScreenBankID]);

  useEffect(() => {
    if (trustAccountList && data?.payment_id) {
      formik.setValues({
        accountId: data ? String(data?.payment_to_account) : "",
        paymentAmount: data?.payment_amount
          ? formatDollars(data?.payment_amount.toFixed(2).toString())
          : "",
        paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
        // memo: data ? String(data?.memo) : "",
        confirmReceived: data ? data?.is_received_confirmed : false,
      });
      let accountList = trustAccountList?.find(
        (each: any) => each?.value == data?.payment_to_account?.toString()
      ) || {
        label: data?.payment_to_account?.toString(),
        value: data?.payment_to_account?.toString(),
      };
      setSelectedValue(accountList);
      // payment_overview_buttons;
      (async () => {
        const Payload = {
          payment_id: data?.payment_id,
        };
        const response = await getListActionButtons(Payload);

        if (response && response?.payment_overview_buttons) {
          setActionsBtnData(response?.payment_overview_buttons);
        } else {
          setActionsBtnData({});
        }
      })();
    }
  }, [data, isEdit, trustAccountList]);

  const handleSelectChange = (selectedValue: any) => {
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const formik = useFormik({
    initialValues: {
      accountId: data ? String(data?.payment_to_account) : "",
      paymentAmount: "",
      paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
      // memo: data ? String(data?.memo) : "",
      confirmReceived: data ? data?.is_received_confirmed : false,

      // Add other form fields here
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoader(true);
      // Handle form submission
      const companyId = Number(localStorage.getItem("companyId"));
      const paymentValues = removeCommas(values?.paymentAmount);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const payload: any = {
        company_id: companyId,
        payment_type: "Bank Charge Top Up",
        payment_to_account: Number(values?.accountId),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: dateStringToUtcConversion(values?.paymentDate),
        // memo: values?.memo,
        is_received_confirmed: values?.confirmReceived,
      };
      try {
        let paymentResponse;
        if (!isEdit) {
          paymentResponse = await handleAddPayment(payload);
        } else {
          if (formik.values.confirmReceived === data?.is_received_confirmed) {
            showInfoToast("No changes to save");
            return;
          }
          paymentResponse = await handleUpdatePayment(values?.confirmReceived);
        }
      } catch (error) {
        console.error("Error handling form submission:", error);
      } finally {
        setLoader(false);
      }
    },
  });
  const handleDeleteInterestCharges = async () => {
    try {
      setDeleteDisabled(true);
      const payload = {
        payment_id: data?.payment_id,
        status: "Deleted",
      };
      const response = await DeletePayments(payload);
      if (response) {
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
            selectTab: "archivedAccounts",
          })
        );

        // need to change once overview done
        router.back();

        // const companyId = Number(localStorage.getItem("companyId"));
        // router.push(
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_to_account}`
        // );
      }
      setInterestOpenModal(false);
    } catch (error: any) {
      console.log(error);
    }
  };
  const onDeleteClick = () => {
    setDeleteDisabled(false);
    setInterestOpenModal(!interestOpenModal);
    setPopupMessage((prev) => ({
      headerMsg: "",
      subHeaderMsg: "Are you sure you wish to delete this payment?",
    }));
  };

  // Main function to handle contract value formatting
  const handleAmountChange = (e: any) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$ ") {
      formik.setFieldValue("paymentAmount", "");
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
    formik.setFieldValue("paymentAmount", formattedValue);
  };

  const handleUpdatePayment = async (status: any) => {
    try {
      const payload = {
        is_paid_confirmed: false,
        is_received_confirmed: status,
        payment_id: data?.payment_id,
        is_retention_confirmed: false,
      };
      const response = await UpdateInterestChargesPaymentStatus(payload);
      if (response) {
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
          })
        );
        // need to change once overview done
        router.back();
        // const companyId = Number(localStorage.getItem("companyId"));
        // router.push(
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_to_account}`
        // );
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleBackWithReduxSet = () => {
    if (!isView && !isEdit) {
      showInfoToast("No changes saved");
    }
    dispatch(
      setScreenDetails({
        ...screenDetails,
        fromScreen: "addInterest",
        toScreen: "bankOverView",
        mainActiveTab: "Interest and Charges",
      })
    );
    router.back();
  };

  const handleBack = () => {
    if (fromMatchScreen) {
      showInfoToast("No changes saved");
      return;
    }
    if (
      isEdit &&
      actionsBtnData?.edit &&
      formik.values.confirmReceived !== data?.is_received_confirmed
    ) {
      setDisplayOnCancel(true);
      return;
    }
    handleBackWithReduxSet();
  };

  function onConfirmPaidChange(value: boolean) {
    if (value) {
      setOpenModal(true);
    } else {
      formik.setFieldValue("confirmReceived", value);
    }
  }
  function handleConfirmCheck() {
    formik.setFieldValue("confirmReceived", true);
    setOpenModal(false);
  }
  return (
    <>
      <div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Account Type"
            name="other payments"
            label="Account"
            onChange={(selectedOption: any) => {
              formik.handleChange("accountId")(selectedOption?.value || "");
              handleSelectChange(selectedOption);
            }}
            disabled={
              data?.payment_id || screenDetails?.fromScreen === "bankOverView"
            }
            selectedData={selectedValue}
            options={trustAccountList}
            isRequired={
              !formik.values.accountId && formik.touched.accountId
                ? true
                : false
            }
            errorMessage={formik.errors.accountId}
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"Payment Amount"}
          error={formik?.errors?.paymentAmount}
          name="paymentAmount"
          id={"paymentAmount"}
          placeholder="Enter payment Amount"
          disabled={data?.payment_id ? true : false}
          value={formik?.values?.paymentAmount || ""}
          onChange={handleAmountChange}
          onBlur={formik.handleBlur}
          showError={
            formik.touched.paymentAmount && formik.errors.paymentAmount
          }
          required
        />
        <FormikControl
          control={InputType.DATE_PICKER}
          label={"Payment Date"}
          name={"paymentDate"}
          id={"paymentDate"}
          error={formik.errors.paymentDate}
          showError={formik.touched.paymentDate && formik.errors.paymentDate}
          required
          onChange={(selectedDateValue: any) => {
            formik.setFieldValue("paymentDate", selectedDateValue);
          }}
          onBlur={formik.handleBlur("paymentDate")}
          value={formik.values.paymentDate}
          minDate={
            selectedValue?.data?.opening_date
              ? formatDate(
                  selectedValue?.data?.opening_date,
                  DateFormat.YYYY_MM_DD
                )
              : ""
          }
          disabled={data?.payment_id ? true : false}
          maxDate={formatDate(new Date(), DateFormat.YYYY_MM_DD)}
        />

        <FormikControl
          // required
          id={"confirmReceived"}
          // label={"Confirm - Received"}
          name={"confirmReceived"}
          control={InputType.CHECKBOX}
          options={[
            {
              value: Boolean(formik.values.confirmReceived),
              label: "Confirm - Received",
            },
          ]}
          disabled={isView || (isEdit && !actionsBtnData?.edit)}
          selectedValue={formik.values.confirmReceived || "false"}
          onChange={(e: any) => onConfirmPaidChange(e?.target?.checked)}
        />

        {(isView || isEdit) && (
          <div className="pt_expandtable" style={{ marginTop: "0.8rem" }}>
            <details>
              <summary>History </summary>

              <h4>Matched Transactions</h4>
              <ShowMatchTxnTable paymentId={data?.payment_id} />
              <br />
              <h4>Payment Transactions</h4>
              <ShowPaymentTxnTable paymentId={data?.payment_id} />
              <br />
            </details>
          </div>
        )}

        <br />
        {fromMatchScreen ? (
          <footer style={{ textAlign: "right" }}>
            <button
              type="submit"
              className="secondary"
              style={{ width: "auto" }}
              data-target="addpayment"
              onClick={() => {
                formik?.handleSubmit();
              }}
            >
              Add
            </button>
          </footer>
        ) : (
          <div className="grid">
            <CustomButton
              buttonName={"Cancel"}
              buttonType={buttonType.OUTLINE_CONTRAST}
              actionType="button"
              onClick={() => handleBack()}
              inputButton
            />

            {(isView || isEdit) && actionsBtnData?.delete && (
              <CustomButton
                buttonName={"Delete"}
                buttonType={buttonType.PRIMARY}
                actionType="button"
                onClick={() => onDeleteClick()}
                inputButton
              />
            )}
            {isView && actionsBtnData?.edit && (
              <CustomButton
                buttonName={"Edit"}
                buttonType={buttonType.SECONDARY}
                actionType="button"
                onClick={() => {
                  dispatch(
                    setScreenDetails({
                      fromScreen: "bankOverView",
                      toScreen: "Interest and Charges",
                      mainActiveTab: "",
                      selectTab: "",
                      subSelectTab: "",
                    })
                  );
                  router.push(
                    `${AppRoutes.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${data?.payment_id}`
                  );
                }}
                inputButton
              />
            )}
            {((!isView && isEdit && actionsBtnData?.edit) ||
              (!isView && !isEdit)) && (
              <CustomButton
                buttonName={isEdit ? "Update" : "Save"}
                buttonType={buttonType.SECONDARY}
                actionType="submit"
                onClick={() => {
                  formik?.handleSubmit();
                }}
                inputButton
              />
            )}
          </div>
        )}
      </div>
      {interestOpenModal && (
        <BaseModal
          modalId={"Delete type"}
          title={popupMessage?.headerMsg || ""}
          displayModal={interestOpenModal}
          onClose={() => setInterestOpenModal(false)}
          // onHeaderIconClose={() => setInterestOpenModal(false)}
          onConfirm={() => {
            handleDeleteInterestCharges();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
          disableSecondButton={deleteDisabled}
          // restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">{popupMessage?.subHeaderMsg || ""}</h4>
        </BaseModal>
      )}
      {openModal && (
        <BaseModal
          modalId={"checkbox status popup"}
          displayModal={openModal}
          onHeaderIconClose={() => setOpenModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            handleConfirmCheck();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {`${checkBoxConfirmationMessage} Received?`}{" "}
          </h4>
        </BaseModal>
      )}

      {displayOnCancel && (
        <BaseModal
          modalId={"Display cancel popup"}
          displayModal={displayOnCancel}
          onHeaderIconClose={() => setDisplayOnCancel(false)}
          restrictOncloseFunctionInHeader
          onClose={() => {
            setDisplayOnCancel(false);
            handleBackWithReduxSet();
          }}
          onConfirm={() => {
            setDisplayOnCancel(false);
            formik?.handleSubmit();
            return true;
          }}
          firstButtonName="Yes"
          secondButtonName="Save"
        >
          <h4 className="text_center">
            {"Are you sure to close and not save?"}
          </h4>
        </BaseModal>
      )}
    </>
  );
};

export default BankChargeTopUpForm;
