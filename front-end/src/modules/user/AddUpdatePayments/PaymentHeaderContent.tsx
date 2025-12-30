import BreadCrumbs from "@/components/BreadCrumbs";
import CustomButton from "@/components/CustomButton/CustomButton";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, OVERVIEW_TABS } from "@/shared/constant/general";
import React, { Fragment } from "react";
import { usePaymentsContext } from "./PaymentContextProvider";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";

export default function PaymentHeaderContent() {
  const {
    router,
    patchData,
    formik,
    isViewMode,
    overviewType,
    overviewProjectId,
    IsActivity,
  }: any = usePaymentsContext();

  function handleCloseRoutes() {
    // First check for the ImportScreen condition

    if (overviewType == OVERVIEW_TABS.project) {
      router.push(
        `${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewProjectId}?active_tab=${projectOverviewTabs.CLAIMS}`
      );
    } else if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      router.back();
    }
  }

  return (
    <Fragment>
      <div>
        <div className="pt_crumbclose">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: isViewMode ? "Payment list" : "Claims",

                path: isViewMode
                  ? AppRoutes.USER_PAYMENTS_LIST
                  : AppRoutes.USER_PAY_APPS,
              },
            ]}
            activeRoute={isViewMode ? "View payment" : "Add payment"}
          />
          <div className="pt_topfilters">
            <div className="pt_pageactions">
              <CustomButton
                actionType="button"
                buttonName="Close"
                buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
                onClick={() => handleCloseRoutes()}
                iconClassName={"fa-light fa-xmark-large"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid pt_data">
        <div className="pt_data_clear">
          <h4>
            {formik?.values?.cash_retention_type === "Claim"
              ? "Payment claim"
              : "Retention claim"}
          </h4>
          <h5>
            <b>Claim ID:</b> {patchData?.payment_claim_id || ""}
          </h5>
          <h5>
            <span className="valid">
              {" "}
              <i className="fa-light fa-circle-check"></i>{" "}
              {patchData?.status_in_ui || ""}
            </span>
          </h5>
        </div>
        <div>
          <h5>Claim Type</h5>
          <h4>{patchData?.claim_type || ""}</h4>
        </div>
        <div>
          <h5>Claim amount</h5>
          <h4>
            $
            {formik?.values?.claim_amount
              ? Number(formik?.values?.claim_amount)
                  ?.toFixed(2)
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              : "0.00"}
          </h4>
          &nbsp;
          <h6>{`${formik?.values?.gst_summary ?? 0 ? "inc" : "exc"} GST`}</h6>
          <h5>
            <b>GST:</b>$
            {formik?.values?.gst_summary
              ? Number(formik?.values?.gst_summary)
                  ?.toFixed(2)
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              : "0.00"}
          </h5>
        </div>
      </div>
    </Fragment>
  );
}
