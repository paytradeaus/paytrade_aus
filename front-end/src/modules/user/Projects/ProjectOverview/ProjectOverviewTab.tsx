import React, { Fragment, useEffect, useState } from "react";

import TabSwitch from "@/components/TabSwitch";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";

import { useLoaderContext } from "@/context/useLoader";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BaseModal from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import { bankOverviewTabOptions } from "./ProjectOverview.constant";
import { viewContractDetailsById } from "../../Contracts/contracts.functions";
import { useProjectOverviewContext } from "./ProjectOverviewContext";
import { viewProjectDetails } from "./ProjectOverview.function";
import { AppRoutes } from "@/shared/constant/appRoutes";

export default function ProjectDetailsTab({ setData }: any) {
  const dispatch = useDispatch();
  const { setActiveTab, activeTab }: any = useProjectOverviewContext();
  const router = useRouter();
  const [projectData, setProjectData] = useState<any>({});
  const [contractData, setContractData] = useState<any>({});
  const { setLoader }: any = useLoaderContext();
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const params = useParams();
  function handleCompliance() {
    router.push(
      `${AppRoutes.USER_COMPLIANCE_OVERVIEW}?project=${projectData?.project_id}&st=${projectData?.project_status}`
    );
  }

  useEffect(() => {
    getProjectOverview();
  }, []);

  async function getProjectOverview() {
    setLoader(true);
    if (params.data?.[0]) {
      const payload = {
        viewProjectDetailsId: params.data[0], // Use the correct key expected by viewProjectDetails
      };

      try {
        const userData = await viewProjectDetails(payload);
        if (userData) {
          setProjectData(userData);
          setData(userData);
        } else {
          setWrongIdCheck(true);
        }
      } catch (error) {
        console.error("Error fetching project details:", error);
        setWrongIdCheck(true);
      }
    }
    setLoader(false);
  }

  return (
    <Fragment>
      <div className="pt_overviewinfo">
        <div>
          <div>
            <div className="pt_infolist listData">
              <div className="table-container">
                <table className="responsive-table">
                  <tr>
                    <td className="data1 setPro">
                      <div className="pt_infolistdata">
                        <h6>Site address</h6>
                        <span className="ptSiteAdd">
                          {projectData?.site_address}
                        </span>
                      </div>
                    </td>
                    <td className="setPro">
                      <div className="pt_infolistdata">
                        <h6>Your Role</h6>
                        <span>{projectData?.project_role}</span>
                      </div>
                    </td>
                    <td className="setPro">
                      <div className="pt_infolistdata">
                        <h6>Head Contract (excluding GST)</h6>
                        {projectData &&
                        typeof projectData.head_contract_sum === "number" ? (
                          <>
                            $
                            {projectData.head_contract_sum.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="setPro">
                      <div className="pt_infolistdata">
                        <h6>Description</h6>
                        <span className="ptSiteAdd">
                          {projectData?.project_description}
                        </span>
                      </div>
                    </td>
                    <td className="setPro">
                      <div className="pt_infolistdata">
                        <h6>Project Status</h6>
                        {projectData?.project_status === "In Progress"
                          ? "In Progress"
                          : projectData?.project_status}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
          <div className="pt_infodata">
            <div className="pt_infolistdata">
              <h6>Project Trust Account</h6>
              {projectData?.pta_eligibility === "Yes"
                ? "Eligible"
                : "Not Eligible"}
            </div>

            <div className="pt_infolistdata">
              <h6>Retention Trust Account</h6>
              {projectData?.rta_eligibility === "Yes"
                ? "Eligible"
                : "Not Eligible"}
            </div>
            <div className="pt_infolistdata">
              <h6>Compliance</h6>
              <div
                className={
                  projectData?.compliance === "Action required"
                    ? "actionRequired"
                    : "actionNotRequired"
                }
                onClick={() =>
                  projectData?.compliance === "Action required"
                    ? handleCompliance()
                    : {}
                }
              >
                {projectData?.compliance}
              </div>
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
          firstButtonName="Back"
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
              router.replace(
                `${AppRoutes.USER_PROJECTS_OVERVIEW}/${projectData?.id}`
              );
              setActiveTab(value);
            }}
            tabValue={activeTab}
          />
        </div>
      </div>
    </Fragment>
  );
}
