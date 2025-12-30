import React from "react";
import styles from "./addGroups.module.scss";
interface Tab {
  id: string;
  label: string;
  hasError: boolean;
}

interface TabContainerProps {
  tabs: Tab[];
  activeTab: string;
  onTabClick: (tabId: string) => void;
}

const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  activeTab,
  onTabClick,
}) => {
  return (
    <div className={styles.tabContainer}>
      {tabs.map((tab, index) => (
        <React.Fragment key={tab.id}>
          <span
            className={`${styles.tabItem} ${
              activeTab === tab.id ? styles.tabActive : ""
            } ${tab.hasError ? styles.tabError : ""}`}
            onClick={() => onTabClick(tab.id)}
          >
            {tab.label}
          </span>
          {index !== tabs.length - 1 && (
            <div>
              <span className={styles.vrLine}></span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default TabContainer;
