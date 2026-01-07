"use client";
import React, { useCallback, useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import styles from "./otherPayment.module.scss";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Col, Form, Row } from "react-bootstrap";
import * as Yup from "yup";
import { ExclamationTriangleFill, Paperclip } from "react-bootstrap-icons";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "@/app/Toaster";
import { useLoaderContext } from "@/context/useLoader";
import {
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR_ONLY,
  onlyDOCandPDF,
  onlyPDFFiles,
} from "@/common/constants/general";

import { useFormik } from "formik";
import _ from "lodash";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import CheckBox from "@/components/CheckBox/checkBox";
import {
  GetPaymentAttachments,
  UpdateInterestChargesPaymentStatus,
} from "./bankInterest.function";

import { useTokenDetails } from "@/common/commonHooks";
import {
  getListActionButtons,
  multipleFileUploadApi,
} from "@/app/api/commonAPIs";
import { AppModal } from "@/components/model/model";
import { DeletePayments } from "../backTrustAccount.functions";
import { ApplicationURLS } from "@/common/applicationURLS";
import ShowMatchTxnTable from "./showingMatchTransactions";
import { checkBoxConfirmationMessage } from "../../payApps/payments/payments.constant";
import { formatDollars, removeCommas } from "@/common/commonFunctions";

const InterestReceivedForm = (props: any) => {
  const queryParams = useSearchParams();
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
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );
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
    memo: Yup.string(),
    confirmReceived: Yup.boolean(),
  });
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const router = useRouter();
  const { setLoader }: any = useLoaderContext();

  const [selectedValue, setSelectedValue] = useState<any>("");
  const [files, setFiles] = useState<File[]>([]);
  const [originalFiles, setOriginalFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [openModal, setOpenModal] = useState(false);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);

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
    if (files.length > 0) {
      formik?.setFieldValue("uploaded_file", files);
    } else if (originalFiles.length > 0) {
      formik?.setFieldValue("uploaded_file", originalFiles);
    } else {
      formik?.setFieldValue("uploaded_file", "");
    }
  }, [files, originalFiles]);

  useEffect(() => {
    if (trustAccountList && data?.payment_id) {
      handleGetFileAttachments();

      formik.setValues({
        accountId: data ? String(data?.payment_to_account) : "",
        paymentAmount: data?.payment_amount
          ? formatDollars(data?.payment_amount.toFixed(2).toString())
          : "",
        paymentDate: data ? new Date(data?.payment_date) : "",
        memo: data ? String(data?.memo) : "",
        confirmReceived: data ? data?.is_received_confirmed : false,
        uploaded_file: data?.data?.optional_attachment_ids || "",
      });
      let accountList =
        trustAccountList?.find(
          (each: any) => each?.value === data?.payment_to_account?.toString()
        ) || {};
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
  const handleFileChange = (newFiles: File[]) => {
    if (isEdit && originalFiles.length + files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      toast.error("You can only select up to five files.");
      return;
    }
    if (!isEdit && files.length + newFiles.length > 5) {
      // If adding new files exceeds the limit, alert the user or handle the situation accordingly
      toast.error("You can only select up to five files.");
      return;
    }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    allFiles = allFiles.filter(
      (file) => !selectedFileNames.includes(file.name)
    );

    // Update state with new files
    setFiles([...files, ...allFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    setSelectedFileNames([...selectedFileNames, ...newFileNames]);
  };

  const formik = useFormik({
    initialValues: {
      accountId: data ? String(data?.payment_to_account) : "",
      paymentAmount: "",
      paymentDate: data ? new Date(data?.payment_date) : "",
      memo: data ? String(data?.memo) : "",
      confirmReceived: data ? data?.is_received_confirmed : false,
      uploaded_file: "",
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
        payment_type: "Interest Received",
        payment_to_account: Number(values?.accountId),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: values?.paymentDate,
        memo: values?.memo,
        is_received_confirmed: values?.confirmReceived,
      };
      try {
        let paymentResponse;
        if (!isEdit) {
          paymentResponse = await handleAddPayment(payload);
        } else {
          if (formik.values.confirmReceived === data?.is_received_confirmed) {
            toast.info("No changes to save");
            return;
          }
          paymentResponse = await handleUpdatePayment(values?.confirmReceived);
        }

        if (files?.length > 0 && paymentResponse) {
          const paymentId = paymentResponse?.payment_id;
          const fileIds = await handleFileUploads(paymentId);
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
  const handleFileUploads = async (paymentId: number) => {
    try {
      let fileIds = [];
      if (files.length > 0) {
        let userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Optional_attachments",
          payment_id: paymentId,
        };
        let multiUserData = files.map(() => userData);

        const fileResponse = await multipleFileUploadApi(
          files,
          multiUserData,
          accessTokenId
        );
        if (fileResponse?.length > 0) {
          fileIds = fileResponse.map((each: any) => each?.id);
        }
      }
      return fileIds;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
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

  const handleGetFileAttachments = async () => {
    try {
      const payload = {
        payment_id: data?.payment_id,
      };
      const response = await GetPaymentAttachments(payload);
      if (response?.length > 0) {
        setOriginalFiles(response);
      }
    } catch (error: any) {}
  };
  const handleViewFile = (item: any) => {
    if (
      isEdit &&
      item &&
      typeof item?.file === "string" &&
      item.file?.includes("base64")
    ) {
      fetch(item?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(item), "_blank");
    }
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

  const handleBackWithReduxSet = () => {
    if (!isView && !isEdit) {
      toast.info("No changes saved");
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
      toast.info("No changes saved");
      setIsShowAddOtherPayments && setIsShowAddOtherPayments(false);
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
                value={formik.values.paymentAmount}
                onChange={handleAmountChange}
                onBlur={formik.handleBlur}
                disabled={data?.payment_id}
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
                  key={selectedValue?.data?.opening_date}
                  showIcon={true}
                  label="Payment Date *"
                  toggleCalendarOnIconClick
                  placeholderText="DD/MM/YYYY"
                  selected={formik?.values?.paymentDate}
                  value={formik?.values?.paymentDate}
                  onChange={(selectedDate: string) => {
                    formik.setFieldValue("paymentDate", selectedDate);
                  }}
                  disabled={data?.payment_id ? true : false}
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
                  disabled={isView || (isEdit && !actionsBtnData?.edit)}
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
              labelText="Memo"
              name="memo"
              id="memo"
              disabled={data?.payment_id}
              maxLength={250}
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
          <div className={styles.attachText}>Attachments</div>
          <span className={styles.fileSelectorContainer}>
            <Paperclip />
            <span className={styles.sizeStyles}>
              &nbsp;&thinsp;Maximum Size: 20MB
            </span>
          </span>
          <Row>
            <Col lg={5}>
              {(isEdit || isView) &&
                originalFiles?.map((eachFile: any, index: number) => {
                  return (
                    <div key={index}>
                      <Row className="mt-2">
                        <Col lg={7}>
                          <div
                            className={styles.eachFielDetailsView}
                            key={index}
                          >
                            <span
                              className={styles.nameStyles}
                              title={eachFile?.name || eachFile?.file_name}
                            >
                              {eachFile?.name || eachFile?.file_name}
                            </span>
                          </div>
                        </Col>
                        <Col lg={2}>
                          <span
                            className={styles.fileText}
                            onClick={() => handleViewFile(eachFile)}
                          >
                            - View
                          </span>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              {files?.map((eachFile: any, index: number) => {
                return (
                  <div key={index}>
                    <Row className="mt-2">
                      <Col lg={7}>
                        <div className={styles.eachFielDetailsView} key={index}>
                          <span
                            className={styles.nameStyles}
                            title={eachFile?.name || eachFile?.file_name}
                          >
                            {eachFile?.name || eachFile?.file_name}
                          </span>
                        </div>
                      </Col>
                      <Col lg={2}>
                        <span
                          className={styles.fileText}
                          onClick={() => handleViewFile(eachFile)}
                        >
                          - View
                        </span>
                      </Col>
                      {!isEdit && !isView && (
                        <Col lg={2}>
                          <span
                            onClick={() => {
                              // Filter out the file that needs to be removed
                              const updatedFiles = files.filter(
                                (file, i) => i !== index
                              );
                              setFiles(updatedFiles);
                              let filterNames = selectedFileNames.filter(
                                (each: any) => each !== eachFile?.name
                              );
                              setSelectedFileNames(filterNames);
                            }}
                            className={styles.removeTxt}
                          >
                            Remove
                          </span>
                        </Col>
                      )}
                    </Row>
                  </div>
                );
              })}
            </Col>

            <Col lg={5}>
              {!data?.payment_id && files?.length < 5 && (
                <FileSelector
                  handleSave={(files) => {
                    if (files.length > 0) {
                      const fileArray = Array.from(files) as File[];
                      // changeFileName
                      const newFileArray = fileArray.map((file) => {
                        // const fileNameUUID = v4();
                        const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                        const newFile = new File([file], newFileName, {
                          type: file.type,
                        });
                        return newFile;
                      });
                      handleFileChange(newFileArray);
                    }
                  }}
                  acceptedFileFormats={onlyPDFFiles}
                  multiple={true}
                  maximumSize={20 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                >
                  <span className={styles.fileSelectorContainer}>
                    <FormButton className={styles.btn1}>+ Add</FormButton>
                  </span>
                </FileSelector>
              )}
            </Col>
            <Col lg={2}></Col>
            <Col lg={5}></Col>
          </Row>
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
              {((!isView && isEdit && actionsBtnData?.edit) ||
                (!isView && !isEdit)) && (
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
      <AppModal
        show={displayOnCancel}
        onHide={() => {
          setDisplayOnCancel(false);
          formik?.handleSubmit();
        }}
        secondButtonLabel="Save"
        firstButtonLabel="Yes"
        modalBodyContent={"Are you sure to close and not save?"}
        onConfirm={() => handleBackWithReduxSet()}
        closeButton={true}
        onCloseIconClick={() => setDisplayOnCancel(false)}
      />
    </>
  );
};

export default InterestReceivedForm;
