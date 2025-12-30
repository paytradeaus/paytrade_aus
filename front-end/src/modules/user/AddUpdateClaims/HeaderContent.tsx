import BreadCrumbs from "@/components/BreadCrumbs";
import CustomButton from "@/components/CustomButton/CustomButton";
import ToggleInputGroup from "@/components/Inputs/ToggleInputGroup";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, quickAddRoutes } from "@/shared/constant/general";
import React, { Fragment } from "react";
import { paymentTypes, typesOfClaims } from "./AddUpdateClaims.constant";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";

export default function HeaderContent() {
  const {
    router,
    formik,
    claimData,
    isEditable,
    RetentionId,
    CashRetentionType,
    isViewMode,
    IsActivity,
    retrieveAfterAddingQuickRecord,
    setQuickContractId,
    setClientRole,
  }: any = useAddUpdateClaimsContext();

  function splitAmount(value: any) {
    return value
      ? value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : "0.00";
  }

  const handleNavigation = () => {
    if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else if (retrieveAfterAddingQuickRecord == quickAddRoutes.CLAIMS) {
      router.push(AppRoutes.USER_PAY_APPS);
    } else {
      router.back();
    }
  };

  return (
    <Fragment>
      <div className="pt_crumbclose">
        <BreadCrumbs
          routePaths={[
            {
              name: "Dashboard",
              path: AppRoutes.ADMIN_DASHBOARD,
            },
            {
              name: "Claims",
              path: AppRoutes.USER_PAY_APPS,
            },
          ]}
          activeRoute={
            isEditable
              ? "Edit payment claim"
              : isViewMode
              ? "View payment claim"
              : "Add payment claim"
          }
        />
        <div className="pt_topfilters">
          <div className="pt_pageactions">
            <CustomButton
              actionType="button"
              buttonName="Close"
              buttonType={`${buttonType.CONTRAST} ${buttonType.SMALL_BUTTON}`}
              onClick={() => handleNavigation()}
              iconClassName={"fa-light fa-xmark-large"}
            />
          </div>
        </div>
      </div>

      <div className="grid pt_fullpagetitle">
        <div>
          {claimData?.payment_claim_id ? (
            <h4>Payment claim - {claimData?.payment_claim_id}</h4>
          ) : (
            !isEditable && !isViewMode && <h4>Add payment claim</h4>
          )}
          {(claimData?.status_in_ui || claimData?.status) && (
            <h5>
              <span
                className={claimData?.status === "Draft" ? "invalid" : "valid"}
              >
                <i className="fa-light fa-circle-check"></i>
                {claimData?.status_in_ui
                  ? claimData?.status_in_ui
                  : claimData?.status}
              </span>
            </h5>
          )}
        </div>
        <div>
          <h5>Claim type</h5>
          <ToggleInputGroup
            type="radio"
            name="cash_retention_type"
            options={typesOfClaims}
            selectedValue={formik?.values?.cash_retention_type}
            onChange={(e: any) =>
              formik?.setFieldValue("cash_retention_type", e?.target?.value)
            }
            disabled
          />
        </div>
        <div>
          <h5>Transaction Type</h5>
          <ToggleInputGroup
            type="radio"
            name="claim_type"
            options={paymentTypes}
            selectedValue={formik?.values?.claim_type}
            onChange={(e: any) => {
              formik?.setFieldValue("claim_type", e?.target?.value);
              setQuickContractId(null);
              setClientRole(null);
            }}
            disabled={
              isEditable ||
              isViewMode ||
              formik?.values?.cash_retention_type === "Retention claim"
            }
          />
        </div>
        <div className="right">
          <h5>Claim amount</h5>
          <h4>${splitAmount(formik?.values?.totalAmount)}</h4>
        </div>
      </div>
      {CashRetentionType === "RetentionClaim" && (
        <div className="d_flex_justify_end">
          <h4>
            {" "}
            Retention List Id - {claimData?.retention_id || RetentionId || ""}
          </h4>
        </div>
      )}
    </Fragment>
  );
}
