import { TabType } from "@/shared/constant/general";
import { Fragment, useEffect, useMemo, useState } from "react";

// The type for tab options
interface TabOption {
  label: string; // The display label for the tab
  value?: string | null; // The value associated with the tab (optional)
  isActive?: boolean; // Indicates if the tab is active (optional)
}

interface TabSwitchProps {
  tabOptions: TabOption[]; // Array of tab options to be displayed
  onChange: (selectedTab: string) => void; // Callback function to handle tab change
  typeOfTab?: string; // Determines the type of tab switch (e.g., switch or radio)
  tabValue?: string;
  disabled?: boolean;
}

/**
 * TabSwitch Component
 *
 * This component renders a set of tabs allowing users to switch between different options.
 * It supports two types of tab switches: buttons and radio buttons, determined by the `typeOfTab` prop.
 *
 * Props:
 * - tabOptions: An array of objects representing the tabs.
 * - onChange: A function that is called when a tab is selected, passing the selected tab option.
 * - typeOfTab: Optional prop to specify the type of tab display.
 */
export default function TabSwitch({
  tabOptions = [],
  onChange,
  typeOfTab = TabType.switch,
  disabled = false,
  tabValue = "",
}: Readonly<TabSwitchProps>) {
  // State to track the currently active tab
  const [activeTab, setActiveTab] = useState("");

  // Effect to set the initial active tab if tabOptions are provided
  useEffect(() => {
    if (tabValue) {
      setActiveTab(tabValue);
    } else if (tabOptions.length > 0) {
      // Find the active tab or default to the first option
      const findActiveTab: TabOption =
        tabOptions?.find((tabObj: TabOption) => tabObj?.isActive) ??
        tabOptions[0];

      // Set the active tab based on the value or label of the found tab
      setActiveTab(findActiveTab?.value || findActiveTab?.label);
    }
  }, [tabOptions, tabValue]);

  // Memoized function to check if the tab is currently active
  const isActive = useMemo(() => {
    return (tab: TabOption) => {
      return tab.label === activeTab || tab.value === activeTab;
    };
  }, [activeTab]);

  // Function to handle the change of tabs
  function handleTabChange(dataObj: TabOption) {
    setActiveTab(dataObj?.label ?? dataObj?.value);
    onChange(dataObj?.value || dataObj?.label);
  }

  return typeOfTab == TabType.switch ? ( // Render as button switch
    <div role="group">
      {tabOptions?.length > 0 &&
        tabOptions.map((dataObj: any, index: any) => (
          <button
            className="filterbutton"
            aria-current={isActive(dataObj) ? "true" : "false"} // ARIA attribute for accessibility
            onClick={() => handleTabChange(dataObj)}
            key={index}
            disabled={dataObj?.disable || disabled}
          >
            {dataObj?.label}
          </button>
        ))}
    </div>
  ) : (
    // Render as Radio button switch
    <fieldset>
      {tabOptions?.length > 0 &&
        tabOptions.map((dataObj: any, index: any) => (
          <Fragment key={index}>
            <input
              type="radio"
              id={dataObj?.label}
              name={dataObj?.label}
              checked={isActive(dataObj)} // Check if the tab is active
              onClick={() => handleTabChange(dataObj)} // Handle tab change on radio click
              disabled={disabled}
            />
            <label htmlFor={dataObj?.label}>{dataObj?.label}</label>{" "}
          </Fragment>
        ))}
    </fieldset>
  );
}
