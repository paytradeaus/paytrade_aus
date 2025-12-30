import React, { ReactNode } from "react";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import BreadcrumbItem from "react-bootstrap/BreadcrumbItem";
import styles from "./breadCrumb.module.scss";
import Link from "next/link";

interface BreadcrumbProps {
  items: {
    href?: string;
    label: string;
    active?: boolean;
  }[];
  separator?: ReactNode;
}

const ReusableBreadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator,
}) => {
  return (
    <Breadcrumb className={styles.breadCrumb}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {/* <BreadcrumbItem className={styles.crumbItemStyle}> */}
          <Link
            href={item.href || ""}
            className={`${
              item.active ? styles.breadcrumbActive : styles.breadcrumbItem
            }`}
          >
            {item.label}
          </Link>
          {/* </BreadcrumbItem> */}
          {index !== items.length - 1 && <>{separator}</>}
        </React.Fragment>
      ))}
    </Breadcrumb>
  );
};

export default ReusableBreadcrumb;
