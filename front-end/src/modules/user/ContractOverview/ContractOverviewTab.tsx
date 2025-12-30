import React, { Fragment, useEffect, useState } from "react";
import { formatDate } from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import TabSwitch from "@/components/TabSwitch";
import { bankOverviewTabOptions } from "./ContractOverview.constants";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";
import { useContractOverviewContext } from "./ContractOverviewContext";
import { viewContractDetailsById } from "./ContractOverview.function";
import { useLoaderContext } from "@/context/useLoader";
import { useParams } from "next/navigation";
import Link from "next/link";
import BaseModal from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";

export default function BankAccountDetailsTab() {
  const dispatch = useDispatch();
  const { id, financialOpt, setActiveTab, activeTab }: any =
    useContractOverviewContext();
  const [contractData, setContractData] = useState<any>({});
  const { setLoader }: any = useLoaderContext();
  const [wrongIdCheck, setWorngIdCheck] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const params = useParams();
  const handleViewClick = (fileUrl: any, fileName: any, fileType: any) => {
    if (!fileUrl) return;

    const viewableFileTypes = ["pdf", "jpg", "jpeg", "png", "gif", "txt"];

    if (viewableFileTypes.includes(fileType.toLowerCase())) {
      // Attempt to open in a new tab
      const newTab = window.open(fileUrl, "_blank");
      // If newTab is null, it means the popup was blocked
      if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
        alert("Popup blocked. Please allow popups for this website.");
      }
    } else {
      // Download the file
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  const handlePaymentClick = (event: any) => {
    event.preventDefault();
    setDisplayConfirmationModal(true);
  };
  useEffect(() => {
    getContracts();
  }, []);

  async function getContracts() {
    setLoader(true);
    if (params.data[0]) {
      const payload: any = {
        id: params.data[0] || "",
      };
      const userData = await viewContractDetailsById(payload);

      if (userData) {
        setContractData(userData);
      } else {
        setWorngIdCheck(true);
      }
    }
    setLoader(false);
  }

  return (
    <Fragment>
      <div className="pt_overviewinfo">
        <div className="grid">
          <div className="pt_infolist listData">
            <div className="table-container">
              <table className="responsive-table">
                <tr>
                  <td className="data1 setPro">
                    <div className="pt_infolistdata">
                      <h6>Project name</h6>
                      <span>{contractData?.project_name}</span>
                    </div>
                  </td>
                  <td className="data2 setPro">
                    {" "}
                    <div className="pt_infolistdata">
                      <h6>Site address</h6>
                      <span className="ptSiteAdd">
                        {contractData?.site_address}
                      </span>
                    </div>
                  </td>
                  <td className="data3 setPro">
                    {" "}
                    <div className="pt_infolistdata">
                      <h6>
                        {" "}
                        {contractData?.client_supplier_type || "Supplier"}
                      </h6>
                      <span>{contractData?.client_supplier_name}</span>
                    </div>
                  </td>
                  <td className="data4 setPro">
                    {" "}
                    <div className="pt_infolistdata">
                      <h6>Initial Contract sum (excluding GST)</h6>
                      <span>
                        {contractData &&
                        typeof contractData.initial_contract_sum ===
                          "number" ? (
                          <>
                            $
                            {contractData.initial_contract_sum.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </>
                        ) : null}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="data1 setPro">
                    <div className="pt_infolistdata alignBox">
                      <h6>Retention Type</h6>
                      <span>{contractData?.retention_type}</span>
                    </div>
                  </td>
                  <td className="data2 setPro">
                    {" "}
                    <div className="pt_infolistdata alignBox">
                      <h6>Contract</h6>
                      <span>
                        <Link
                          onClick={(e) => {
                            e.preventDefault();
                            handleViewClick(
                              contractData?.file,
                              contractData?.file_name,
                              contractData?.file_type
                            );
                          }}
                          href={""}
                          className="tableDataHighlight contractText"
                        >
                          View
                        </Link>
                      </span>
                    </div>
                  </td>
                  <td className="data3 setPro">
                    {" "}
                    <div className="pt_infolistdata alignBox">
                      <h6>Contract start date</h6>
                      <span>
                        {contractData?.contract_start_date
                          ? formatDate(contractData?.contract_start_date)
                          : ""}
                      </span>
                    </div>
                  </td>
                  <td className="data4 setPro">
                    {" "}
                    <div className="pt_infolistdata alignBox">
                      <h6>Latent defect end date</h6>
                      <span>
                        {contractData?.defect_liability_end_date
                          ? formatDate(contractData?.defect_liability_end_date)
                          : ""}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="setPro">
                    <div className="pt_infolistdata alignBox">
                      <h6>Payment Details</h6>
                      <span>
                        <Link
                          onClick={handlePaymentClick}
                          href={""}
                          className="tableDataHighlight contractText"
                        >
                          View
                        </Link>
                      </span>
                    </div>
                  </td>
                  <td className="setPro">
                    <div className="pt_infolistdata alignBox">
                      <h6
                        className="tooltip"
                        title={
                          "Under the BIF Act, a progress payment or final payment must be paid by the date stated in the construction contract (due date), or if the contract does not state a due date within 10 business days after the payment claim is given to the respondent. For some contracts, the due date stated in a contract cannot be greater than the following maximum timeframes set out under the QBCC Act, otherwise they become void and the default timeframe of 10 business days applies: subcontracts or construction management trade contracts the maximum payment term is 25 business days commercial building contracts the maximum payment term is 15 business days. A person given a payment claim, the respondent, must respond to all payment claims."
                        }
                        data-placement="top"
                      >
                        PAYMENT TERMS{" "}
                        <i className="fa-light fa-circle-info inftc"></i>
                      </h6>
                      <span>
                        {contractData?.payment_terms
                          ? `${contractData?.payment_terms} days`
                          : ""}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"transactions delete modal"}
          title={"Payment Details"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          firstButtonName="Close"
          hideSecondButton={true} // Hide the confirm button
        >
          {contractData?.payment_from_account_name && (
            <div>
              <FormikControl
                label={"Payment from account"}
                name={"payment"}
                id={"payment"}
                disabled={true}
                control={InputType.TEXT_FIELD}
                renderKey="label"
                valueKey="value"
                value={contractData?.payment_from_account_name}
              />
            </div>
          )}
          {contractData?.retention_from_account_name && (
            <div>
              <FormikControl
                label={"Retention from account"}
                name={"retention"}
                id={"retention"}
                disabled={true}
                control={InputType.TEXT_FIELD}
                renderKey="label"
                valueKey="value"
                value={contractData.retention_from_account_name}
              />
            </div>
          )}

          {contractData?.payment_to_account_name && (
            <div>
              <FormikControl
                label={"Payment to account"}
                name={"paymentTo"}
                id={"paymentTo"}
                disabled={true}
                control={InputType.TEXT_FIELD}
                renderKey="label"
                valueKey="value"
                value={contractData.payment_to_account_name}
              />
            </div>
          )}
        </BaseModal>
      )}
      <div className="grid">
        <div className="pt_filters pt_scrollable">
          <TabSwitch
            tabOptions={bankOverviewTabOptions}
            onChange={(value: any) => {
              dispatch(setScreenDetails({}));
              setActiveTab(value);
            }}
            tabValue={activeTab}
          />
        </div>
      </div>
    </Fragment>
  );
}
