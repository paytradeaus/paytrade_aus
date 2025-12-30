import BaseModal from "@/components/BaseModal";
import React, { useState } from "react";
import { useAddClientsAndSuppliersContext } from "./AddClientsAndSuppliersContext";
import FormikControl from "@/components/FormikControl";
import { InputType, NUMBER_REGEX } from "@/shared/constant/general";
import { generateUniqueId } from "@/utils";
import { accountTypeOptions } from "./AddClientsAndSuppliers.constant";

export default function TrustRecordForms() {
  const {
    formik,
    displayTrainingRecords,
    setDisplayTrainingRecords,
    accountDetailsGridData,
    setAccountDetailsGridData,
    setDisplayAccountRecordsGrid,
  }: any = useAddClientsAndSuppliersContext();

  const [selectedAccountType, setSelectedAccountType] = useState("");
  function handleTrustTrainingClose() {
    formik.setFieldTouched("account_name", false);
    formik.setFieldTouched("bsb_number", false);
    formik.setFieldTouched("account_type", false);
    formik.setFieldTouched("account_number", false);
    formik?.setFieldValue("isTrainingFieldsRequired", false);
    formik?.setFieldValue("isPaymentDetailsRequired", false); // New Field

    formik?.setFieldValue("account_name", "");
    formik?.setFieldValue("bsb_number", "");
    formik?.setFieldValue("account_type", "");
    formik?.setFieldValue("account_number", "");
    if (accountDetailsGridData?.length > 0) {
      setDisplayAccountRecordsGrid(true);
    }
    setDisplayTrainingRecords(false);
  }

  async function handleSubmitAccountRecords() {
    await formik?.setFieldTouched("account_name");
    await formik?.setFieldTouched("bsb_number");
    await formik?.setFieldTouched("account_type");
    await formik?.setFieldTouched("account_number");

    if (
      formik?.values?.account_name &&
      formik?.values?.bsb_number &&
      formik?.values?.account_number
    ) {
      const { account_name, bsb_number, account_type, account_number } =
        formik?.values || {};
      setAccountDetailsGridData((prev: any) => [
        ...prev,
        {
          account_name,
          bsb_number,
          account_type,
          account_number,
          id: generateUniqueId(),
        },
      ]);
      setDisplayAccountRecordsGrid(true);
      await formik?.setFieldValue("account_name", "");
      await formik?.setFieldValue("bsb_number", "");
      await formik?.setFieldValue("account_type", "");
      await formik?.setFieldValue("account_number", "");
      setDisplayTrainingRecords(false);
      return true;
    }
  }

  function handleNumberChange(e: any, fieldName: string) {
    let number = e?.target?.value.trim();

    if (NUMBER_REGEX.test(number) || number === "") {
      formik.setFieldValue(fieldName, number);
    }
  }

  return (
    <BaseModal
      modalId={"Trust And Training Records Id"}
      title="Account details"
      displayModal={displayTrainingRecords}
      onClose={() => handleTrustTrainingClose()}
      onConfirm={() => handleSubmitAccountRecords()}
      secondButtonName="Save"
    >
      <small>Please add account and their details.</small>
      <br />
      <br />
      <FormikControl
        placeholder={"Select type"}
        required
        label={"Type"}
        name={"account_type"}
        options={accountTypeOptions}
        control={InputType.SELECT}
        error={formik.errors.account_type}
        showError={formik.touched.account_type && formik.errors.account_type}
        value={selectedAccountType}
        onBlur={formik.handleBlur("account_type")}
        renderKey="label"
        valueKey="value"
        onChange={(value: any) => {
          setSelectedAccountType(value);
          formik.setFieldValue("account_type", value); // Update the formik field value
          formik.setFieldTouched("account_type", false); // Reset the touched status to hide error
        }}
      />
      <FormikControl
        control={InputType.TEXT_FIELD}
        label={"Account Name"}
        placeholder="Enter Name"
        name={"account_name"}
        maxLength={150}
        error={formik.errors.account_name}
        showError={formik.touched.account_name && formik.errors.account_name}
        required
        onChange={formik?.handleChange}
        onBlur={formik.handleBlur("account_name")}
        value={formik.values.account_name}
      />
      <FormikControl
        control={InputType.TEXT_FIELD}
        label={"Number"}
        placeholder="Enter Number"
        required
        name={"account_number"}
        maxLength={13}
        showError={
          formik.touched.account_number && formik.errors.account_number
        }
        error={formik.errors.account_number}
        onChange={(e: any) => handleNumberChange(e, "account_number")}
        onBlur={formik.handleBlur("account_number")}
        value={formik.values.account_number}
      />
      <FormikControl
        control={InputType.TEXT_FIELD}
        label={"BSB"}
        name={"bsb_number"}
        required
        placeholder="Enter BSB"
        maxLength={6}
        error={formik.errors.bsb_number}
        showError={formik.touched.bsb_number && formik.errors.bsb_number}
        onChange={(e: any) => handleNumberChange(e, "bsb_number")}
        onBlur={formik.handleBlur("bsb_number")}
        value={formik.values.bsb_number}
      />
    </BaseModal>
  );
}
