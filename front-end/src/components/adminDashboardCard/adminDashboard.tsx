// ReusableCard.tsx
import React, { Fragment, useState } from "react";
import { Card } from "react-bootstrap";
import styles from "./adminDashboard.module.scss";
import { formatDate } from "@/common/commonFunctions";
import { useRouter } from "next/navigation";
import { YOU_ARE_UPTO_DATE } from "@/common/constants/messages";
import FullScreenEmailTemplate from "@/container/adminModules/FullScreenEmailTemplate/FullScreenEmailTemplate";

interface ReusableCardProps {
  title: string;
  cardData: any;
  linkHref: string;
  linkText?: string;
  displayNoDataMessage: any;
  isContact?: boolean;
}

function AdminDashboardCard({
  title,
  displayNoDataMessage = false,
  linkHref,
  linkText = "View",
  cardData = [],
  isContact = false,
}: Readonly<ReusableCardProps>) {
  const router = useRouter();

  const [displayContact, setDisplayContact] = useState(false);
  const [contactRowData, setContactRowData] = useState("");

  function getNoRecordData() {
    if (displayNoDataMessage) {
      return <div className={styles.noRecordRow}>{YOU_ARE_UPTO_DATE} </div>;
    } else {
      return "";
    }
  }
  function getTitle(rowData: any) {
    if (rowData?.first_name && rowData?.last_name) {
      return `${rowData?.first_name} ${rowData?.last_name}`;
    } else if (rowData?.company_name) {
      return rowData?.company_name;
    } else if (rowData?.account_name) {
      return rowData?.account_name;
    } else if (rowData?.project_name) {
      return rowData?.project_name;
    }
  }

  function getContentOne(rowData: any) {
    if (rowData?.created_date) {
      return `Added on ${
        rowData?.created_date ? formatDate(rowData?.created_date) : ""
      }`;
    } else if (rowData?.notice_type) {
      return rowData?.notice_type;
    } else if (rowData?.bank_account_name) {
      return rowData?.bank_account_name;
    } else if (rowData?.account_name) {
      return rowData?.account_name;
    }
  }

  function getContentTwo(rowData: any) {
    if (rowData?.company_id || rowData?.status) {
      return rowData?.status || rowData?.transaction_status
        ? `${rowData?.status ?? rowData?.transaction_status}`
        : "";
    } else if (rowData?.issues) {
      return `Issues ${rowData?.issues}`;
    }
  }

  function closeFullScreenModal() {
    setDisplayContact(false);
    setContactRowData("");
  }

  return (
    <Fragment>
      <Card className={styles.CardStyles}>
        <Card.Body className={styles.CardBodyStyle}>
          <div className="h-100">
            <Card.Title className={styles.CardTitle}>{title}</Card.Title>
            <div className={`${styles.ScrollableContent} ${styles.CardHeight}`}>
              {cardData?.length > 0 &&
                cardData.map((data: any, index: any) => (
                  <Fragment key={index}>
                    <Card.Subtitle
                      className={`${styles.CardSubtitle} ${"py-1"}`}
                    >
                      {getTitle(data)}
                      {isContact && (
                        <section className={styles.CardTextStyles}>
                          <Card.Text
                            className={`px-2 c-p ${styles.contactAdmin}`}
                            onClick={() => {
                              setDisplayContact(true),
                                setContactRowData(data?.primary_admin_email);
                            }}
                          >
                            Contact
                          </Card.Text>
                        </section>
                      )}
                    </Card.Subtitle>

                    <Card.Text className={`${styles.contentOne} ${"mb-0"}`}>
                      {getContentOne(data)}
                    </Card.Text>

                    <Card.Text className={styles.contentTwo}>
                      {getContentTwo(data)}
                    </Card.Text>

                    {/* <Card.Text className={styles.CardColorTextStyles}>
                  {colorText}
                </Card.Text> */}
                  </Fragment>
                ))}
            </div>
            {getNoRecordData()}
          </div>
          {cardData?.length > 0 && (
            <div>
              <Card.Link
                className={`${styles.BottomLink} ${"c-p "}`}
                onClick={() => router.push(linkHref)}
              >
                {linkText}
              </Card.Link>
            </div>
          )}
        </Card.Body>
      </Card>

      {displayContact && (
        <FullScreenEmailTemplate
          isFullScreenModal={displayContact}
          mailTo={contactRowData}
          onClose={() => closeFullScreenModal()}
        />
      )}
    </Fragment>
  );
}

export default AdminDashboardCard;
