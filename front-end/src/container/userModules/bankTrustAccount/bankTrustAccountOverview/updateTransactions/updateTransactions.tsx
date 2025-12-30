"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import styles from "./updateTransactions.module.scss";
import { Button, Col, Container, Form, Row, Table } from "react-bootstrap";
import FormButton from "@/components/Button/button";
import { useFormik } from "formik";
import { FiletypeDoc, XCircle } from "react-bootstrap-icons";
import AttachmentUpload from "@/components/attachmentUpload/attachmentUpload";
import { toast } from "react-toastify";
import {
  DD_MM_YYYY,
  fileTypeFormats,
  imageTypeFormats,
} from "@/common/constants/general";
import FileSelector from "@/components/fileSelector/fileSelector";
import { useParams, useRouter } from "next/navigation";
import { FileUploadResponseData } from "@/container/adminModules/sendEmailTemplate/sendEmailTemplate.types";
import { multipleFileUploadApi } from "@/app/api/commonAPIs";
import { useTokenDetails } from "@/common/commonHooks";
import {
  AddSelectedTransactionsFromCsv,
  DownloadTransactionUploadCsvTemplate,
  ProcessUploadedTransactionsCsv,
} from "./uploadTransactions.functions";
import { formatDate } from "@/common/commonFunctions";
import { getCookie } from "cookies-next";
import CheckBox from "@/components/CheckBox/checkBox";
import { AppModal } from "@/components/model/model";
import { SUCCESS } from "@/common/constants/messages";

const UploadCsv = (props: any) => {
  const router = useRouter();
  const params = useParams();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const { decodeTokenData, accessTokenId } = useTokenDetails();
  const [showAdditionalTable, setShowAdditionalTable] = useState(false); // State to manage visibility of additional table
  const AllowedTypes = [".CSV"];

  const [files, setFiles] = useState<File[]>([]);
  const [transactionsList, setTransactionsList] = useState([]);
  const [isdisabledBtn, setIsDisabledBtn] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMessage] = useState(
    " File provided in incorrect format. Please download example template below"
  );

  const [modifiedTransactions, setModifiedTransactions] = useState<any[]>([]);

  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [openModelPopUp, setOpenModelPopUp] = useState(false);
  const [manualCurrentBalance, setManualCurrentBalance] = useState("");
  const [currentBalanceOption, setCurrentBalanceOption] = useState<
    "useLatest" | "updateAmount"
  >("useLatest");
  const [modalPopUpMSG, setModalPopUpMSG] = useState("");
  const [modalDisabled, setModalDisabled] = useState(false);

  useLayoutEffect(() => {
    if (!Number(params?.id[0])) {
      toast.error("Please select Bank account");
      router.back();
    }
    if (!selectedCompanyId) {
      toast.error("Please select Business account");
      router.back();
    }
  }, [params]);

  useEffect(() => {
    if (transactionsList?.length > 0) {
      let count = 0;
      let modifiedObj = transactionsList?.map((each: any) => {
        if (each?.is_similar) count++;
        return {
          ...each,
          checked: selectedItems.includes(each?.value),
        };
      });
      setModifiedTransactions(modifiedObj || []);
      setDuplicateCount(count);
      if (modifiedObj?.length === selectedItems?.length) {
        setSelectAll(true);
      }
    }
  }, [transactionsList]);

  const formik: any = useFormik({
    initialValues: {},
    onSubmit: async (values) => {
      setIsDisabledBtn(true);
      if (files.length === 0) {
        setIsDisabledBtn(false);
        toast.error("Please select an attachment");
        return;
      }
      let userData = {
        uploaded_by: decodeTokenData?.emailId || "",
        attachment_type: "Transaction_csv_file_attachments",
        bank_account_id: Number(params?.id[0]),
      };
      let multiUserData: any[] = [];
      files.forEach((item: any) => multiUserData.push(userData));
      const fileResponse: FileUploadResponseData[] =
        await multipleFileUploadApi(files, multiUserData, accessTokenId, true);
      if (fileResponse?.length > 0 && fileResponse[0]?.file_path) {
        let payload = {
          filePath: fileResponse[0]?.file_path || "",
          bankAccountId: Number(params?.id[0]),
        };
        let transactionsResponse = await ProcessUploadedTransactionsCsv(
          payload,
          setErrorMessage
        );
        if (transactionsResponse?.length > 0) {
          setTransactionsList(transactionsResponse);
          setShowAdditionalTable(true);
          setIsDisabledBtn(false);
        } else {
          setIsDisabledBtn(false);
          setIsError(true);
          // toast.error("something went wrong. please upload it again");
        }
      } else {
        setIsDisabledBtn(false);
        setIsError(true);
        // toast.error("something went wrong. please upload it again");
      }
    },
  });

  const handleFormCancelClick = () => {
    toast.error("No transactions are added.");
    router.back();
  };

  const handleTableCancelClick = () => {
    setSelectedItems([]);
    setModifiedTransactions([]);
    setShowAdditionalTable(false);
    setSelectAll(false);
  };

  const handleSaveTransactions = async () => {
    if (selectedItems?.length === 0) {
      toast.warn("No transactions selected to save");
      return;
    }

    setIsDisabledBtn(true);
    let payload = {
      // selectedIds: transactionsList?.map((each: any) => each?.id) || [],
      selectedIds: selectedItems || [],
      bankAccountId: Number(params?.id[0]),
      companyId: selectedCompanyId,
      balanceManual: null,
      confirm: false,
    };

    let saveResponse = await AddSelectedTransactionsFromCsv(payload);
    if (saveResponse?.status === SUCCESS) {
      setCurrentBalanceOption("useLatest");
      setManualCurrentBalance("");
      setOpenModelPopUp(true);
      setModalPopUpMSG(saveResponse?.message);
      // setShowAdditionalTable(false);
      // setIsSuccess(true);

      // setIsDisabledBtn(false);
    } else {
      setIsDisabledBtn(false);
      setOpenModelPopUp(false);
    }
  };

  const handleModalPopUpFunction = async () => {
    let payload = {
      selectedIds: selectedItems || [],
      bankAccountId: Number(params?.id[0]),
      companyId: selectedCompanyId,
      balanceManual:
        currentBalanceOption === "updateAmount"
          ? Number(manualCurrentBalance)
          : null,
      confirm: true,
    };

    let saveResponse = await AddSelectedTransactionsFromCsv(payload);
    if (saveResponse?.status === SUCCESS) {
      toast.success(saveResponse?.message);
      setShowAdditionalTable(false);
      setIsSuccess(true);
      setIsDisabledBtn(false);
      setOpenModelPopUp(false);
      setModalDisabled(false);
    } else {
      setIsDisabledBtn(false);
      setOpenModelPopUp(false);
      setModalDisabled(false);
    }
  };

  const handleViewFile = async () => {
    let payload = {
      financialInstitutionId: "",
    };

    let filesData = await DownloadTransactionUploadCsvTemplate(payload);
    if (filesData?.file) {
      fetch(filesData?.file)
        .then((res) => res.blob())
        .then((res) => {
          const url = URL.createObjectURL(res);
          const link = document.createElement("a");
          link.href = url;
          link.download = filesData?.file_name || "desired_filename.csv"; // Set the desired file name here
          document.body.appendChild(link);
          link.click(); // Trigger the download
          document.body.removeChild(link); // Clean up the link after download
        });
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file format
    if (
      file?.type === "text/csv" ||
      file?.type === "application/vnd.ms-excel"
    ) {
      const newFile = new File([file], file.name, {
        type: file.type,
      });
      setFiles([newFile]);
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target) {
          const content = event.target.result as string;
          toast.success("CSV file selected successfully.");
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Please select a CSV file.");
      return;
    }
  };

  const handleCheckboxChange = (index: number) => {
    const updatedItemsData: any = [...modifiedTransactions];
    updatedItemsData[index].checked = !updatedItemsData[index].checked;
    setModifiedTransactions(updatedItemsData);
    // Update selectedItems based on checkbox status
    const selectedItemValue = updatedItemsData[index].id;
    if (updatedItemsData[index].checked) {
      setSelectedItems((prevSelectedItems) => [
        ...prevSelectedItems,
        selectedItemValue,
      ]);
    } else {
      setSelectedItems((prevSelectedItems) =>
        prevSelectedItems.filter((item) => item !== selectedItemValue)
      );
    }
    // Check if all items are selected or not
    const allSelected = updatedItemsData.every((item: any) => item.checked);
    setSelectAll(allSelected);
  };

  // Function to handle select all checkbox change
  const handleSelectAllChange = () => {
    const updatedItemsData: any = modifiedTransactions?.map((item: any) => ({
      ...item,
      checked: !selectAll,
    }));
    setModifiedTransactions(updatedItemsData);

    // Update selectedItems based on the new selection status
    const selectedItemsValues = updatedItemsData
      .filter((item: any) => item.checked)
      .map((item: any) => item.id);
    setSelectedItems(selectAll ? [] : selectedItemsValues);

    // Toggle the selectAll state
    setSelectAll(!selectAll);
  };

  return (
    <div className={styles.mainCon}>
      {!showAdditionalTable && (
        <Container fluid>
          <Row>
            <Col className={styles.signInForm}>
              {!showAdditionalTable && !isError && !isSuccess && (
                <Form
                  className={styles.formStyles}
                  onSubmit={formik.handleSubmit}
                >
                  <h5 className={styles.title}>CSV Upload</h5>
                  <p className="text-center">
                    Please upload your CSV file in format - Date, Transaction
                    amount, Description, Balance.
                  </p>

                  <AttachmentUpload
                    onFileSelect={handleFileSelect}
                    placeholder="Please select or drag and drop"
                    selected_file={files[0]}
                    selected_filename={files[0]?.name || ""}
                    disabled={files.length !== 0}
                    allowedTypes={AllowedTypes}
                  ></AttachmentUpload>

                  {files?.length > 0 && (
                    <Col className={styles.filesviewContanier}>
                      {files?.map((eachFile: any, index: number) => {
                        return (
                          <div className={styles.blockDetails} key={index}>
                            <div className={styles.eachFielDetailsView}>
                              <XCircle
                                className={styles.fileRemoveIcon}
                                onClick={() => {
                                  // Filter out the file that needs to be removed
                                  const updatedFiles = files.filter(
                                    (file, i) => i !== index
                                  );
                                  setFiles(updatedFiles);
                                }}
                              />

                              <div className={styles.eachFile}>
                                {imageTypeFormats.includes(
                                  eachFile?.type || eachFile?.file_type
                                ) ? (
                                  <></>
                                ) : (
                                  <FiletypeDoc />
                                )}
                              </div>
                              <span
                                className={styles.nameStyles}
                                title={eachFile?.name || eachFile?.file_name}
                              >
                                {eachFile?.name || eachFile?.file_name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </Col>
                  )}
                  {files?.length < 5 && (
                    <FileSelector
                      disabled={files.length !== 0}
                      handleSave={(files) => {
                        if (files.length > 0) {
                          const fileArray = Array.from(files) as File[];
                          const newFileArray = fileArray.map((file) => {
                            const newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                            const newFile = new File([file], newFileName, {
                              type: file.type,
                            });
                            return newFile;
                          });
                          setFiles(newFileArray);
                          toast.success("CSV file selected successfully.");
                        }
                      }}
                      acceptedFileFormats={AllowedTypes}
                      multiple={false}
                      maximumSize={5 * 1024}
                      onError={(error) => {
                        toast.error(`Max Allowed file size is ${5} Mb`);
                      }}
                    >
                      <Button disabled={files.length !== 0}>
                        Select a file to upload
                      </Button>
                    </FileSelector>
                  )}

                  <Button
                    className={styles.downloadFile}
                    type="button"
                    onClick={handleViewFile} // Add event handler
                  >
                    Download Template
                  </Button>
                  <FormButton
                    className={styles.buttonStyles}
                    type="submit"
                    disabled={isdisabledBtn}
                  >
                    Upload
                  </FormButton>

                  <Button
                    className={styles.CancelButtonStyles}
                    type="button"
                    onClick={handleFormCancelClick}
                    disabled={isdisabledBtn}
                  >
                    Cancel
                  </Button>
                </Form>
              )}
              {isError && (
                <Form className={styles.formStyles}>
                  <h5 className={styles.title}>CSV Upload</h5>

                  <h6 className={styles.errortitle}>Validation Error</h6>
                  <p className={styles.errorDescription}>{errorMsg}</p>
                  <Button
                    className={styles.downloadFile}
                    type="button"
                    onClick={handleViewFile} // Add event handler
                  >
                    Download Template
                  </Button>
                  <FormButton
                    className={styles.buttonStyles}
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setIsError(false);
                    }}
                  >
                    Try again
                  </FormButton>

                  <Button
                    className={styles.CancelButtonStyles}
                    type="button"
                    onClick={handleFormCancelClick}
                  >
                    Cancel
                  </Button>
                </Form>
              )}
              {isSuccess && (
                <Form className={styles.formStyles}>
                  <h5 className={styles.title}>CSV Upload</h5>

                  <h6 className={styles.successtitle}>Success</h6>

                  <Button
                    className={styles.CancelButtonStyles}
                    type="button"
                    onClick={() => router.back()}
                  >
                    Close
                  </Button>
                </Form>
              )}
            </Col>
          </Row>
        </Container>
      )}
      {showAdditionalTable && (
        <Container fluid>
          <Row>
            <Col className={styles.signInFormTable}>
              <Form className={styles.formStyles}>
                <h5 className={styles.title}>CSV Upload</h5>
                <div className={styles.entiresHeaderCon}>
                  <span>New Entries Found</span>
                  {/* {duplicateCount > 0 && (
                    <span
                      style={{ color: "red" }}
                    >{`${duplicateCount} Duplicate entrie${
                      duplicateCount > 1 ? "s" : ""
                    } found`}</span>
                  )} */}
                </div>
                <Table
                  bordered
                  className={styles.tableStyles}
                  // className="table"
                  // style={{ width: "100%", display: "block", overflow: "auto" }}
                >
                  <thead>
                    <tr className="text-center">
                      <th>
                        <CheckBox
                          label=""
                          type="checkbox"
                          className={styles.checkBoxHeights}
                          checked={selectAll}
                          onChange={handleSelectAllChange}
                        />
                      </th>
                      <th> Date</th>
                      <th>Txn Amount </th>
                      <th>Description </th>
                      <th>Balance </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modifiedTransactions?.map((each: any, index) => {
                      return (
                        <tr key={each?.id}>
                          <td className="text-center" width={"40px"}>
                            <CheckBox
                              label=""
                              type="checkbox"
                              className={styles.checkBoxHeights}
                              // checked={false}
                              checked={each?.checked}
                              onChange={() => handleCheckboxChange(index)}
                            />
                          </td>
                          <td
                            className={`${
                              each?.is_similar ? styles.tableClasses : ""
                            }`}
                            width={"100px"}
                          >
                            {each?.txn_date
                              ? formatDate(each?.txn_date, DD_MM_YYYY)
                              : ""}
                          </td>
                          <td
                            className={`${
                              each?.is_similar ? styles.tableClasses : ""
                            }`}
                            width={"180px"}
                            align="right"
                          >
                            {each?.txn_amount
                              ? `$ ${each?.txn_amount
                                  .toFixed(2)
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                              : "$  0.00"}
                          </td>
                          <td
                            className={`${
                              each?.is_similar ? styles.tableClasses : ""
                            }`}
                          >
                            {each?.description || ""}
                          </td>
                          <td
                            className={`${
                              each?.is_similar ? styles.tableClasses : ""
                            }`}
                            width={"180px"}
                            align="right"
                          >
                            {each?.balance
                              ? `$ ${each?.balance
                                  .toFixed(2)
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                              : "$  0.00"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                {duplicateCount > 0 && (
                  <div className={styles.duplicateDesCon}>
                    <span style={{ textAlign: "center" }}>
                      {` We have identified ${duplicateCount} potential duplicate record${
                        duplicateCount > 1 ? "s" : ""
                      } As above,please review carefully before proceeding.`}
                    </span>
                    <span style={{ textAlign: "center" }}>
                      if there are any errors, please amend your csv file and
                      upload again.
                    </span>
                  </div>
                )}

                <FormButton
                  className={styles.buttonStyles}
                  type="button"
                  disabled={isdisabledBtn}
                  onClick={handleSaveTransactions}
                >
                  Save
                </FormButton>

                <Button
                  className={styles.CancelButtonStyles}
                  type="button"
                  disabled={isdisabledBtn}
                  onClick={handleTableCancelClick}
                >
                  Cancel
                </Button>
              </Form>
            </Col>
          </Row>
        </Container>
      )}
      <AppModal
        show={openModelPopUp}
        // key={new Date().getTime()}
        onHide={() => {
          setOpenModelPopUp(false);
          setIsDisabledBtn(false);
          setModalPopUpMSG("");
          setCurrentBalanceOption("useLatest");
          setManualCurrentBalance("");
          setModalDisabled(false);
        }}
        firstButtonLabel="Save"
        closeButton
        // secondButtonLabel="Cancel"
        modalBodyTitle=""
        modalHeading={"Update Current Balance"}
        modalBodyContent={
          <div>
            <small>{modalPopUpMSG}</small>
            <p> Is this correct or do you want to update the amount?</p>
          </div>
        }
        transactionsUploadModal={true}
        setCurrentBalanceOption={setCurrentBalanceOption}
        setManualCurrentBalance={setManualCurrentBalance}
        disabled={modalDisabled}
        onConfirm={() => {
          setModalDisabled(true);
          if (
            currentBalanceOption === "updateAmount" &&
            !manualCurrentBalance
          ) {
            toast.info("please enter amount");
            setModalDisabled(false);
            return;
          }
          handleModalPopUpFunction();
        }}
      />
    </div>
  );
};

export default UploadCsv;
