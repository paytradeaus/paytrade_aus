//default imports
"use client";
import React, { Fragment, useEffect, useState } from "react";
//import from reactstrap components
import { Button, Container, Form } from "react-bootstrap";
import { ThreeDots, XCircle } from "react-bootstrap-icons";
//import from customized components
import customStyles from "./clientsAndSuppliers.module.scss";
import commonStyles from "../../../common/commonStyles.module.scss";
import TextField from "@/components/TextField/textField";
import Overlays from "@/components/Overlayes/Overlayes";
//import customized styles
//import from external libraries
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { DELETE, EDIT, NUMBER_REGEX, VIEW } from "@/common/constants/general";
import {
  setAccountDetailsData,
  setDeletedAccountDetails,
} from "@/redux/slices/clientSuppliersDetails";
import { AppModal } from "@/components/model/model";
import { accountTypeOptions } from "./clientSuppliers.constant";

//import from constants, interfaces ,functions and services
//module level constants and interfaces

interface TableData {
  id: number;
  client_supplier_id: number;
  account_type: string;
  account_name: string;
  account_number: number;
  bsb_number: number;
}

export default function AccountDetails() {
  //Other Hooks

  const params: any = useParams();
  const { id: slugData } = params;

  const queryParams = useSearchParams();
  const tabType = queryParams.get("tab");

  const dispatch = useAppDispatch();

  const accountDetailsFormData: any = useAppSelector(
    (state: any) => state?.clientsSuppliers?.accountDetailsData
  );

  const router = useRouter();

  //useState and useEffect Management
  const [displayForms, setDisplayForms] = useState(false);
  const [tableData, setTableData] = useState<any>([]);
  const [displayMessageModal, setDisplayMessageModal] =
    useState<boolean>(false);
  const [deletedAccountIds, setDeletedAccountIds] = useState<any[]>([]);
  const [isViewMode, setIsViewMode] = useState(false);

  useEffect(() => {
    if (accountDetailsFormData?.length) {
      setTableData(accountDetailsFormData);
    } else {
      setDisplayForms(true);
    }
    if (slugData[0] === VIEW) {
      setIsViewMode(true);
    }
  }, []);

  //Formik Handling
  const validationSchema = Yup.object().shape({
    account_type: Yup.object().required("Type is required"),
    account_name: Yup.string().required("Name is required"),
    account_number: Yup.number()
      .typeError("Only numbers allowed")
      .required("Number is required")
      .test("account_number", function (value, formData: any) {
        const isAccNoExist = formData.parent.account_number;

        if (!value) return true; // Handle empty email
        if (
          tableData?.length > 0 &&
          tableData.some((x: any) => x?.account_number == isAccNoExist)
        ) {
          return formData.createError({
            path: formData.path,
            message: "Number already exist",
          });
        }
        return true;
      }),
    bsb_number: Yup.number()
      .typeError("Only numbers allowed")
      .required("BSB is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      account_type: "",
      account_name: "",
      account_number: "",
      bsb_number: "",
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  //Functions

  function handleSubmit() {
    const generateId = Math.floor(Math.random() * 10000000);
    const selectedObj = {
      ...formik.values,
      id: generateId,
      account_number: String(formik.values?.account_number),
      account_type: formik?.values?.account_type?.value,
      bsb_number: +formik?.values?.bsb_number,
      addMode: true,
    };

    setTableData((prev: any) => [...prev, selectedObj]);

    formik.resetForm();
    setDisplayForms(false);
  }

  function handleSaveFormData(isSave: boolean) {
    if (isSave) {
      if (tableData?.length === 0) {
        dispatch(setAccountDetailsData(null));
      } else {
        dispatch(setAccountDetailsData(tableData));
      }
      dispatch(setDeletedAccountDetails(deletedAccountIds));
    }

    router.push(routeBack());
  }

  function routeBack() {
    if (slugData[0] === EDIT.toLowerCase()) {
      return `${ApplicationURLS.USER_EDIT_CLIENTS_AND_SUPPLIERS}/${slugData[1]}`;
    } else if (slugData[0] === VIEW) {
      return `${ApplicationURLS.USER_VIEW_CLIENTS_AND_SUPPLIERS}/${slugData[1]}?tab=${tabType}`;
    } else {
      return ApplicationURLS.USER_ADD_CLIENTS_AND_SUPPLIERS;
    }
  }

  function handleAdd() {
    if (tableData?.length === 10) {
      setDisplayMessageModal(true);
    } else {
      setDisplayForms(true);
    }
  }

  function handleFormClose() {
    if (accountDetailsFormData?.length) {
      setDisplayForms(false);
    } else {
      router.push(routeBack());
    }
  }

  function handleActions(selectedData: TableData) {
    const currData = [...tableData];

    const index = currData.findIndex((x: any) => x?.id === selectedData?.id);

    currData.splice(index, 1);

    dispatch(setAccountDetailsData(currData));
    setTableData(currData);
    if (selectedData?.client_supplier_id) {
      setDeletedAccountIds((prev: any) => [...prev, selectedData?.id]);
    }
  }

  const columns = [
    {
      name: "Account Type",
      grow: 1.6,

      selector: (row: TableData) => row?.account_type,
    },
    {
      name: "Client/Supplier Name",
      selector: (row: TableData) => row?.account_name,
      // wrap: true,
      width: "150px",
    },
    {
      name: "Number",
      grow: 1,
      center: true,
      selector: (row: TableData) => row?.account_number,
    },
    // {
    //   name: "BSB",
    //   selector: (row: TableData) => row?.bsb_number,
    // },
    slugData[0] !== "view" && {
      name: "Action",
      fixed: "left",
      grow: 0,
      center: true,
      cell: (row: TableData) => (
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[{ label: DELETE, value: DELETE, isDelete: true }]}
          customPopupstyles={customStyles.customPopupStyles}
          optionClick={() => handleActions(row)}
        >
          <div className={customStyles.actionDots}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  function handleNumberChange(e: any, fieldName: string) {
    let number = e?.target?.value.trim();

    if (NUMBER_REGEX.test(number) || number === "") {
      formik.setFieldValue(fieldName, number);
    }
  }

  //Render Template
  return (
    <Fragment>
      <Container fluid>
        <div className={customStyles.card}>
          <div className="mb-5">
            <h5 className={customStyles.title}>Account details</h5>
            <div className={customStyles.subText}>
              Please add account and their details.
            </div>
          </div>

          <div className="d-flex  justify-content-end">
            {!displayForms && !isViewMode && (
              <Button
                className={`${customStyles.cancelButton} ${customStyles.addButton}`}
                type="button"
                onClick={() => handleAdd()}
              >
                + Add
              </Button>
            )}
          </div>
          {!displayForms && (
            <ReusableDataTable columns={columns} data={tableData} />
          )}
          {displayForms && (
            <Form onSubmit={formik.handleSubmit}>
              <div className={customStyles.textFieldStyles}>
                <SearchableSelect
                  options={accountTypeOptions}
                  selectedData={formik.values.account_type}
                  onChange={(selectedOption) => {
                    formik.setFieldValue("account_type", selectedOption);
                  }}
                  placeholder="Select type"
                  controlStyles={customStyles}
                  label="Type *"
                  isRequired={
                    !!(
                      formik?.errors?.account_type &&
                      formik.touched.account_type
                    )
                  }
                  errorMessage={formik?.errors?.account_type}
                />
              </div>

              <div className={customStyles.textFieldStyles}>
                <TextField
                  placeholder="Enter Name"
                  type="text"
                  errorText={formik.errors.account_name}
                  isInvalid={
                    !!(
                      formik.touched.account_name && formik.errors.account_name
                    )
                  }
                  labelText="Account Name *"
                  name="account_name"
                  id="account_name"
                  value={formik.values.account_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </div>

              <div className={customStyles.textFieldStyles}>
                <TextField
                  placeholder="Enter Number"
                  type="text"
                  maxLength={13}
                  errorText={formik.errors.account_number}
                  isInvalid={
                    !!(
                      formik.touched.account_number &&
                      formik.errors.account_number
                    )
                  }
                  labelText="Number *"
                  name="account_number"
                  id="account_number"
                  value={formik.values.account_number}
                  onChange={(e: any) => handleNumberChange(e, "account_number")}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </div>

              <div className={customStyles.textFieldStyles}>
                <TextField
                  placeholder="Enter BSB"
                  type="text"
                  maxLength={6}
                  errorText={formik.errors.bsb_number}
                  isInvalid={
                    !!(formik.touched.bsb_number && formik.errors.bsb_number)
                  }
                  labelText="BSB *"
                  name="bsb_number"
                  id="bsb_number"
                  value={formik.values.bsb_number}
                  onChange={(e: any) => handleNumberChange(e, "bsb_number")}
                  onBlur={formik.handleBlur}
                  classNames={commonStyles.inputFieldControl}
                />
              </div>
              <FormButton className={customStyles.submitButton} type="submit">
                Save
              </FormButton>
              <Button
                className={customStyles.cancelButton}
                type="button"
                onClick={() => handleFormClose()}
              >
                Cancel
              </Button>
            </Form>
          )}
          {!displayForms && (
            <Fragment>
              {!isViewMode && (
                <FormButton
                  className={customStyles.submitButton}
                  type="button"
                  // disabled={tableData?.length === 0}
                  onClick={() => handleSaveFormData(true)}
                >
                  Save
                </FormButton>
              )}

              <Button
                className={customStyles.cancelButton}
                type="button"
                onClick={() => handleSaveFormData(false)}
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>
            </Fragment>
          )}
        </div>
      </Container>
      {displayMessageModal && (
        <AppModal
          show={displayMessageModal}
          onHide={() => {}}
          firstButtonLabel="Ok"
          modalBodyContent="Maximum count of 10 accounts has been already added. delete any existing account, to add new !"
          onConfirm={() => setDisplayMessageModal(false)}
        />
      )}
    </Fragment>
  );
}
