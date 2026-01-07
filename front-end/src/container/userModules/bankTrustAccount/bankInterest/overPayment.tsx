"use client";
import React, { useCallback, useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import TextField from "@/components/TextField/textField";
import styles from "./otherPayment.module.scss";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Col, Form, Row } from "react-bootstrap";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR_ONLY,
} from "@/common/constants/general";
import * as Yup from "yup";
import { useFormik } from "formik";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import CheckBox from "@/components/CheckBox/checkBox";
import {
  GetClientSupplierList,
  GetProjectList,
  UpdateInterestChargesPaymentStatus,
} from "./bankInterest.function";
import { useLoaderContext } from "@/context/useLoader";
import { AppModal } from "@/components/model/model";
import { DeletePayments } from "../backTrustAccount.functions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { getListActionButtons } from "@/app/api/commonAPIs";
import ShowMatchTxnTable from "./showingMatchTransactions";
import { toast } from "@/app/Toaster";
import { checkBoxConfirmationMessage } from "../../payApps/payments/payments.constant";
import { formatDollars, removeCommas } from "@/common/commonFunctions";
const OverPaymentForm = (props: any) => {
  const queryParams = useSearchParams();
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
  const validationSchema = Yup.object().shape({
    clientSupplier: Yup.number().required("Supplier is required"),
    accountId: Yup.number().required("Payment to account is required"),
    project: Yup.number().required("Project is required"),
    // accountNumber: Yup.number().required("Account Number amount is required"),
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

  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const {
    isEdit,
    handleAddPayment,
    trustAccountList,
    data,
    isView,
    fromMatchScreen,
    setIsShowAddOtherPayments,
    fromMatchScreenBankID,
  } = props;

  const [selectedValue, setSelectedValue] = useState<any>("");
  const [projectSelectedValue, setProjectSelectedValue] = useState<any>();
  const [supplierSelectedValue, setSupplierSelectedValue] = useState<any>();
  const [projectListData, setProjectListData] = useState<any>();
  const [supplierListData, setSupplierListData] = useState<any>();
  const [projectId, setProjectId] = useState<any>();

  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [accountError, setAccountError] = useState<any>();
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const bankIDFrom = queryParams?.get("bid");
    if (bankIDFrom) {
      try {
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        // setSelectedValue(accountList);
        if (accountList?.data?.account_type !== "Retention Trust Account") {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
        } else {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
          toast.error(
            "Overpayment Refund cannot be added against the Retention Trust Account"
          );
          setAccountError(
            "Overpayment Refund cannot be added against the Retention Trust Account"
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
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        // setSelectedValue(accountList);
        if (accountList?.data?.account_type !== "Retention Trust Account") {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
        } else {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
          toast.error(
            "Overpayment Refund cannot be added against the Retention Trust Account"
          );
          setAccountError(
            "Overpayment Refund cannot be added against the Retention Trust Account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [fromMatchScreen, fromMatchScreenBankID]);

  useEffect(() => {
    handleGetProjectList();
  }, []);

  useEffect(() => {
    if (projectId) {
      handleGetSupplierList();
    }
  }, [projectId]);

  useEffect(() => {
    if (data) {
      setProjectId(data?.project_id);
    }
  }, [data]);
  useEffect(() => {
    if (
      trustAccountList &&
      data?.payment_id &&
      supplierListData &&
      projectListData
    ) {
      let supplierList =
        supplierListData.find(
          (each: any) => each?.value === data?.client_supplier_id?.toString()
        ) || {};
      setSupplierSelectedValue(supplierList);

      let projectList =
        projectListData.find(
          (each: any) => each?.value === data?.project_id?.toString()
        ) || {};
      setProjectSelectedValue(projectList);

      let accountList =
        trustAccountList.find(
          (each: any) => each?.value === data?.payment_to_account?.toString()
        ) || {};
      setSelectedValue(accountList);

      formik.setValues({
        clientSupplier: data ? String(data?.client_supplier_id) : "",
        project: data ? String(data?.project_id) : "",
        accountId: data ? String(data?.payment_to_account) : "",
        supplier: "",
        accountNumber: "",
        paymentAmount: data?.payment_amount
          ? formatDollars(data?.payment_amount.toFixed(2).toString())
          : "",
        paymentDate: data ? new Date(data?.payment_date) : "",
        memo: data ? String(data?.memo) : "",
        confirmReceived: data ? data?.is_received_confirmed : false,
      });
      (async () => {
        const Payload = {
          payment_id: data?.payment_id,
        };
        const response = await getListActionButtons(Payload);

        if (response && response?.payment_overview_buttons) {
          setActionsBtnData(response?.payment_overview_buttons);
        }
      })();
    }
  }, [data, isEdit, trustAccountList, supplierListData, projectListData, data]);

  const handleGetProjectList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));
      const payload = {
        companyId: companyId,
      };
      const response = await GetProjectList(companyId);

      if (response.length > 0) {
        const customProjectOption = response.map((data: any) => ({
          label: data.project_name,
          value: data.project_id.toString(),
          data: data,
        }));
        setProjectListData(customProjectOption);
      }
    } catch (error: any) {
      console.log(error);
    }
  };
  const handleGetSupplierList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));

      const payload = {
        company_id: companyId,
        project_id: data?.project_id || projectId || null,
      };

      const response = await GetClientSupplierList(payload);
      if (response?.client_suppliers_list.length > 0) {
        const customSupplierOption = response?.client_suppliers_list
          .filter((each: any) => each?.client_supplier_type === "Supplier")
          .map((data: any) => ({
            label: data.client_supplier_name,
            value: data.client_supplier_id.toString(),
            data: data,
          }));
        setSupplierListData(customSupplierOption);
      } else {
        setSupplierListData([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };
  const formik = useFormik({
    initialValues: {
      clientSupplier: data ? String(data?.client_supplier_id) : "",
      project: data ? String(data?.project_id) : "",
      accountId: data ? String(data?.payment_to_account) : "",
      supplier: "",
      accountNumber: "",
      paymentAmount: "",
      paymentDate: data ? new Date(data?.payment_date) : "",
      memo: data ? String(data?.memo) : "",
      confirmReceived: data ? data?.is_received_confirmed : false,
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
      const payload = {
        company_id: companyId,
        payment_type: "Overpayment Refund",
        payment_to_account: Number(values?.accountId),
        client_supplier_id: Number(values?.clientSupplier),
        project_id: Number(values?.project),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: values?.paymentDate,
        memo: values?.memo,
        is_received_confirmed: values?.confirmReceived,
      };
      try {
        if (!isEdit) {
          await handleAddPayment(payload);
        } else {
          await handleUpdatePayment(values?.confirmReceived);
        }
      } catch (error) {
        console.error("Error handling form submission:", error);
      } finally {
        // Stop loading
        setLoader(false);
      }
    },
  });

  const handleSelectChange = (selectedValue: any) => {
    setSelectedValue(selectedValue);
    if (selectedValue?.data?.account_type !== "Retention Trust Account") {
      setAccountError(null);
    } else {
      toast.error(
        "Overpayment Refund cannot be added against the Retention Trust Account"
      );
      setAccountError(
        "Overpayment Refund cannot be added against the Retention Trust Account"
      );
    }
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
        // router.back();
        const companyId = Number(localStorage.getItem("companyId"));
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_to_account}`
        );
      }
    } catch (error: any) {
      console.log(error);
    }
  };
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
        // router.back();
        const companyId = Number(localStorage.getItem("companyId"));
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_to_account}`
        );
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

  const handleBack = () => {
    if (fromMatchScreen) {
      setIsShowAddOtherPayments && setIsShowAddOtherPayments(false);
      return;
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
        <Form onSubmit={formik.handleSubmit}>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <SearchableSelect
                label="Account *"
                onChange={(selectedOption) => {
                  formik.handleChange("accountId")(selectedOption?.value || "");
                  handleSelectChange(selectedOption);
                }}
                disabled={
                  data?.payment_id ||
                  screenDetails?.fromScreen === "bankOverView"
                }
                selectedData={selectedValue}
                options={trustAccountList}
                isRequired={
                  !formik.values.accountId && formik.touched.accountId
                    ? true
                    : false
                }
                errorMessage={formik.errors.accountId}
              />
              {accountError && !formik.errors.accountId && (
                <div className={styles.errorContainer}>
                  <ExclamationTriangleFill className={styles.error} />
                  <span className={styles.errorTextStyles}>{accountError}</span>
                </div>
              )}
            </Col>
            <Col lg={4}></Col>
            <Col lg={4}></Col>
          </Row>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <SearchableSelect
                label="Project *"
                selectedData={projectSelectedValue}
                onChange={(selectedOption) => {
                  formik.handleChange("project")(selectedOption?.value || "");
                  formik.handleChange("clientSupplier")("");
                  setSupplierSelectedValue(null);
                  setProjectId(selectedOption?.data?.project_id);
                }}
                disabled={data?.payment_id}
                options={projectListData}
                isRequired={
                  !formik.values.project && formik.touched.project
                    ? true
                    : false
                }
                errorMessage={formik.errors.project}
              />
            </Col>
            <Col lg={4}></Col>
            <Col lg={4}></Col>
          </Row>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <SearchableSelect
                key={projectId}
                label="Supplier *"
                onChange={(selectedOption) => {
                  formik.handleChange("clientSupplier")(
                    selectedOption?.value || ""
                  );
                  setSupplierSelectedValue(selectedOption);
                }}
                selectedData={supplierSelectedValue}
                disabled={data?.payment_id || !projectId}
                options={supplierListData}
                isRequired={
                  !formik.values.clientSupplier && formik.touched.clientSupplier
                    ? true
                    : false
                }
                errorMessage={formik.errors.clientSupplier}
              />
            </Col>
            <Col lg={4}></Col>
            <Col lg={4}></Col>
          </Row>
          <Row className="w-100 mt-4">
            <Col lg={4}>
              <TextField
                type="text"
                labelText="Payment Amount *"
                name="paymentAmount"
                id="paymentAmount"
                className={styles.text}
                disabled={data?.payment_id}
                value={formik.values.paymentAmount}
                onChange={handleAmountChange}
                onBlur={formik.handleBlur}
                errorText={formik.errors.paymentAmount}
                isInvalid={
                  formik.touched.paymentAmount && formik.errors.paymentAmount
                    ? true
                    : false
                }
              />
            </Col>
            <Col lg={4}>
              <div>
                <CustomDatePicker
                  showIcon={true}
                  key={selectedValue?.data?.opening_date}
                  label="Payment Date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY"
                  selected={formik?.values?.paymentDate}
                  disabled={data?.payment_id}
                  value={formik?.values?.paymentDate}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue("paymentDate", selectedDate);
                  }}
                  format={DD_MM_YYYY}
                  minDate={
                    selectedValue?.data?.opening_date
                      ? new Date(new Date(selectedValue?.data?.opening_date))
                      : new Date()
                  }
                  maxDate={new Date()}
                  className={
                    formik.touched.paymentDate && formik.errors.paymentDate
                      ? `${styles.DatePickerCustomStyles} ${styles.datePickerError}`
                      : styles.DatePickerCustomStyles
                  }
                />
                {formik.touched.paymentDate && formik.errors.paymentDate && (
                  <div className={styles.errorContainer}>
                    <ExclamationTriangleFill className={styles.error} />
                    <span className={styles.errorTextStyles}>
                      {formik.errors.paymentDate}
                    </span>
                  </div>
                )}
              </div>
            </Col>
            <Col lg={4}>
              <div className={styles.confirmation}>
                <CheckBox
                  label="Confirm - Received"
                  id="confirmReceived"
                  className={styles.checkBoxHeights}
                  disabled={isView}
                  checked={formik.values.confirmReceived}
                  // onChange={(e) => {
                  //   formik.setFieldValue("confirmReceived", e.target.checked);
                  // }}
                  onChange={(e: any) => onConfirmPaidChange(e?.target?.checked)}
                />
              </div>
            </Col>
          </Row>
          <div className="w-50 mt-5">
            <TextField
              as="textarea"
              type="text"
              labelText="Memo "
              name="memo"
              id="memo"
              maxLength={250}
              disabled={data?.payment_id}
              value={formik.values.memo}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              endingDataStyles={styles.endIconStyle}
              classNames={styles.inputFieldControl2}
              errorText={formik.errors.memo}
              isInvalid={
                formik.touched.memo && formik.errors.memo ? true : false
              }
            />
          </div>
          {(isView || isEdit) && (
            <ShowMatchTxnTable paymentId={data?.payment_id} />
          )}
          <Row className="mt-5">
            <Col lg={6} md={6} sm={12} xs={12}>
              <Button
                onClick={() => handleBack()}
                className={styles.cancelStyle}
              >
                Cancel
              </Button>
            </Col>

            <Col lg={6} md={6} sm={12} xs={12} className={styles.saveStyles}>
              {(isView || isEdit) && actionsBtnData?.delete && (
                <Button
                  onClick={() => onDeleteClick()}
                  className={styles.deleteButton}
                >
                  Delete
                </Button>
              )}
              {isView && actionsBtnData?.edit && (
                <Button
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
                      `${ApplicationURLS.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${data?.payment_id}`
                    );
                  }}
                  className={styles.buttonStyles}
                >
                  Edit
                </Button>
              )}
              {!isView && (
                <Button type="submit" className={styles.buttonStyles}>
                  {isEdit ? "Update" : "Save"}
                </Button>
              )}
            </Col>
          </Row>
        </Form>
      </div>
      <AppModal
        show={interestOpenModal}
        onHide={() => setInterestOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        disabled={deleteDisabled}
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleDeleteInterestCharges();
        }}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={""}
        modalBodyContent={`${checkBoxConfirmationMessage} Received?`}
        onConfirm={() => {
          handleConfirmCheck();
        }}
      />
    </>
  );
};

export default OverPaymentForm;
