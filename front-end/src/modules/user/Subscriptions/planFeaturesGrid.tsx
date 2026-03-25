import React, { Fragment, useEffect, useState } from "react";
import { useSubscriptionsContext } from "./SubscriptionContext";
import { RootState, useAppSelector } from "@/redux/store";

export default function PlanFeaturesGrid() {
  const {
    setDisplayBillingDetails,
    subscriptionPlanTypes,
    isCurrentPlan,
    isYearly,
    setSelectedPlanForSub,
  }: any = useSubscriptionsContext();

  const [tableFeatures, setTableFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaderInfo, setLoaderInfo] = useState("Loading subscription plans...");

  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  const isLightTheme = () => getTheme === "light";

  // which paid plans to show depending on toggle
  function paymentPlans() {
    return !isYearly
      ? subscriptionPlanTypes?.monthly_plan_list || []
      : subscriptionPlanTypes?.yearly_plan_list || [];
  }

  // Format plan price string into display like "$100/yr" or "Free"
  function formatPlanPrice(plan: any) {
    if (!plan) return "";
    if (
      plan.plan_type === "Free" ||
      plan.price === "$0.00" ||
      plan.price === "$0"
    )
      return "Free";

    let price = plan.price || "";
    // strip trailing .00 for nicer display
    if (price.endsWith(".00")) price = price.replace(".00", "");
    if (plan.bill_cycle === "Year" || plan.bill_cycle === "year")
      return `${price}/yr`;
    if (plan.bill_cycle === "Month" || plan.bill_cycle === "month")
      return `${price}/mo`;
    return price;
  }

  // color helpers - tweak colors to match your theme if required
  const COLORS = {
    green: "#2a7b6f",
    orange: "#f39c12",
    red: "#e74c3c",
    text: isLightTheme() ? "#222" : "#fff",
  };

  // Decide color based on plan item metadata
  function getColorForMeta(meta: any) {
    if (!meta) return COLORS.red;
    if (meta.is_unlimited) return COLORS.green;

    const lt = meta.limit_type;
    const raw = meta.raw;

    if (lt === "Checkbox") {
      return String(raw).toLowerCase() === "true" ? COLORS.green : COLORS.red;
    }

    if (lt === "Numeric") {
      const n = Number(raw);
      if (isNaN(n)) return COLORS.orange; // missing number — treat as limited text
      if (n <= 1) return COLORS.red; // e.g. 1 -> red (like users=1)
      if (n <= 10) return COLORS.orange; // small limit -> orange
      return COLORS.green; // large limit -> green
    }

    // Dropdown or text -> orange (limited textual value)
    return COLORS.orange;
  }

  // render each feature cell using metadata
  function renderFeatureCellCell(meta: any) {
    if (!meta) {
      return (
        <i
          className="fa-light fa-xmark invalid"
          style={{ color: COLORS.red }}
        />
      );
    }

    // Unlimited
    if (meta.is_unlimited) {
      return (
        <span className="subscriptionContent" style={{ color: COLORS.green }}>
          Unlimited
        </span>
      );
    }

    // Checkbox boolean
    if (meta.limit_type === "Checkbox") {
      const allowed = String(meta.raw).toLowerCase() === "true";
      return allowed ? (
        <i
          className="fa-light fa-check valid"
          style={{ color: COLORS.green }}
        />
      ) : (
        <i
          className="fa-light fa-xmark invalid"
          style={{ color: COLORS.red }}
        />
      );
    }

    // Numeric
    if (meta.limit_type === "Numeric") {
      const n = meta.limit_value ?? meta.raw ?? "";
      const color = getColorForMeta(meta);

      if (n === null || n === undefined || n === "") {
        return (
          <span className="subscriptionContent" style={{ color }}>
            {""}
          </span>
        );
      }

      let unit = meta.unit_type || "";
      if (unit && unit.toLowerCase() !== "no unit") {
        const isPlural = parseFloat(n) > 1;
        unit = isPlural ? `${unit.toLowerCase()}s` : unit.toLowerCase();
        return (
          <span className="subscriptionContent" style={{ color }}>
            {n} {unit}
          </span>
        );
      }

      return (
        <span className="subscriptionContent" style={{ color }}>
          {n}
        </span>
      );
    }

    // Dropdown or textual
    if (meta.limit_type === "Dropdown" || typeof meta.raw === "string") {
      const color = getColorForMeta(meta);
      return (
        <span className="subscriptionContent" style={{ color }}>
          {meta.raw ?? ""}
        </span>
      );
    }

    // fallback
    return (
      <i className="fa-light fa-xmark invalid" style={{ color: COLORS.red }} />
    );
  }

  // Build the feature map from API plans (free + monthly + yearly)
  useEffect(() => {
    setLoading(true);
    setLoaderInfo("Preparing feature grid...");

    // if no subscription data yet, bail early
    if (!subscriptionPlanTypes) {
      setTableFeatures([]);
      setLoading(false);
      setLoaderInfo("");
      return;
    }

    // collect plans we want to inspect
    const allPlans = [
      subscriptionPlanTypes?.free_plan,
      ...(subscriptionPlanTypes?.monthly_plan_list || []),
      ...(subscriptionPlanTypes?.yearly_plan_list || []),
    ].filter(Boolean);

    // feature map keyed by item_name
    const featureMap: Record<
      string,
      {
        name: string;
        plans: Record<
          string,
          {
            raw: any;
            limit_type?: string;
            is_unlimited?: boolean;
            unit_type: any;
          }
        >;
      }
    > = {};

    allPlans.forEach((plan) => {
      const planName = plan?.plan_name || plan?.plan_type || "Unknown";
      plan?.plan_items?.forEach((item: any) => {
        const name = item.item_name || item?.description || "Unknown";
        if (!featureMap[name]) {
          featureMap[name] = { name, plans: {} };
        }

        // store meta rather than just value so we can render intelligently later
        featureMap[name].plans[planName] = {
          raw:
            item.is_unlimited === true
              ? "Unlimited"
              : item.limit_type === "Checkbox"
              ? String(item.limit_value)
              : item.limit_type === "Numeric"
              ? item.limit_value ?? ""
              : item.limit_value ?? "",
          limit_type: item.limit_type,
          is_unlimited: !!item.is_unlimited,
          unit_type: item?.unit_type,
        };
      });
    });

    // convert map to array preserving insertion (not guaranteed order from backend)
    const featuresArray = Object.values(featureMap);

    setTableFeatures(featuresArray);
    setLoading(false);
    setLoaderInfo("");
  }, [subscriptionPlanTypes, getTheme]);

  function handleUpdatePlan(data: any) {
    setDisplayBillingDetails(true);

    setSelectedPlanForSub({
      ...data,
      planPrice: `${data?.price}${
        data?.bill_cycle === "Year" ? "/yr" : "/mo"
      }+VAT`,
      description: data?.description ? data?.description : data?.plan_name,
    });
  }

  if (loading) {
    return (
      <div className="loader">
        <p>{loaderInfo}</p>
      </div>
    );
  }

  // price color is theme-aware
  const priceColor = isLightTheme() ? COLORS.text : COLORS.text;

  return (
    <div className="grid">
      <div className="pt_defaulttable_scroll">
        <table className="pt_defaulttable">
          <thead>
            <tr>
              <th>Feature</th>
              {subscriptionPlanTypes?.free_plan && (
                <th className="centered">
                  {subscriptionPlanTypes?.free_plan?.plan_name}
                </th>
              )}
              {paymentPlans().map((plan: any, idx: number) => (
                <th key={idx} className="centered">
                  {plan?.plan_name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* PRICE ROW (missing earlier) */}
            <tr className="largeicon">
              <td></td>
              {subscriptionPlanTypes?.free_plan && (
                <td className="centered">
                  {formatPlanPrice(subscriptionPlanTypes?.free_plan)}
                </td>
              )}

              {paymentPlans().map((plan: any, idx: number) => (
                <td key={idx} className="centered">
                  <span
                    className="subscriptionContent"
                    style={{ color: priceColor }}
                  >
                    {formatPlanPrice(plan)}
                  </span>
                </td>
              ))}
            </tr>

            {/* FEATURE ROWS */}
            {tableFeatures.map((feature, index) => (
              <tr className="largeicon" key={index}>
                <td>{feature.name}</td>

                {/* free plan cell */}
                {subscriptionPlanTypes?.free_plan && (
                  <td className="centered">
                    {renderFeatureCellCell(
                      feature.plans[subscriptionPlanTypes?.free_plan?.plan_name]
                    )}
                  </td>
                )}

                {/* paid plans cells */}
                {paymentPlans().map((plan: any, idx: number) => (
                  <td key={idx} className="centered">
                    {renderFeatureCellCell(feature.plans[plan?.plan_name])}
                  </td>
                ))}
              </tr>
            ))}

            {/* ACTION ROW */}

            <tr className="fullbuttons">
              {/* Blank column under "Feature" */}
              <td></td>

              {/* Free plan column (just empty, no button) */}
              {subscriptionPlanTypes?.free_plan && <td></td>}

              {/* Paid plan button cells */}
              {(subscriptionPlanTypes?.monthly_plan_list?.length > 0 ||
                subscriptionPlanTypes?.yearly_plan_list?.length > 0) &&
                paymentPlans().map((data: any, index: number) => (
                  <td className="centered" key={index}>
                    {isCurrentPlan(data) ? (
                      <a>
                        <button className="contrast" disabled>
                          Current plan
                        </button>
                      </a>
                    ) : (
                      <a>
                        <button
                          className="secondary"
                          onClick={() => handleUpdatePlan(data)}
                        >
                          Choose plan
                          <i className="fa-light fa-arrow-right right"></i>
                        </button>
                      </a>
                    )}
                  </td>
                ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
