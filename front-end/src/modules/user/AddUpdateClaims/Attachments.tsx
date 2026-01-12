import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import { uploadFile } from "@/shared/constant/general";
import MultipleFileHandler from "@/components/MultipleFileHandler";
import {
  DownloadS75Template,
  fetchSubContractorClaimsByHeadContractor,
} from "./AddUpdateClaims.function";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { useEffect } from "react";
import BaseModal from "@/components/BaseModal";
import DynamicTable from "@/components/Table";
import { GridListHeaders } from "./AddUpdateClaims.constant";
import { formatDate } from "@/utils";
import { RootState, useAppSelector } from "@/redux/store";

export default function Attachments() {
  const {
    formik,
    mode,
    compulsoryAttachments,
    setCompulsoryAttachments,
    optionalAttachments,
    setOptionalAttachments,
    otherOptionalAttachments,
    setOtherOptionalAttachments,
    isViewMode,
    clientRole,
    projectRole,
    loader,
    setLoader,
    generateClaimData,
    setGenerateClaimData,
    generateClaimCount,
    setGenerateClaimCount,
    perPage,
    togglePaymentReceivables,
    setPerPage,
    page,
    setPage,
    openGenereatedClaimModel,
    setOpenGenereatedClaimModel,
    isReasonDataLoaded,
    setIsReasonDataLoaded,
    isBasic,
    isPaid,
    isNotPaid,
    reasonsData,
    setReasonsData,
    noticesAutomated,
    isEditable,
    claimStatus,
    claimData,
    isFree,
  }: any = useAddUpdateClaimsContext();

  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  const truncateText = (text: any, maxLength = 25) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const resetClaimReasons = () => {
    setGenerateClaimData([]);
    setIsReasonDataLoaded(false);
  };

  useEffect(() => {
    resetClaimReasons();
  }, [
    formik?.values?.projectId,
    formik?.values?.contractId,
    formik?.values?.claim_type,
  ]);

  useEffect(() => {
    const shouldFetch =
      // !isViewMode &&
      // (claimStatus === "Draft" || !claimStatus) &&
      userMode !== "Onboarding" &&
      formik?.values?.claim_type === "Receivable" &&
      projectRole === "Head Contractor" &&
      clientRole === "Principal" &&
      !isReasonDataLoaded &&
      !!formik?.values?.projectId;

    if (shouldFetch) {
      const payload = {
        project_id: formik?.values?.projectId || null,
        page,
        claim_id: claimData?.payment_claim_id || null,
      };

      fetchS75Claims(
        payload,
        setLoader,
        setGenerateClaimData,
        setGenerateClaimCount
      );
    }
  }, [
    formik?.values?.claim_type,
    formik?.values?.projectId,
    projectRole,
    clientRole,
    isReasonDataLoaded,
    page,
    isViewMode,
    claimStatus,
  ]);

  const handleDownload = async () => {
    if (loader) return; // prevent extra clicks
    setLoader(true);

    try {
      const result = await DownloadS75Template();

      if (result?.data?.file_path && result?.data?.file_name) {
        const link = document.createElement("a");
        link.href = result.data.file_path;
        link.download = result.data.file_name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setLoader(false);
    }
  };

  const handleGenerateS75 = () => {
    if (isReasonDataLoaded && generateClaimData?.length > 0) {
      // Don't fetch again, just open modal
      setOpenGenereatedClaimModel(true);
      return;
    }
    const payload = {
      project_id: formik?.values?.projectId || null,
      page: null,
      items_per_page: null,
      claim_id: claimData?.payment_claim_id || null,
    };

    fetchS75Claims(
      payload,
      setLoader,
      (data) => {
        setGenerateClaimData(data);
        // setIsReasonDataLoaded(true); // ✅ Mark as loaded
        if (data?.length > 0) setOpenGenereatedClaimModel(true);
      },
      setGenerateClaimCount
    );
  };

  const fetchS75Claims = async (
    payload: any,
    setLoader: (value: boolean) => void,
    onDataSet: (data: any[]) => void,
    setGenerateClaimCount: (count: number) => void
  ) => {
    try {
      setLoader(true);

      const finalPayload = {
        ...payload,
        claim_id: payload?.claim_id || null, // ✅ ensure it always exists
      };

      const response = await fetchSubContractorClaimsByHeadContractor(
        finalPayload
      );

      if (response) {
        const responseData = JSON.parse(JSON.stringify(response)); // safe deep copy

        const parsedClaims = responseData?.payment_claims?.map(
          (claim: any, index: number) => {
            const unpaidAmountValue = claim?.unpaid_amount
              ? Number(claim.unpaid_amount.replace(/,/g, ""))
              : 0;
            return {
              cash_retention_type: claim?.cash_retention_type,
              claim_type: claim?.claim_type,
              client_supplier_name: claim?.client_supplier_name,
              project_name: claim?.project_name,
              contract_name: claim?.contract_name,
              claim_date: formatDate(claim?.claim_date),
              claim_amount: `$ ${
                claim?.claim_amount
                  ? Number(claim.claim_amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"
              }`,
              unpaid_amount: `$ ${unpaidAmountValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              unpaid_amount_sort: unpaidAmountValue,
              status: truncateText(claim?.list_status),
              payment_claim_id: claim?.payment_claim_id,
              user_input: claim?.unpaid_reason || "", // ✅ auto-fill if backend sent unpaid_reason
              __index__: index, // 👈 used to update specific row later
              user_input_error: "",
            };
          }
        );
        onDataSet(parsedClaims || []);
        setGenerateClaimCount(responseData.total_count || 0);
        // ✅ NEW LOGIC BELOW
        const hasAnyReason = parsedClaims?.some((row: any) => !!row.user_input);
        setIsReasonDataLoaded(hasAnyReason);
      } else {
        console.warn("Failed to fetch subcontractor claims.");
      }
    } catch (error: any) {
      showErrorToast(
        error.message ||
          "Something went wrong while fetching subcontractor claims"
      );
    } finally {
      setLoader(false);
    }
  };

  const handleUserInputChange = (value: string, rowIndex: number) => {
    const updatedData = [...generateClaimData];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      user_input: value,
      user_input_error: value.trim() ? "" : "Reason is required",
    };
    setGenerateClaimData(updatedData);
  };

  const handleSaveReasons = async () => {
    let isValid = true;
    const updatedData = generateClaimData.map((item: any) => {
      if (!item.user_input.trim()) {
        isValid = false;
        return {
          ...item,
          user_input_error: "Reason is required",
        };
      }
      return {
        ...item,
        user_input_error: "",
      };
    });

    setGenerateClaimData(updatedData);

    if (!isValid) {
      // showErrorToast("Please fill in all required reasons.");
      return;
    }

    const payload = updatedData.map((item: any) => ({
      payment_claim_id: item.payment_claim_id,
      reason: item.user_input.trim(), // ✅ always send latest user_input
    }));

    try {
      // await saveReasonsToBackend(payload);
      setReasonsData(payload || []);
      showSuccessToast(
        !isReasonDataLoaded
          ? "Reasons saved successfully."
          : "Reasons updated successfully."
      );
      setIsReasonDataLoaded(true);
      setOpenGenereatedClaimModel(false);
      return true;
    } catch (error) {
      showErrorToast("Failed to save reasons.");
      console.error(error);
      return false;
    }
  };

  const GenereateRenderData = [
    { key: "payment_claim_id" },
    { key: "client_supplier_name" },
    { key: "unpaid_amount" },
    {
      key: "user_input",
      showInput: true,
      valueAccessor: (row: any) => row.user_input || "", // 👈 add this
      onChange: (value: string, rowIndex: number) => {
        handleUserInputChange(value, rowIndex);
      },
    },
  ];

  function isSupportingDocRequired() {
    const values = formik?.values;

    // Check if user is premium
    const isPremiumUser = noticesAutomated === true;

    // Condition 1 (existing)
    const condition1 =
      !isBasic &&
      isNotPaid &&
      values?.claim_type === "Receivable" &&
      projectRole === "Head Contractor" &&
      clientRole === "Principal" &&
      generateClaimData?.length > 0 &&
      userMode !== "Onboarding";

    // Condition 2 (existing)
    const condition2 =
      !isBasic &&
      isPaid &&
      values?.claim_type === "Receivable" &&
      projectRole === "Head Contractor" &&
      clientRole === "Principal" &&
      userMode !== "Onboarding";

    if (isPremiumUser && values?.claim_type === "Receivable") {
      return false; // Premium user does NOT need supporting doc for Receivable
    }
    if (isFree && values?.claim_type === "Receivable") {
      return false; // free plan user does NOT need supporting doc for Receivable
    }

    if (!isPremiumUser && (condition1 || condition2)) {
      return false; // Non-premium user meets condition 1 or 2 → not required
    }

    // Default: required
    return values?.claim_type === "Receivable";
  }

  return (
    <>
      <div className="pt_attachments mb_1">
        {/* <div className="grid">
          {formik?.values?.claim_type === "Receivable" ? (
            <div className="flex items-center justify-between">
              <MultipleFileHandler
                titleName="Supporting statement attachments"
                required
                afterFileChange={(modifiedFiles: any) =>
                  setCompulsoryAttachments(modifiedFiles)
                }
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                existingFiles={compulsoryAttachments}
                disableChooseFileBtn={isViewMode}
                hideDeleteButton={
                  isViewMode ||
                  compulsoryAttachments?.some((f: any) =>
                    f?.file_name?.includes("S75-support-statement")
                  )
                }
                // hideDeleteButton={isViewMode}
                handleDeleteFile={(modifiedFiles: any) => {}}
                displayInfoIcon
                infoText={` Section 75 of the Building Industry Fairness (Security of
                Payment) Act 2017 (BIF Act) requires a "supporting statement" to
                be included with every payment claim. This statement must either
                declare that all subcontractors have been paid all amounts owed,
                or, if not, provide specific details for each unpaid
                subcontractor, including their name, the unpaid amount, details
                of the relevant payment claim, the date of the work, and the
                reasons for non-payment.`}
              />
            </div>
          ) : (
            <MultipleFileHandler
              titleName="Optional supporting statement attachments"
              afterFileChange={(modifiedFiles: any) =>
                setOtherOptionalAttachments(modifiedFiles)
              }
              filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
              existingFiles={otherOptionalAttachments}
              disableChooseFileBtn={isViewMode}
              hideDeleteButton={isViewMode}
              handleDeleteFile={(modifiedFiles: any) => {}}
            />
          )}
          <MultipleFileHandler
            titleName="Other optional attachments"
            afterFileChange={(modifiedFiles: any) =>
              setOptionalAttachments(modifiedFiles)
            }
            filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
            existingFiles={optionalAttachments}
            disableChooseFileBtn={isViewMode}
            hideDeleteButton={isViewMode}
            handleDeleteFile={(modifiedFiles: any) => {}}
          />
        </div> */}
        <div className="grid">
          {/* Compulsory Supporting Statement for Receivable */}
          {isSupportingDocRequired() &&
            formik?.values?.claim_type === "Receivable" && (
              <div className="flex items-center justify-between">
                <MultipleFileHandler
                  titleName="Supporting statement attachments"
                  required
                  afterFileChange={(modifiedFiles: any) =>
                    setCompulsoryAttachments(modifiedFiles)
                  }
                  filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                  existingFiles={compulsoryAttachments}
                  disableChooseFileBtn={isViewMode}
                  hideDeleteButton={
                    isViewMode ||
                    compulsoryAttachments?.some((f: any) =>
                      f?.file_name?.includes("S75-support-statement")
                    )
                  }
                  handleDeleteFile={(modifiedFiles: any) => {}}
                  displayInfoIcon
                  infoText={`Section 75 of the Building Industry Fairness (Security of Payment) Act 2017 (BIF Act) requires a "supporting statement" to be included with every payment claim. This statement must either declare that all subcontractors have been paid all amounts owed, or, if not, provide specific details for each unpaid subcontractor, including their name, the unpaid amount, details of the relevant payment claim, the date of the work, and the reasons for non-payment.`}
                />
              </div>
            )}

          {/* S75 Document (separate handler) */}
          {formik?.values?.claim_type === "Receivable" &&
            formik?.values?.cash_retention_type === "Claim" &&
            mode != "add" &&
            compulsoryAttachments.length > 0 && (
              <div className="flex items-center justify-between ">
                <MultipleFileHandler
                  titleName="Generated S75 Document"
                  required={false} // not compulsory, uploaded optionally
                  // afterFileChange={(modifiedFiles: any) =>
                  //   setS75Attachments(modifiedFiles)
                  // }
                  filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                  existingFiles={compulsoryAttachments?.filter((file: any) =>
                    file.file_name?.includes("S75")
                  )}
                  // fileNameTruncateSize={10}
                  disableChooseFileBtn={isViewMode || mode != "add"}
                  hideDeleteButton={isViewMode || mode != "add"}
                  handleDeleteFile={(modifiedFiles: any) => {}}
                />
              </div>
            )}

          {/* Optional Supporting Statement only for Billables */}
          {formik?.values?.claim_type === "Billable" && (
            <MultipleFileHandler
              titleName="Optional supporting statement attachments"
              afterFileChange={(modifiedFiles: any) =>
                setOtherOptionalAttachments(modifiedFiles)
              }
              filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
              existingFiles={otherOptionalAttachments}
              disableChooseFileBtn={isViewMode}
              hideDeleteButton={isViewMode}
              handleDeleteFile={(modifiedFiles: any) => {}}
            />
          )}

          {/* Other Optional Attachments (always visible) */}
          <MultipleFileHandler
            titleName="Other optional attachments"
            afterFileChange={(modifiedFiles: any) =>
              setOptionalAttachments(modifiedFiles)
            }
            filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
            existingFiles={optionalAttachments}
            disableChooseFileBtn={isViewMode}
            hideDeleteButton={isViewMode}
            handleDeleteFile={(modifiedFiles: any) => {}}
          />
        </div>

        {openGenereatedClaimModel && generateClaimData?.length > 0 && (
          <BaseModal
            title="Subcontractor Claim List"
            displayModal={openGenereatedClaimModel}
            onClose={() => setOpenGenereatedClaimModel(false)}
            secondButtonName={!isReasonDataLoaded ? "Save" : "Update"}
            onConfirm={handleSaveReasons}
            halfScreenPopup
            firstButtonName={!isReasonDataLoaded ? "Close" : "Cancel"}
          >
            <div className="container-fluid">
              <div className="grid">
                <div className="pt_box">
                  <DynamicTable
                    headers={GridListHeaders} // ✅ Replace with actual headers
                    gridData={
                      generateClaimData?.length > 0 ? generateClaimData : []
                    }
                    gridActions={[]} // ✅ Define if actions like edit/delete needed
                    onRowClick={(data: any) => {}}
                    showLoader={loader}
                    loaderColSpan={10}
                    renderRowList={GenereateRenderData} // ✅ Replace with your render function
                    currentPage={page}
                    hidePagination
                    entriesPerPage={perPage}
                    onEntriesPerPageChange={setPerPage}
                    onPageChange={setPage}
                    totalEntries={generateClaimCount}
                    customHallowGrid="half_screen_modal_no_grid_Data"
                  />
                </div>
              </div>
            </div>
          </BaseModal>
        )}
      </div>
      {/* ✅ Conditionally show small button */}
      {userMode !== "Onboarding" &&
        projectRole === "Head Contractor" &&
        clientRole === "Principal" &&
        formik?.values?.claim_type === "Receivable" &&
        formik?.values?.cash_retention_type === "Claim" && (
          <div className="pt_attachments mb_1">
            <div className="grid">
              <>
                {/* ✅ CASE 1: BASIC PLAN + NOT PAID */}
                {isBasic && isNotPaid && (
                  <div className="pt_attachments mb_1 notice-block">
                    <button
                      // type="button"
                      className="download-btn contrast smallbutton"
                      onClick={handleDownload}
                    >
                      <i className="fa-light fa-download"></i>Download S75
                      template
                    </button>
                    <div className="grid">
                      <p>
                        <strong>All suppliers not paid.</strong> Please send S75
                        notice.
                      </p>
                    </div>
                  </div>
                )}

                {/* ✅ CASE 2: BASIC PLAN + ALL PAID */}
                {isBasic && isPaid && (
                  <div className="pt_attachments mb_1 notice-block">
                    <button
                      // type="button"
                      className="download-btn contrast smallbutton"
                      onClick={handleDownload}
                    >
                      <i className="fa-light fa-download"></i>Download S75
                      template
                    </button>
                    <div className="grid">
                      <p>
                        <strong>All suppliers paid.</strong> Please send S75
                        notice.
                      </p>
                    </div>
                  </div>
                )}

                {/* ✅ CASE 3: PAID PLAN + NOT PAID */}
                {!isBasic && isNotPaid && (
                  <div className="pt_attachments mb_1 notice-block">
                    <button
                      // type="button"
                      className="download-btn contrast smallbutton"
                      onClick={handleDownload}
                    >
                      <i className="fa-light fa-download"></i>Download S75
                      template
                    </button>
                    <div className="grid">
                      <p>
                        <strong>S75 notice:</strong> All suppliers have not been
                        paid. Please provide the reasons why.{""}
                        <button
                          type="button"
                          className="secondary smallbutton ml_zero_point_five"
                          onClick={handleGenerateS75}
                          disabled={isViewMode || loader}
                        >
                          <i
                            className={`fa-light ${
                              generateClaimData?.some((r: any) => r.user_input)
                                ? "fa-pen-to-square"
                                : "fa-square-plus"
                            }`}
                          />
                          {generateClaimData?.some((r: any) => r.user_input)
                            ? "Edit reason"
                            : "Add reason"}
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {/* ✅ CASE 4: PAID PLAN + ALL PAID */}
                {!isBasic && isPaid && (
                  <div className="pt_attachments mb_1 notice-block">
                    <button
                      // type="button"
                      className="download-btn contrast smallbutton"
                      onClick={handleDownload}
                    >
                      <i className="fa-light fa-download"></i>Download S75
                      template
                    </button>
                    <p>
                      <strong>S75 notice:</strong> All suppliers paid. Please
                      confirm the declaration below.
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        disabled={isViewMode || loader}
                        name="paidDeclaration"
                        onChange={(e) =>
                          formik.setFieldValue(
                            "paidDeclaration",
                            e.target.checked
                          )
                        }
                        checked={
                          isViewMode
                            ? true // ✅ Auto-check when view mode
                            : formik.values.paidDeclaration
                        }
                      />{" "}
                      In accordance with section 75(7) of the Building Industry
                      Fairness (Security of Payment) Act 2017 I,{" "}
                      {formik?.values?.[
                        togglePaymentReceivables() ? "client" : "supplier"
                      ] || ""}
                      , being the head contractor (the Contractor), a director
                      of the head contractor or a person authorised by the head
                      contractor on whose behalf this supporting statement is
                      made, declare that all subcontractors have been paid all
                      amounts owed to them at the date of giving this payment
                      claim.
                    </label>
                  </div>
                )}
              </>
            </div>
          </div>
        )}
    </>
  );
}
