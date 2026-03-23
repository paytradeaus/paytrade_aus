import { RootState, useAppSelector } from "@/redux/store";
import {
  subscriptionColorCodes,
  subscriptionPlanFeatures,
} from "@/shared/constant/data";
import React, { useEffect, useState } from "react";

type Plan = "Basic" | "Premium" | "Platinum";

type Feature = {
  name: string;
  basic: boolean;
  premium: boolean;
  platinum: boolean;
};

interface PlanTableProps {
  features: any[];
  subscriptionPlanTypes?: any;
  isYearly?: boolean;
}

const withPlanTable = (
  WrappedComponent: React.ComponentType<PlanTableProps>
) => {
  return (props: PlanTableProps) => {
    const { features, subscriptionPlanTypes, isYearly } = props;
    return <WrappedComponent features={features} subscriptionPlanTypes={subscriptionPlanTypes} isYearly={isYearly} />;
  };
};

const PlanTable: React.FC<PlanTableProps> = ({ features, subscriptionPlanTypes, isYearly }) => {
  const [tableFeatures, setTableFeatures] = useState<any[]>([]);
  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  function isLightTheme() {
    return getTheme === "light";
  }

  function findPlan(planList: any[], ...names: string[]) {
    for (const name of names) {
      const found = planList.find(
        (p: any) => p.plan_name?.toLowerCase().trim() === name.toLowerCase()
      );
      if (found) return found;
    }
    return null;
  }

  function getPlansFromApi() {
    const planList = isYearly
      ? subscriptionPlanTypes?.yearly_plan_list || []
      : subscriptionPlanTypes?.monthly_plan_list || [];

    const freePlan = subscriptionPlanTypes?.free_plan || null;
    const standardPlan = findPlan(planList, "Standard", "Premium");
    const advancedPlan = findPlan(planList, "Advanced", "Platinum");
    const proAuditPlan = findPlan(planList, "Pro Audit", "ProAudit", "Pro-Audit");

    return { freePlan, standardPlan, advancedPlan, proAuditPlan };
  }

  function getPriceRow() {
    const { freePlan, standardPlan, advancedPlan, proAuditPlan } = getPlansFromApi();
    const suffix = isYearly ? "/yr" : "/mo";
    const fallback = subscriptionPlanFeatures[0];

    return {
      name: "",
      basicText: "Free",
      standardText: standardPlan ? `${standardPlan.price}${suffix}` : (fallback?.standardText || ""),
      advancedText: advancedPlan ? `${advancedPlan.price}${suffix}` : (fallback?.advancedText || ""),
      proAuditText: proAuditPlan ? `${proAuditPlan.price}${suffix}` : (fallback?.proAuditText || ""),
    };
  }

  function getItemDisplayValue(plan: any, featureName: string): { text?: string; enabled?: boolean } | null {
    if (!plan?.plan_items) return null;
    const item = plan.plan_items.find(
      (pi: any) => pi.item_name?.toLowerCase().trim() === featureName.toLowerCase().trim()
    );
    if (!item) return null;
    if (item.is_unlimited) return { text: "Unlimited" };
    if (item.limit_value !== null && item.limit_value !== undefined) return { text: String(item.limit_value) };
    return { enabled: true };
  }

  function buildDynamicFeatureRows() {
    const { freePlan, standardPlan, advancedPlan, proAuditPlan } = getPlansFromApi();
    const hardcodedRows = subscriptionPlanFeatures.slice(1);

    return hardcodedRows.map((row) => {
      const basicVal = getItemDisplayValue(freePlan, row.name);
      const standardVal = getItemDisplayValue(standardPlan, row.name);
      const advancedVal = getItemDisplayValue(advancedPlan, row.name);
      const proAuditVal = getItemDisplayValue(proAuditPlan, row.name);

      const updated: any = { ...row };

      if (basicVal) {
        if (basicVal.text !== undefined) {
          updated.basicText = basicVal.text;
          updated.basic = undefined;
        } else if (basicVal.enabled !== undefined) {
          updated.basic = basicVal.enabled;
          updated.basicText = undefined;
        }
      }
      if (standardVal) {
        if (standardVal.text !== undefined) {
          updated.standardText = standardVal.text;
          updated.standard = undefined;
        } else if (standardVal.enabled !== undefined) {
          updated.standard = standardVal.enabled;
          updated.standardText = undefined;
        }
      }
      if (advancedVal) {
        if (advancedVal.text !== undefined) {
          updated.advancedText = advancedVal.text;
          updated.advanced = undefined;
        } else if (advancedVal.enabled !== undefined) {
          updated.advanced = advancedVal.enabled;
          updated.advancedText = undefined;
        }
      }
      if (proAuditVal) {
        if (proAuditVal.text !== undefined) {
          updated.proAuditText = proAuditVal.text;
          updated.proAudit = undefined;
        } else if (proAuditVal.enabled !== undefined) {
          updated.proAudit = proAuditVal.enabled;
          updated.proAuditText = undefined;
        }
      }

      return updated;
    });
  }

  useEffect(() => {
    const currentCode = isLightTheme()
      ? subscriptionColorCodes.BLACK
      : subscriptionColorCodes.WHITE;

    const priceRow = subscriptionPlanTypes
      ? { ...getPriceRow(), basicColorCode: currentCode, standardColorCode: currentCode, advancedColorCode: currentCode, proAuditColorCode: currentCode }
      : { ...subscriptionPlanFeatures[0], basicColorCode: currentCode, standardColorCode: currentCode, advancedColorCode: currentCode, proAuditColorCode: currentCode };

    const featureRows = subscriptionPlanTypes
      ? buildDynamicFeatureRows()
      : subscriptionPlanFeatures.slice(1);

    setTableFeatures([priceRow, ...featureRows]);
  }, [getTheme, subscriptionPlanTypes, isYearly]);

  return (
    <div className="grid">
      <div className="pt_defaulttable_scroll">
        <table className="pt_defaulttable">
          <thead>
            <tr>
              <th>Feature</th>
              <th className="centered">Basic</th>
              <th className="centered">Standard</th>
              <th className="centered">Advanced</th>
              <th className="centered">Pro Audit</th>
            </tr>
          </thead>
          <tbody>
            {tableFeatures?.length > 0 &&
              tableFeatures.map((feature, index) => (
                <tr className="largeicon" key={index}>
                  <td>{feature.name}</td>
                  <td className="centered">
                    {feature?.basicText ? (
                      <span
                        style={{
                          color: feature?.basicColorCode
                            ? feature?.basicColorCode
                            : "#2a7b6f",
                        }}
                        className="subscriptionContent"
                      >
                        {" "}
                        {feature?.basicText}{" "}
                      </span>
                    ) : (
                      <i
                        className={`fa-light ${
                          feature.basic ? "fa-check valid" : "fa-xmark invalid"
                        }`}
                      />
                    )}
                  </td>
                  <td className="centered">
                    {feature?.standardText ? (
                      <span
                        style={{
                          color: feature?.standardColorCode
                            ? feature?.standardColorCode
                            : "#2a7b6f",
                        }}
                        className="subscriptionContent"
                      >
                        {" "}
                        {feature?.standardText}{" "}
                      </span>
                    ) : (
                      <i
                        className={`fa-light ${
                          feature.standard
                            ? "fa-check valid"
                            : "fa-xmark invalid"
                        }`}
                      />
                    )}
                  </td>
                  <td className="centered">
                    {feature?.advancedText ? (
                      <span
                        style={{
                          color: feature?.advancedColorCode
                            ? feature?.advancedColorCode
                            : "#2a7b6f",
                        }}
                        className="subscriptionContent"
                      >
                        {" "}
                        {feature?.advancedText}{" "}
                      </span>
                    ) : (
                      <i
                        className={`fa-light ${
                          feature.advanced
                            ? "fa-check valid"
                            : "fa-xmark invalid"
                        }`}
                      />
                    )}
                  </td>
                  <td className="centered">
                    {feature?.proAuditText ? (
                      <span
                        style={{
                          color: feature?.proAuditColorCode
                            ? feature?.proAuditColorCode
                            : "#2a7b6f",
                        }}
                        className="subscriptionContent"
                      >
                        {" "}
                        {feature?.proAuditText}{" "}
                      </span>
                    ) : (
                      <i
                        className={`fa-light ${
                          feature.proAudit
                            ? "fa-check valid"
                            : "fa-xmark invalid"
                        }`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            {/* Uncomment and update the following section if you have plan selection buttons */}
            {/* <tr class="fullbuttons">
          <td></td>
          <td class="centered">
            <a>
              <button class="contrast" disabled>
                Current plan
              </button>
            </a>
          </td>
          <td class="centered">
            <a href="upgrade.html">
              <button class="secondary">
                Choose plan
                <i class="fa-light fa-arrow-right right"></i>
              </button>
            </a>
          </td>
          <td class="centered">
            <a href="upgrade.html">
              <button>
                Choose plan
                <i class="fa-light fa-arrow-right right"></i>
              </button>
            </a>
          </td>
        </tr> */}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default withPlanTable(PlanTable);
