import { RootState, useAppSelector } from "@/redux/store";
import {
  subscriptionColorCodes,
  subscriptionPlanFeatures,
} from "@/shared/constant/data";
import React, { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminApi/adminApi";

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


function parseFeatureValue(val: string | null | undefined): { text?: string; enabled?: boolean } {
  if (val === null || val === undefined || val === "") return { enabled: false };
  if (val === "true") return { enabled: true };
  if (val === "false") return { enabled: false };
  return { text: val };
}

function apiFeaturesToRows(apiFeatures: any[]): any[] {
  return apiFeatures.map((f: any) => {
    const basicParsed = parseFeatureValue(f.basic_value);
    const standardParsed = parseFeatureValue(f.standard_value);
    const advancedParsed = parseFeatureValue(f.advanced_value);
    const proAuditParsed = parseFeatureValue(f.pro_audit_value);

    const row: any = { name: f.feature_name };

    if (basicParsed.text !== undefined) { row.basicText = basicParsed.text; } else { row.basic = basicParsed.enabled; }
    if (standardParsed.text !== undefined) { row.standardText = standardParsed.text; } else { row.standard = standardParsed.enabled; }
    if (advancedParsed.text !== undefined) { row.advancedText = advancedParsed.text; } else { row.advanced = advancedParsed.enabled; }
    if (proAuditParsed.text !== undefined) { row.proAuditText = proAuditParsed.text; } else { row.proAudit = proAuditParsed.enabled; }

    return row;
  });
}

const FETCH_PRICING_FEATURES = gql`
  query GetAllPricingTableFeatures {
    getAllPricingTableFeatures {
      status
      data {
        feature_name
        basic_value
        standard_value
        advanced_value
        pro_audit_value
        display_order
      }
    }
  }
`;

const PlanTable: React.FC<PlanTableProps> = ({ features, subscriptionPlanTypes, isYearly }) => {
  const [tableFeatures, setTableFeatures] = useState<any[]>([]);
  const [apiPricingFeatures, setApiPricingFeatures] = useState<any[] | null>(null);
  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  useEffect(() => {
    async function fetchPricingFeatures() {
      try {
        const response = await client.query({
          query: FETCH_PRICING_FEATURES,
          fetchPolicy: "network-only",
        });
        if (response?.data?.getAllPricingTableFeatures?.status === "SUCCESS") {
          setApiPricingFeatures(response.data.getAllPricingTableFeatures.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch pricing features, using fallback:", err);
      }
    }
    fetchPricingFeatures();
  }, []);

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

  function buildFeatureRows() {
    const baseRows = apiPricingFeatures
      ? apiFeaturesToRows(apiPricingFeatures)
      : subscriptionPlanFeatures.slice(1);

    if (!subscriptionPlanTypes) return baseRows;

    const { freePlan, standardPlan, advancedPlan, proAuditPlan } = getPlansFromApi();

    return baseRows.map((row: any) => {
      const basicVal = getItemDisplayValue(freePlan, row.name);
      const standardVal = getItemDisplayValue(standardPlan, row.name);
      const advancedVal = getItemDisplayValue(advancedPlan, row.name);
      const proAuditVal = getItemDisplayValue(proAuditPlan, row.name);

      const updated: any = { ...row };

      if (basicVal) {
        if (basicVal.text !== undefined) { updated.basicText = basicVal.text; updated.basic = undefined; }
        else if (basicVal.enabled !== undefined) { updated.basic = basicVal.enabled; updated.basicText = undefined; }
      }
      if (standardVal) {
        if (standardVal.text !== undefined) { updated.standardText = standardVal.text; updated.standard = undefined; }
        else if (standardVal.enabled !== undefined) { updated.standard = standardVal.enabled; updated.standardText = undefined; }
      }
      if (advancedVal) {
        if (advancedVal.text !== undefined) { updated.advancedText = advancedVal.text; updated.advanced = undefined; }
        else if (advancedVal.enabled !== undefined) { updated.advanced = advancedVal.enabled; updated.advancedText = undefined; }
      }
      if (proAuditVal) {
        if (proAuditVal.text !== undefined) { updated.proAuditText = proAuditVal.text; updated.proAudit = undefined; }
        else if (proAuditVal.enabled !== undefined) { updated.proAudit = proAuditVal.enabled; updated.proAuditText = undefined; }
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

    const featureRows = buildFeatureRows();

    setTableFeatures([priceRow, ...featureRows]);
  }, [getTheme, subscriptionPlanTypes, isYearly, apiPricingFeatures]);

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
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanTable;
