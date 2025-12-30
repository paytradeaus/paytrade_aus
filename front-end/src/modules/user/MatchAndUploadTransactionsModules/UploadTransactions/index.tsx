"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { getCookie } from "cookies-next";
import { useTokenDetails } from "@/hooks";
import { FileUploadResponseData } from "../../BusinessVerification";
import {
  AddSelectedTransactionsFromCsv,
  DownloadTransactionUploadCsvTemplate,
  ProcessUploadedTransactionsCsv,
} from "./uploadTransactions.functions";
import { multipleFileUploadApi } from "@/network/apolloClient";
import { SUCCESS } from "@/app/message";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import { buttonType, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import FileSelector from "@/components/fileSelector/fileSelector";
import BaseModal from "@/components/BaseModal";
import { formatDate, formatDollars } from "@/utils";
import FormikControl from "@/components/FormikControl";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { useLoaderContext } from "@/context/useLoader";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";

const UploadTransactions = (props: any) => {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const { decodeTokenData, accessTokenId } = useTokenDetails();
  const [showAdditionalTable, setShowAdditionalTable] = useState(false); // State to manage visibility of additional table
  const AllowedTypes = [".CSV", "text/csv"];

  const [files, setFiles] = useState<File[]>([]);
  const [transactionsList, setTransactionsList] = useState([]);
  const [isdisabledBtn, setIsDisabledBtn] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
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
  const [errorMessage, setErrorMessage] = useState("");

  useLayoutEffect(() => {
    if (!Number(params?.id[0])) {
      showErrorToast("Please select Bank account");
      router.back();
    }
    if (!selectedCompanyId) {
      showErrorToast("Please select Business account");
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

  const handleOnUploadBtn = async () => {
    setIsDisabledBtn(true);
    if (files.length === 0) {
      setIsDisabledBtn(false);
      showErrorToast("Please select a file to upload");
      return;
    }
    let userData = {
      uploaded_by: decodeTokenData?.emailId || "",
      attachment_type: "Transaction_csv_file_attachments",
      bank_account_id: Number(params?.id[0]),
    };
    let multiUserData: any[] = [];
    files.forEach((item: any) => multiUserData.push(userData));
    const fileResponse: FileUploadResponseData[] = await multipleFileUploadApi(
      files,
      multiUserData,
      accessTokenId,
      true
    );
    if (fileResponse?.length > 0 && fileResponse[0]?.file_path) {
      let payload = {
        filePath: fileResponse[0]?.file_path || "",
        bankAccountId: Number(params?.id[0]),
      };
      let transactionsResponse = await ProcessUploadedTransactionsCsv(
        payload,
        setErrorMsg
      );
      if (transactionsResponse?.viewData?.length > 0) {
        setTransactionsList(transactionsResponse?.viewData);
        setShowAdditionalTable(true);
        setIsDisabledBtn(false);
      } else {
        setIsDisabledBtn(false);
        showErrorToast(
          transactionsResponse?.resMsg ||
            "something went wrong. please upload it again"
        );
      }
    } else {
      setIsDisabledBtn(false);
      showErrorToast(
        errorMsg || "something went wrong. please upload it again"
      );
    }
  };

  const handleFormCancelClick = () => {
    showErrorToast("No transactions are added.");
    dispatch(
      setScreenDetails({
        selectUploadTab: "ShowBankSelectPart",
      })
    );
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
      showWarningToast("No transactions selected to save");
      return;
    }

    setIsDisabledBtn(true);
    setLoaderInfo("Saving transactions...");
    let payload = {
      // selectedIds: transactionsList?.map((each: any) => each?.id) || [],
      selectedIds: selectedItems || [],
      bankAccountId: Number(params?.id[0]),
      companyId: selectedCompanyId,
      balanceManual: null,
      confirm: false,
    };
    try {
      let saveResponse = await AddSelectedTransactionsFromCsv(payload);
      if (saveResponse?.status === SUCCESS) {
        setCurrentBalanceOption("useLatest");
        setManualCurrentBalance("");
        setOpenModelPopUp(true);
        setModalPopUpMSG(saveResponse?.message);
        // setShowAdditionalTable(false);
        // setIsDisabledBtn(false);
      } else {
        setIsDisabledBtn(false);
        setOpenModelPopUp(false);
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Something went wrong while saving transactions.");
    } finally {
      setLoaderInfo(""); // ✅ Clear loader message
      setIsDisabledBtn(false);
    }
  };

  const handleModalPopUpFunction = async () => {
    try {
      setLoader(true);
      setModalDisabled(true);
      setLoaderInfo("Saving transactions...");
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
        showSuccessToast(saveResponse?.message);
        setShowAdditionalTable(false);
        setIsDisabledBtn(false);
        setOpenModelPopUp(false);
        setModalDisabled(false);
        router.back();
      } else {
        setIsDisabledBtn(false);
        setOpenModelPopUp(false);
        setModalDisabled(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoader(false);
      setLoaderInfo("");
      dispatch(setScreenDetails({}));
    }
  };

  const handleDownLoadTempFile = async () => {
    let payload = {
      financialInstitutionId: "",
    };
    console.log("i came here");

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

  const [selectedOption, setSelectedOption] = useState("useLatest");
  const [balance, setBalance] = useState("");

  const handleOptionChange = (value: any) => {
    setSelectedOption(value);
    setCurrentBalanceOption(value);
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      setBalance("");
      setCurrentBalanceOption("updateAmount");
      setManualCurrentBalance("");
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

    setBalance(formattedValue); // Formatted value with dollar sign
    setCurrentBalanceOption("updateAmount");
    setManualCurrentBalance(finalValue);
    // formik.setFieldValue("retention_amount", `$ ${finalValue}`);
  };

  return (
    <>
      {!showAdditionalTable && (
        <main>
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="pt_login">
                    <h3>CSV Upload</h3>
                    <p>
                      Please upload your CSV file in format - Date, Transaction
                      amount, Description, Balance.
                    </p>

                    {/* <div style={{ display: "inline-block" }}>
                      <CustomButton
                        actionType="button"
                        buttonType={buttonType.SECONDARY}
                        buttonName={"Download template CSV"}
                        onClick={() => handleDownLoadTempFile()}
                        inputButton
                      />
                    </div> */}
                    <a>
                      <button
                        className="secondary"
                        onClick={() => handleDownLoadTempFile()}
                      >
                        Download template CSV
                      </button>
                    </a>

                    <hr />

                    <h5>Select a CSV to upload</h5>
                    {/* <input type="file" /> */}
                    <div style={{ display: "inline-block" }}>
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
                            // toast.success("CSV file selected successfully.");
                          }
                        }}
                        acceptedFileFormats={AllowedTypes}
                        multiple={false}
                        maximumSize={5 * 1024}
                        onError={(error) => {
                          showErrorToast(`Max Allowed file size is ${5} Mb`);
                        }}
                      >
                        <CustomButton
                          buttonName={"Choose file"}
                          buttonType={buttonType.SECONDARY}
                          actionType="submit"
                          disabled={files.length !== 0}
                        />
                      </FileSelector>
                    </div>
                    <br />
                    {files?.length > 0 &&
                      files?.map((eachFile: any, index: number) => {
                        return (
                          <div className="pt_itemwithremove">
                            <span>{eachFile?.name || eachFile?.file_name}</span>
                            <div>
                              <button
                                className="contrast smallbutton"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const updatedFiles = files.filter(
                                    (file, i) => i !== index
                                  );
                                  setFiles(updatedFiles);
                                }}
                              >
                                <i
                                  className="fa-light fa-xmark"
                                  style={{ margin: "0" }}
                                ></i>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    <br />
                    <br />
                    <div className="grid">
                      <CustomButton
                        actionType="button"
                        buttonType={buttonType.OUTLINE_CONTRAST}
                        buttonName={"Previous"}
                        onClick={() => {
                          handleFormCancelClick();
                        }}
                        inputButton
                      />
                      <CustomButton
                        actionType="button"
                        buttonType={buttonType.SECONDARY}
                        buttonName={"Upload"}
                        disabled={isdisabledBtn}
                        onClick={() => {
                          handleOnUploadBtn();
                        }}
                        inputButton
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="paytradeffectwrap">
              <div className="paytradeffect">
                <div className="themeshade"></div>
                <div className="oceanshade"></div>
                <div className="crabshade"></div>
              </div>
            </div>
            <div className="noise"></div>
          </div>
        </main>
      )}
      {showAdditionalTable && (
        <>
          <div className="pt_smallbgimage">
            <div className="pt_centered pt_centeredwide">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="pt_login">
                    <h3>Check CSV uploaded records</h3>
                    <h5>New entries found</h5>

                    {duplicateCount > 0 && (
                      <p>
                        <b className="redtext">
                          {` We have identified ${duplicateCount} potential duplicate record${
                            duplicateCount > 1 ? "s" : ""
                          }  below, please review carefully before proceeding.`}
                          <br />
                          If there are any errors please amend your CSV file and
                          upload again.
                        </b>
                      </p>
                    )}

                    <div className="grid">
                      <div className="pt_defaulttable_scroll">
                        <table className="pt_defaulttable">
                          <thead>
                            <tr>
                              <th>
                                <input
                                  type="checkbox"
                                  id="select all"
                                  name="select all"
                                  checked={selectAll}
                                  onChange={handleSelectAllChange}
                                />
                              </th>
                              <th>Status</th>
                              <th>Date</th>
                              <th>Txn amount</th>
                              <th>Description</th>
                              <th>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modifiedTransactions?.map((each: any, index) => {
                              return (
                                <tr key={each?.id}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      id={`row ${each?.id}`}
                                      name={`row ${each?.id}`}
                                      checked={each?.checked}
                                      onChange={() =>
                                        handleCheckboxChange(index)
                                      }
                                    />
                                  </td>
                                  <td>
                                    {each?.is_similar ? (
                                      <span className="alert">
                                        <b>
                                          <i className="fa-light fa-circle-exclamation"></i>{" "}
                                          Duplicate
                                        </b>
                                      </span>
                                    ) : (
                                      ""
                                    )}
                                  </td>
                                  <td>
                                    {each?.txn_date
                                      ? formatDate(each?.txn_date)
                                      : ""}
                                  </td>
                                  <td>
                                    {each?.txn_amount
                                      ? `$${each?.txn_amount
                                          .toFixed(2)
                                          .replace(
                                            /\B(?=(\d{3})+(?!\d))/g,
                                            ","
                                          )}`
                                      : "$ 0.00"}
                                  </td>
                                  <td>{each?.description || ""}</td>
                                  <td>
                                    {each?.balance
                                      ? `$${each?.balance
                                          .toFixed(2)
                                          .replace(
                                            /\B(?=(\d{3})+(?!\d))/g,
                                            ","
                                          )}`.toString()
                                      : "$ 0.00"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <br />
                    <br />
                    <div className="grid">
                      <CustomButton
                        actionType="button"
                        buttonType={buttonType.OUTLINE_CONTRAST}
                        buttonName={"Previous"}
                        disabled={isdisabledBtn}
                        onClick={() => {
                          handleTableCancelClick();
                        }}
                        inputButton
                      />
                      <CustomButton
                        actionType="button"
                        disabled={isdisabledBtn}
                        buttonType={buttonType.SECONDARY}
                        buttonName={"Save"}
                        onClick={() => {
                          // setOpenModelPopUp(true);
                          handleSaveTransactions();
                        }}
                        inputButton
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="paytradeffectwrap">
              <div className="paytradeffect">
                <div className="themeshade"></div>
                <div className="oceanshade"></div>
                <div className="crabshade"></div>
              </div>
            </div>
            <div className="noise"></div>
          </div>
        </>
      )}

      {openModelPopUp && (
        <BaseModal
          modalId={"upload transactions popup"}
          displayModal={openModelPopUp}
          title="Update current balance"
          disableSecondButton={modalDisabled}
          onHeaderIconClose={() => {
            setOpenModelPopUp(false);
            setIsDisabledBtn(false);
            setModalPopUpMSG("");
            setCurrentBalanceOption("useLatest");
            setManualCurrentBalance("");
            setModalDisabled(false);
            setErrorMessage("");
          }}
          restrictOncloseFunctionInHeader
          onClose={() => {
            setOpenModelPopUp(false);
            setIsDisabledBtn(false);
            setModalPopUpMSG("");
            setCurrentBalanceOption("useLatest");
            setManualCurrentBalance("");
            setModalDisabled(false);
            setErrorMessage("");
          }}
          hideFirstButton
          onConfirm={() => {
            // setModalDisabled(true);
            if (
              currentBalanceOption === "updateAmount" &&
              !manualCurrentBalance
            ) {
              // showInfoToast("please enter amount");
              setErrorMessage("please enter amount");
              setModalDisabled(false);
              return;
            }
            handleModalPopUpFunction();
            return true;
          }}
          // firstButtonName="Yes"
          secondButtonName="Update"
          secondBtnClassTypes="secondary"
        >
          <p>
            {modalPopUpMSG}
            <br />
            <br />
            <b>Is this correct or do you want to update the amount?</b>
          </p>

          <div
            className="grid"
            style={{ gridTemplateColumns: "1fr 1fr 1.2fr" }}
          >
            <div>
              <input
                type="radio"
                name="Use Latest"
                id="Use Latest"
                checked={selectedOption === "useLatest"}
                onChange={() => {
                  setErrorMessage("");
                  handleOptionChange("useLatest");
                }}
                value="useLatest"
              />
              Use latest
            </div>
            <div>
              <input
                type="radio"
                id="Update Amount"
                name="Update Amount"
                checked={selectedOption === "updateAmount"}
                onChange={() => handleOptionChange("updateAmount")}
                value="updateAmount"
              />
              Update amount
            </div>
            <div>
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={""}
                error={errorMessage}
                name="paymentAmount"
                id={"paymentAmount"}
                placeholder="Enter payment amount"
                disabled={selectedOption === "useLatest"}
                value={balance}
                onChange={handleBalanceChange}
                // onBlur={formik.handleBlur}
                showError={errorMessage}
              />
            </div>
          </div>
        </BaseModal>
      )}
    </>
  );
};

export default UploadTransactions;
