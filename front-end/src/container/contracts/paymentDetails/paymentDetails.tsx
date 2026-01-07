"use client";

import React, { Fragment, useEffect, useState } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import styles from "./paymentDetails.module.scss";
import FormButton from "@/components/Button/button";
import { useRouter } from "next/navigation";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { RootState, useAppSelector } from "@/redux/store";
import { getBankAccountLists } from "../contracts.functions";
import { setPaymentDeatils } from "@/redux/slices/contractPaymentDetails";
import { toast } from "react-toastify";

const PaymentDetailsPage = (props: any) => {
  const {
    setViewPages,
    viewPages,
    setPaymentData,
    contractType,
    paymentDetails,
    selectedProjectId,
    selectedClientSuplierID,
    paymentData,
    isEdit,
    SetNoticeEligible,
  } = props;
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [paymentToSelectedData, setPaymentToSelectedData] = useState<any>({});
  const [paymentFromSelectedData, setPaymentFromSelectedData] = useState<any>(
    {}
  );
  const [retentioinFromSelectedData, setRetentioinFromSelectedData] =
    useState<any>({});
  const [paymentToAccounts, setPaymentToAccounts] = useState<any[]>([]);
  const [paymentFromAccounts, setPaymentFromAccounts] = useState<any[]>([]);
  const [retentionFromAccounts, setRetentionFromAccounts] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const addContractDetails: any = useAppSelector(
    (state: RootState) => state.dashBoard.addContractDetails
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const companyId = Number(localStorage.getItem("companyId"));
        let payload: any = {
          company_id: companyId || "",
          type: contractType || "", // Assuming type can be either "Client" or "Supplier"
          project_id: selectedProjectId || "",
          client_supplier_id: selectedClientSuplierID || null,
          retention_type: props.RetentionType || "",
          client_supplier_role: props?.ClientSupplierRole || "",
        };
        const response: any = await getBankAccountLists(payload);
        if (response) {
          setPaymentToAccounts(response?.payment_to_account || []);
          setPaymentFromAccounts(response?.payment_from_account || []);
          setRetentionFromAccounts(response?.retention_from_account || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (Object.keys(paymentData).length > 0) {
      formik.setValues({
        PaymentFromAccount: paymentData?.PaymentFromAccount || null,
        RetentionFromAccount: paymentData?.RetentionFromAccount || null,
        PaymentToAccount: paymentData?.PaymentToAccount || null,
      });

      let paymentFromAccountsOpt =
        paymentFromAccounts?.find(
          (each) =>
            each?.bank_account_id === paymentData?.PaymentFromAccount ||
            addContractDetails?.PaymentDetails?.PaymentFromAccount
        ) || {};

      let retentionFromAccountsOpt =
        retentionFromAccounts?.find(
          (each) =>
            each?.bank_account_id === paymentData?.RetentionFromAccount ||
            addContractDetails?.PaymentDetails?.RetentionFromAccount
        ) || {};

      let paymentToAccountsOpt =
        paymentToAccounts?.find(
          (each) =>
            each?.bank_account_id === paymentData?.PaymentToAccount ||
            addContractDetails?.PaymentDetails?.PaymentToAccount
        ) || {};

      if (paymentToAccountsOpt?.bank_account_id) {
        setPaymentToSelectedData({
          label: paymentToAccountsOpt?.account_name,
          value: paymentToAccountsOpt?.bank_account_id,
          type: paymentToAccountsOpt?.account_type,
        });
      }

      if (retentionFromAccountsOpt?.bank_account_id) {
        setRetentioinFromSelectedData({
          label: retentionFromAccountsOpt?.account_name,
          value: retentionFromAccountsOpt?.bank_account_id,
          type: retentionFromAccountsOpt?.account_type,
        });
      }

      if (paymentFromAccountsOpt?.bank_account_id) {
        setPaymentFromSelectedData({
          label: paymentFromAccountsOpt?.account_name,
          value: paymentFromAccountsOpt?.bank_account_id,
          type: paymentFromAccountsOpt?.account_type,
        });
      }
      setTimeKey(new Date().getTime());
    }
  }, [
    paymentData,
    paymentFromAccounts,
    paymentToAccounts,
    retentionFromAccounts,
    addContractDetails,
  ]);

  const validationSchema = Yup.lazy((values) => {
    return Yup.object().shape({
      ...(contractType === "Supplier" && {
        PaymentFromAccount: Yup.string().required(
          "Payment from account is required"
        ),
        ...(props.RetentionType === "Cash" && {
          RetentionFromAccount: Yup.string().required(
            "Retention from account is required"
          ),
        }),
      }),
      PaymentToAccount: Yup.string().required("Payment to account is required"),
    });
  });

  const formik: any = useFormik({
    initialValues: {
      PaymentToAccount: paymentData?.PaymentToAccount || null,
      PaymentFromAccount: paymentData?.PaymentFromAccount || null,
      RetentionFromAccount: paymentData?.RetentionFromAccount || null,
    },
    validationSchema,
    onSubmit: (values: any) => {
      const RTA = "Retention Trust Account";
      const PTA = "Project Trust Account";
      if (
        paymentFromSelectedData?.type === RTA ||
        paymentFromSelectedData?.type === PTA ||
        retentioinFromSelectedData?.type === RTA ||
        retentioinFromSelectedData?.type === PTA ||
        paymentToSelectedData?.type === RTA ||
        paymentToSelectedData?.type === RTA
      ) {
        SetNoticeEligible(true);
      } else {
        SetNoticeEligible(false);
      }
      // Pass the form values as props
      setViewPages("mainPage");
      setPaymentData(values);
      toast.success("This payment detail has been added.");
    },
  });

  // const customStyles = {
  //   control: (provided: any) => ({
  //     height: "40px",
  //     width: "100%",
  //   }),
  // };

  const customStyles = {
    control: (provided: any, state: any) => ({
      height: "40px",
      width: "100%",
      ...(state?.menu &&
      state?.menu?.isOpen &&
      state?.selectProps?.options?.length > 5
        ? { overflowY: "scroll", maxHeight: "150px" } // Adjust maxHeight as needed
        : {}),
    }),
  };

  const handleFormCancelClick = () => {
    setViewPages("mainPage");
    const isValid =
      Object.keys(paymentFromSelectedData).length == 0 &&
      Object.keys(paymentToSelectedData).length == 0;
    if (
      !isEdit &&
      ((contractType === "Supplier" && isValid) ||
        (props.RetentionType === "Cash" &&
          isValid &&
          Object.keys(retentioinFromSelectedData).length == 0))
    ) {
      toast.error("This payment detail will not be added.");
    }
  };

  return (
    <div className={styles.maindiv}>
      <div className={styles.border}>
        <Container fluid>
          <Row>
            <Col className={styles.signInForm}>
              <Form
                className={styles.formStyles}
                onSubmit={formik.handleSubmit}
              >
                <h5 className={styles.title}>Payment Details</h5>
                <p>Input the payment from and to account details</p>
                {contractType === "Supplier" && (
                  <>
                    <div className={styles.DropdownStyles}>
                      <SearchableSelect
                        key={timeKey}
                        options={paymentFromAccounts?.map((account) => ({
                          label: account?.account_name,
                          value: account?.bank_account_id,
                          type: account?.account_type,
                        }))}
                        placeholder="Select"
                        selectedData={paymentFromSelectedData}
                        onChange={(selectedOption) => {
                          const value = selectedOption?.value;
                          if (value != null) {
                            formik.setFieldValue("PaymentFromAccount", value);
                          }
                          setPaymentFromSelectedData(selectedOption);
                        }}
                        controlStyles={customStyles}
                        label="Payment from account *"
                      />
                      {formik.touched.PaymentFromAccount &&
                        formik.errors.PaymentFromAccount && (
                          <div className={`${styles.errorText} ${styles.icon}`}>
                            <ExclamationTriangleFill className={styles.icon} />
                            {formik?.errors?.PaymentFromAccount as string}
                          </div>
                        )}
                    </div>
                    {props.RetentionType === "Cash" && (
                      <div className={styles.DropdownStyles}>
                        <SearchableSelect
                          key={timeKey}
                          options={retentionFromAccounts?.map((account) => ({
                            label: account?.account_name,
                            value: account?.bank_account_id,
                            type: account?.account_type,
                          }))}
                          selectedData={retentioinFromSelectedData}
                          placeholder="Select"
                          onChange={(selectedOption) => {
                            const value = selectedOption?.value;
                            if (value != null) {
                              formik.setFieldValue(
                                "RetentionFromAccount",
                                value
                              );
                            }
                            setRetentioinFromSelectedData(selectedOption);
                          }}
                          controlStyles={customStyles}
                          label="Retention from account *"
                        />
                        {formik.touched.RetentionFromAccount &&
                          formik.errors.RetentionFromAccount && (
                            <div
                              className={`${styles.errorText} ${styles.icon}`}
                            >
                              <ExclamationTriangleFill
                                className={styles.icon}
                              />
                              {formik?.errors?.RetentionFromAccount as string}
                            </div>
                          )}
                      </div>
                    )}
                  </>
                )}

                <div className={styles.DropdownStyles}>
                  <SearchableSelect
                    key={timeKey}
                    options={paymentToAccounts?.map((account) => ({
                      label: account?.account_name,
                      value: account?.bank_account_id,
                      type: account?.account_type,
                    }))}
                    selectedData={paymentToSelectedData}
                    placeholder="Select"
                    onChange={(selectedOption) => {
                      const value = selectedOption?.value;
                      if (value != null) {
                        formik.setFieldValue("PaymentToAccount", value);
                      }
                      setPaymentToSelectedData(selectedOption);
                    }}
                    controlStyles={customStyles}
                    label="Payment to account *"
                  />
                  {formik.touched.PaymentToAccount &&
                    formik.errors.PaymentToAccount && (
                      <div className={`${styles.errorText} ${styles.icon}`}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik?.errors?.PaymentToAccount as string}
                      </div>
                    )}
                </div>

                <FormButton className={styles.buttonStyles} type="submit">
                  Save
                </FormButton>
                <Button
                  className={styles.CancelButtonStyles}
                  type="button"
                  onClick={handleFormCancelClick}
                >
                  Cancel
                </Button>
              </Form>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default PaymentDetailsPage;
