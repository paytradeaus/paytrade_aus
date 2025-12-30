import React, { useState } from "react";
import styles from "./addGroups.module.scss";
import { Col, Row } from "react-bootstrap";
import FormButton from "@/components/Button/button";
import { useRouter } from "next/navigation";
// Import statements...

interface Tab {
  id: string;
  label: string;
  hasError: boolean;
}

interface TabContainerProps {
  tabs: Tab[];
  activeTab: string;
  onTabClick: (tabId: string) => void;
  displayButton?: boolean;
  routePath?: string;
}

const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  activeTab,
  onTabClick,
  displayButton = false,
  routePath = "",
}) => {
  const router = useRouter();

  return (
    <Row>
      <Col>
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
      </Col>
      {displayButton && (
        <Col className="text-end">
          <div className={styles.headerAndButtonCon}>
            <FormButton
              className={styles.buttonStyles}
              onClick={() => router.push(routePath)}
            >
              + New
            </FormButton>
          </div>
        </Col>
      )}
    </Row>
  );
};

export default TabContainer;
