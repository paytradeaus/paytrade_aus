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
}

const withPlanTable = (
  WrappedComponent: React.ComponentType<PlanTableProps>
) => {
  return (props: PlanTableProps) => {
    // Logic for manipulating or transforming data can go here
    const { features } = props;

    return <WrappedComponent features={features} />;
  };
};

const PlanTable: React.FC<PlanTableProps> = ({ features }) => {
  const [tableFeatures, setTableFeatures] = useState<any[]>([]);
  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  function isLightTheme() {
    return getTheme === "light";
  }

  useEffect(() => {
    const currentCode = isLightTheme()
      ? subscriptionColorCodes.BLACK
      : subscriptionColorCodes.WHITE;
    subscriptionPlanFeatures[0].basicColorCode = currentCode;
    subscriptionPlanFeatures[0].standardColorCode = currentCode;
    subscriptionPlanFeatures[0].advancedColorCode = currentCode;
    subscriptionPlanFeatures[0].proAuditColorCode = currentCode;

    setTableFeatures([...subscriptionPlanFeatures]);
  }, [getTheme]);

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
