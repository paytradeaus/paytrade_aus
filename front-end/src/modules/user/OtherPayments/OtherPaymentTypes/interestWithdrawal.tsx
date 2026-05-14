"use client";
import React, { useCallback, useEffect, useState } from "react";
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
  GetPaymentAttachments,
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
import { multipleFileUploadApi } from "@/network/apolloClient";
import BaseModal from "@/components/BaseModal";
import { checkBoxConfirmationMessage } from "../otherPayments.constants";
import FormikControl from "@/components/FormikControl";
import {
  buttonType,
  DateFormat,
  InputType,
  NUMBER_REGEX,
  quickAddRoutes,
} from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import { AppRoutes } from "@/shared/constant/appRoutes";
import ShowMatchTxnTable from "../showingMatchTransactions";
import ShowPaymentTxnTable from "../showingPaymentTransactions";
import { ApiResponse } from "@/shared/constant/messages";

const InterestWithdrawalForm = (props: any) => {
  const queryParams = useSearchParams();
  const {
    isEdit,
    handleAddPayment,
    trustAccountList,
    data,
    isView,
    fromMatchScreen,
    fromMatchScreenBankID,
    paymentType,
  } = props;
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  const router = useRouter();
  const { setLoader }: any = useLoaderContext();

  const [fromSelectedValue, setFromSelectedValue] = useState<any>("");

  const [toSelectedValue, setToSelectedValue] = useState("");
  const [cashAccountList, setCashAccountList] = useState<any>([]);
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [openModal, setOpenModal] = useState(false);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);
  const [accountError, setAccountError] = useState<any>();

  const validationSchema = Yup.object().shape({
    fromAccount: Yup.number().required("Payment from account is required"),
    toAccount: Yup.number().required("Payment to account is required"),
    bsb: Yup.number().required("BSB is required"),
    accountNumber: Yup.number().required("Account number amount is required"),
    paymentAmount: Yup.string().required("Payment amount is required"),
    paymentDate: Yup.string()
      .required("Payment date is required")
      .test(
        "payment Date",
        "Payment Date must be greater then bank account opening Date",
        function (value) {
          if (fromSelectedValue?.value) {
            let dataCon = new Date(fromSelectedValue?.data?.opening_date);
            return new Date(value) > dataCon;
          } else {
            return true;
          }
        }
      ),
    confirmPaid: Yup.boolean(),
  });

  useEffect(() => {
    if (
      retrieveAfterAddingQuickRecord ==
      quickAddRoutes.RETRIEVE_INTEREST_AND_CHARGES
    ) {
      getStoredFormData();
    }
  }, []);

  useEffect(() => {
    const bankIDFrom = queryParams?.get("bid");
    if (bankIDFrom) {
      try {
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        if (accountList?.data?.account_type !== "Cash Account") {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
        } else {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
          showErrorToast(
            "From account cannot be added against the General account"
          );
          setAccountError(
            "From account cannot be added against the General account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [queryParams]);

  useEffect(() => {
    const bankIDFrom = fromMatchScreen ? fromMatchScreenBankID : null;
    if (bankIDFrom) {
      try {
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};

        if (accountList?.data?.account_type !== "Cash Account") {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);
        } else {
          formik.setFieldValue("fromAccount", bankIDFrom);
          setFromSelectedValue(accountList);

          setAccountError(
            "From account cannot be added against the General account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [fromMatchScreen, fromMatchScreenBankID]);

  useEffect(() => {
    if (trustAccountList && data?.payment_id) {
      let fAccountList =
        trustAccountList.find(
          (each: any) => each?.value === data?.payment_from_account?.toString()
        ) || {};
      setFromSelectedValue(fAccountList);

      let tAccountList =
        trustAccountList.find(
          (each: any) => each?.value === data?.payment_to_account?.toString()
        ) || {};
      setToSelectedValue(tAccountList);
      formik.setValues({
        fromAccount: data ? String(data?.payment_from_account) : "",
        toAccount: data ? String(data?.payment_to_account) : "",
        bsb: tAccountList?.data?.bsb_number || "",
        accountNumber: tAccountList?.data?.account_number || "",
        paymentAmount: data?.payment_amount
          ? formatDollars(data?.payment_amount.toFixed(2).toString())
          : "",
        paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
        confirmPaid: data ? data?.is_paid_confirmed : false,
      });
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
  }, [data, isEdit, isView, trustAccountList]);

  useEffect(() => {
    if (trustAccountList) {
      const filteredValue = trustAccountList?.filter(
        (d: any) => d?.data?.account_type === "Cash Account"
      );
      setCashAccountList(filteredValue);
    }
  }, [trustAccountList]);

  const formik = useFormik({
    initialValues: {
      fromAccount: data ? String(data?.payment_from_account) : "",
      toAccount: data ? String(data?.payment_to_account) : "",
      bsb: "",
      accountNumber: "",
      paymentAmount: "",
      paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
      confirmPaid: data ? data?.is_paid_confirmed : false,

      // Add other form fields here
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      if (accountError) return;
      setLoader(true);
      // Handle form submission
      const companyId = Number(localStorage.getItem("companyId"));
      const paymentValues = removeCommas(values?.paymentAmount);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const payload: any = {
        company_id: companyId,
        payment_type: "Interest Withdrawal",
        payment_to_account: Number(values?.toAccount),
        payment_from_account: Number(values?.fromAccount),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: values?.paymentDate || null,
        input_date: new Date().toISOString(),
        is_paid_confirmed: values?.confirmPaid,
      };
      try {
        if (!isEdit) {
          await handleAddPayment(payload);
        } else {
          if (formik.values.confirmPaid === data?.is_paid_confirmed) {
            showInfoToast("No changes to save");
            return;
          }
          await handleUpdatePayment(values?.confirmPaid);
        }
      } catch (error) {
        console.error("Error handling form submission:", error);
      } finally {
        // Stop loading
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
  const handleAmountChange = useCallback((e: any) => {
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
  }, []);

  const handleUpdatePayment = async (status: any) => {
    try {
      const payload = {
        is_paid_confirmed: status,
        is_received_confirmed: false,
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
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_from_account}`
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
  const handleSelectToAccount = (selectedOption: any) => {
    formik.handleChange("toAccount")(selectedOption?.value || "");
    formik.setFieldValue("bsb", selectedOption?.data?.bsb_number || "");
    setToSelectedValue(selectedOption);
    formik.setFieldValue(
      "accountNumber",
      selectedOption?.data?.account_number || ""
    );
  };

  const handleBack = () => {
    if (fromMatchScreen) {
      showInfoToast("No changes saved");
      return;
    }
    if (
      isEdit &&
      actionsBtnData?.edit &&
      formik.values.confirmPaid !== data?.is_paid_confirmed
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
      formik.setFieldValue("confirmPaid", value);
    }
  }
  function handleConfirmCheck() {
    formik.setFieldValue("confirmPaid", true);
    setOpenModal(false);
  }

  async function handleAddQuickRecord(route: string) {
    const postData = {
      ...formik?.values,
      bid: queryParams?.get("bid"),
      accountType: paymentType,
      fromAccount: fromSelectedValue,
      quickAddFromInterestAndCharges: true,
    };

    try {
      const res = await fetch("/api/route-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const data = await res.json();

      if (data?.status == ApiResponse.SUCCESS) {
        router.push(route);
      }
    } catch {}
  }

  async function getStoredFormData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        const formData = result?.data;

        if (formData?.quickAddFromInterestAndCharges) {
          formik.setValues({
            fromAccount: formData?.fromAccount ? formData?.fromAccount : "",
            toAccount: formData?.toAccount ? formData?.toAccount : "",
            bsb: formData?.bsb ? formData?.bsb : "",
            accountNumber: formData?.accountNumber
              ? formData?.accountNumber
              : "",
            paymentAmount: formData?.paymentAmount
              ? formData?.paymentAmount
              : "",
            paymentDate: formData?.paymentDate ? formData?.paymentDate : "",
            confirmPaid: formData?.confirmPaid ? formData?.confirmPaid : false,
          });
          setFromSelectedValue(formData?.fromAccount);
        }
      }
    } catch {}
  }

  return (
    <>
      <div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Account Type"
            name="Payment From Account"
            label="Payment From Account"
            secondLabel={data?.payment_id ? "" : "Add account"}
            onSecondLabelClick={() =>
              handleAddQuickRecord(
                `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.BANK_ACCOUNT}`
              )
            }
            onChange={(selectedOption: any) => {
              formik.handleChange("fromAccount")(selectedOption?.value || "");
              setFromSelectedValue(selectedOption);

              if (selectedOption?.data?.account_type !== "Cash Account") {
                setAccountError(null);
              } else {
                setAccountError(
                  "From account cannot be added against the General account"
                );
              }
            }}
            disabled={
              data?.payment_id || screenDetails?.fromScreen === "bankOverView"
            }
            selectedData={fromSelectedValue}
            options={trustAccountList}
            isRequired={
              !formik.values.fromAccount && formik.touched.fromAccount
                ? true
                : false
            }
            errorMessage={formik.errors.fromAccount}
            renderKey="label"
            valueKey="value"
            required
          />
          {accountError && !formik.errors.fromAccount && (
            <small className="invalid mt_0_5">
              <i className="fa-light fa-circle-xmark"></i>
              {accountError}
            </small>
          )}
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            secondLabel={data?.payment_id ? "" : "Add account"}
            onSecondLabelClick={() =>
              handleAddQuickRecord(
                `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.BANK_ACCOUNT}`
              )
            }
            placeholder="Select Account Type"
            name="Payment To Account"
            label="Payment To Account"
            onChange={(selectedOption: any) => {
              handleSelectToAccount(selectedOption);
            }}
            disabled={data?.payment_id}
            selectedData={toSelectedValue}
            options={cashAccountList}
            isRequired={
              !formik.values.toAccount && formik.touched.toAccount
                ? true
                : false
            }
            errorMessage={formik.errors.toAccount}
            renderKey="label"
            valueKey="value"
            required
          />
          {accountError && !formik.errors.toAccount && (
            <small className="invalid mt_0_5">
              <i className="fa-light fa-circle-xmark"></i>
              {accountError}
            </small>
          )}
        </div>
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"BSB Number"}
          name={"BsbNumber"}
          placeholder="BSB Number"
          error={formik.errors?.bsb}
          // maxLength={11}
          showError={formik.touched.bsb && formik.errors.bsb}
          disabled={true}
          required
          onChange={(e: any) => {
            let number = e?.target?.value.trim();
            if (NUMBER_REGEX.test(number) || number === "") {
              formik.setFieldValue("bsb", number);
            }
          }}
          onBlur={formik.handleBlur("bsb")}
          value={formik.values?.bsb}
        />
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"Account Number"}
          name={"Account Number"}
          placeholder="Account Number"
          error={formik.errors?.accountNumber}
          // maxLength={11}
          showError={
            formik.touched.accountNumber && formik.errors.accountNumber
          }
          disabled={true}
          required
          onChange={(e: any) => {
            let number = e?.target?.value.trim();
            if (NUMBER_REGEX.test(number) || number === "") {
              formik.setFieldValue("accountNumber", number);
            }
          }}
          onBlur={formik.handleBlur("accountNumber")}
          value={formik.values?.accountNumber}
        />
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
            fromSelectedValue?.data?.opening_date
              ? formatDate(
                  fromSelectedValue?.data?.opening_date,
                  DateFormat.YYYY_MM_DD
                )
              : ""
          }
          disabled={data?.payment_id ? true : false}
          maxDate={formatDate(new Date(), DateFormat.YYYY_MM_DD)}
        />

        <FormikControl
          // required
          id={"confirmPaid"}
          // label={"Confirm - Paid"}
          name={"confirmPaid"}
          control={InputType.CHECKBOX}
          options={[
            {
              value: Boolean(formik.values.confirmPaid),
              label: "Confirm - Paid",
            },
          ]}
          disabled={isView || (isEdit && !actionsBtnData?.edit)}
          selectedValue={formik.values.confirmPaid || "false"}
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
            {`${checkBoxConfirmationMessage} Paid?`}{" "}
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

export default InterestWithdrawalForm;
