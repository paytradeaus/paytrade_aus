import { RootState, useAppSelector } from "@/redux/store";
import {
  subscriptionPlanFeatures,
} from "@/shared/constant/data";
import React, { useEffect, useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { client } from "@/app/api/adminApi/adminApi";

interface PlanTableProps {
  subscriptionPlanTypes?: any;
  isYearly?: boolean;
}

type FetchState = "loading" | "success" | "error";

function parseFeatureValue(val: string | null | undefined): { text?: string; enabled?: boolean } {
  if (val === null || val === undefined || val === "") return { enabled: false };
  if (val === "true") return { enabled: true };
  if (val === "false") return { enabled: false };
  return { text: val };
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

const LEGACY_COLUMN_MAP: Record<string, string> = {
  basic_value: "basic",
  standard_value: "standard",
  advanced_value: "advanced",
  pro_audit_value: "pro-audit",
};

const FALLBACK_COLUMNS: { key: string; label: string; plan: any }[] = [
  { key: "basic", label: "Basic", plan: null },
  { key: "standard", label: "Standard", plan: null },
  { key: "advanced", label: "Advanced", plan: null },
  { key: "pro-audit", label: "Pro Audit", plan: null },
];

function normalizePlanKey(name: string): string {
  return (name || "").toLowerCase().trim().replace(/\s*-\s*sandbox$/i, "").replace(/[\s_]+/g, "-");
}

function deduplicatePlans(planList: any[]): any[] {
  const seen = new Map<string, any>();
  for (const plan of planList) {
    const key = normalizePlanKey(plan.plan_name);
    if (!seen.has(key)) {
      seen.set(key, plan);
    } else {
      const existing = seen.get(key);
      if (!existing.description && plan.description) {
        seen.set(key, plan);
      }
    }
  }
  return Array.from(seen.values());
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

const COLORS = {
  green: "#2a7b6f",
  red: "#e74c3c",
};

const PlanTable: React.FC<PlanTableProps> = ({ subscriptionPlanTypes, isYearly }) => {
  const [apiPricingFeatures, setApiPricingFeatures] = useState<any[] | null>(null);
  const [featuresFetchState, setFeaturesFetchState] = useState<FetchState>("loading");
  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  useEffect(() => {
    async function fetchPricingFeatures() {
      setFeaturesFetchState("loading");
      try {
        const response = await client.query({
          query: FETCH_PRICING_FEATURES,
          fetchPolicy: "network-only",
        });
        if (response?.data?.getAllPricingTableFeatures?.status === "SUCCESS") {
          setApiPricingFeatures(response.data.getAllPricingTableFeatures.data || []);
          setFeaturesFetchState("success");
        } else {
          setFeaturesFetchState("error");
        }
      } catch (err) {
        console.error("Failed to fetch pricing features, using fallback:", err);
        setFeaturesFetchState("error");
      }
    }
    fetchPricingFeatures();
  }, []);

  const isLightTheme = () => getTheme === "light";

  const columns = useMemo(() => {
    if (!subscriptionPlanTypes) return FALLBACK_COLUMNS;

    const planList = isYearly
      ? subscriptionPlanTypes?.yearly_plan_list || []
      : subscriptionPlanTypes?.monthly_plan_list || [];

    const freePlan = subscriptionPlanTypes?.free_plan || null;
    const paidPlans = deduplicatePlans(planList).sort(
      (a: any, b: any) => (a.unformatted_price ?? 0) - (b.unformatted_price ?? 0)
    );

    const cols: { key: string; label: string; plan: any }[] = [];

    if (freePlan) {
      cols.push({ key: normalizePlanKey(freePlan.plan_name), label: freePlan.plan_name || "Basic", plan: freePlan });
    }

    paidPlans.forEach((plan: any) => {
      cols.push({ key: normalizePlanKey(plan.plan_name), label: plan.plan_name, plan });
    });

    return cols.length > 0 ? cols : FALLBACK_COLUMNS;
  }, [subscriptionPlanTypes, isYearly]);

  function mapApiFeaturesToDynamic(apiFeatures: any[]): { name: string; values: Record<string, { text?: string; enabled?: boolean }> }[] {
    return apiFeatures.map((f: any) => {
      const row: { name: string; values: Record<string, { text?: string; enabled?: boolean }> } = {
        name: f.feature_name,
        values: {},
      };

      for (const [field, legacyKey] of Object.entries(LEGACY_COLUMN_MAP)) {
        const parsed = parseFeatureValue(f[field]);
        const matchedCol = columns.find((c) => c.key === legacyKey);
        if (matchedCol) {
          row.values[matchedCol.key] = parsed;
        }
      }

      return row;
    });
  }

  function mapFallbackToDynamic(): { name: string; values: Record<string, { text?: string; enabled?: boolean }> }[] {
    const legacyKeys = ["basic", "standard", "advanced", "proAudit"];
    const legacyTextKeys = ["basicText", "standardText", "advancedText", "proAuditText"];
    const normalizedLegacy = ["basic", "standard", "advanced", "pro-audit"];

    return subscriptionPlanFeatures.slice(1).map((row: any) => {
      const mapped: { name: string; values: Record<string, { text?: string; enabled?: boolean }> } = {
        name: row.name,
        values: {},
      };

      legacyKeys.forEach((key, idx) => {
        const colKey = normalizedLegacy[idx];
        const matchedCol = columns.find((c) => c.key === colKey);
        if (matchedCol) {
          if (row[legacyTextKeys[idx]]) {
            mapped.values[matchedCol.key] = { text: row[legacyTextKeys[idx]] };
          } else {
            mapped.values[matchedCol.key] = { enabled: !!row[key] };
          }
        }
      });

      return mapped;
    });
  }

  const tableData = useMemo(() => {
    if (columns.length === 0) return [];

    let baseRows = (featuresFetchState === "success" && apiPricingFeatures)
      ? mapApiFeaturesToDynamic(apiPricingFeatures)
      : mapFallbackToDynamic();

    if (subscriptionPlanTypes) {
      baseRows = baseRows.map((row) => {
        const updated = { ...row, values: { ...row.values } };

        for (const col of columns) {
          const planVal = getItemDisplayValue(col.plan, row.name);
          if (planVal) {
            updated.values[col.key] = planVal;
          }
        }

        return updated;
      });
    }

    return baseRows;
  }, [columns, apiPricingFeatures, featuresFetchState, subscriptionPlanTypes, isYearly]);

  function getFallbackPrice(colKey: string): string {
    const legacyPriceRow = subscriptionPlanFeatures[0] as Record<string, any>;
    const keyMap: Record<string, string> = {
      "basic": "basicText",
      "standard": "standardText",
      "advanced": "advancedText",
      "pro-audit": "proAuditText",
    };
    return legacyPriceRow?.[keyMap[colKey]] || "";
  }

  function formatPlanPrice(col: { key: string; plan: any }): string {
    if (!col.plan) return getFallbackPrice(col.key);
    if (col.plan.plan_type === "Free" || col.plan.price === "$0.00" || col.plan.price === "$0") return "Free";
    const suffix = isYearly ? "/yr" : "/mo";
    return col.plan.price ? `${col.plan.price}${suffix}` : "Free";
  }

  const priceColor = isLightTheme() ? "black" : "#DCE3EC";

  if (featuresFetchState === "loading") {
    return (
      <div className="grid">
        <div className="pt_defaulttable_scroll">
          <p className="centered">Loading features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="pt_defaulttable_scroll">
        <table className="pt_defaulttable">
          <thead>
            <tr>
              <th>Feature</th>
              {columns.map((col) => (
                <th key={col.key} className="centered">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="largeicon">
              <td></td>
              {columns.map((col) => (
                <td key={col.key} className="centered">
                  <span className="subscriptionContent" style={{ color: priceColor }}>
                    {formatPlanPrice(col)}
                  </span>
                </td>
              ))}
            </tr>

            {tableData.map((feature, index) => (
              <tr className="largeicon" key={index}>
                <td>{feature.name}</td>
                {columns.map((col) => {
                  const val = feature.values[col.key];
                  return (
                    <td key={col.key} className="centered">
                      {val?.text ? (
                        <span
                          style={{ color: COLORS.green }}
                          className="subscriptionContent"
                        >
                          {val.text}
                        </span>
                      ) : (
                        <i
                          className={`fa-light ${
                            val?.enabled ? "fa-check valid" : "fa-xmark invalid"
                          }`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanTable;
