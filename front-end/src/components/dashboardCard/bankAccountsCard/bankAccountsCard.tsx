// ReusableCard.tsx
import React, { Fragment, useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import styles from "./bankAccountsCard.module.scss";
import { FetchAllBankAccounts } from "@/container/userModules/bankTrustAccount/backTrustAccount.functions";
import { getCookie } from "cookies-next";
import { formatDate } from "@/common/commonFunctions";
import { useRouter } from "next/navigation";

import {
  NO_RECORDS,
  NO_RECORDS_TO_DISPLAY,
  YOU_ARE_UPTO_DATE,
} from "@/common/constants/messages";
import { RootState, useAppSelector } from "@/redux/store";
import { useDispatch } from "react-redux";
import { SetBankAccountTypeFromDashBoard } from "@/redux/slices/dashboardSlices";

interface ReusableCardProps {
  title: string;

  linkHref: string;
  linkText: string;
  colorText?: string;
  dynamicStyle: "style1" | "style2";
  dataType?: string;
  displayColorText?: boolean;
}

const BankAccountsCard: React.FC<ReusableCardProps> = ({
  title,
  dataType = null,
  linkHref,
  linkText,
  colorText,
  dynamicStyle,
  displayColorText = false,
}) => {
  const [bankAccountList, setBankAccountList] = useState<any>([]);
  const [displayNoDataMessage, setDisplayNoDataMessage] = useState(false);
  const [totalAccountCount, setTotalAccountCount] = useState(0);
  const router = useRouter();

  const dispatch = useDispatch();

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  useEffect(() => {
    getFetchBankAccountsLists();
  }, [updatedCompany?.company_id]);

  function getUnmatchedAmountWithDays(data: any) {
    if (colorText) {
      return colorText;
    } else if (data?.unmatched_transactions_count || data?.remaining_days) {
      return `${data?.unmatched_transactions_count} to match - ${
        data?.remaining_days ?? 0
      } days`;
    } else {
      return null;
    }
  }

  const getFetchBankAccountsLists = async () => {
    try {
      const bankAccountListResponse = await FetchAllBankAccounts({
        account_type: dataType,
        company_id: Number(getCookie("companyId")) || null,
        items_per_page: null,
        page: null,
        search: null,
        status: null,
      });

      if (bankAccountListResponse) {
        setBankAccountList(bankAccountListResponse?.extendedBankAccounts);
        setTotalAccountCount(bankAccountListResponse?.total_count);
        setDisplayNoDataMessage(
          bankAccountListResponse?.extendedBankAccounts?.length === 0
        );
      }
    } catch (err: any) {
      console.log("getFetchBankAccountsLists ~ err:", err);
    }
  };
  const getDynamicStyle = () => {
    // Define your dynamic styles based on the prop
    switch (dynamicStyle) {
      case "style1":
        return styles.DynamicStyle1;
      case "style2":
        return styles.DynamicStyle2;
      // Add more cases as needed
      default:
        return ""; // Default style
    }
  };

  function getNoRecordData() {
    if (displayNoDataMessage) {
      return <div className={styles.noRecordRow}>{NO_RECORDS} </div>;
    } else {
      return "";
    }
  }

  function getLastUpdated(data: any) {
    if (data?.remaining_days) {
      return `Updated ${data.remaining_days} days ago`;
    } else if (data?.updated_on) {
      return `last updated on ${formatDate(data?.updated_on)}`;
    } else {
      return "";
    }
  }

  return (
    <Card className={`${styles.CardStyles} ${getDynamicStyle()}`}>
      <Card.Body className={styles.CardBodyStyle}>
        <div className="h-100">
          <Card.Title className={styles.CardTitleStyles}>
            {title}{" "}
            {!!totalAccountCount && (
              <span className={`${styles.RoundedBorders} ${"mx-1"}`}>
                {totalAccountCount}
              </span>
            )}
          </Card.Title>
          <div className={`${styles.ScrollableContent} ${styles.CardHeight}`}>
            {bankAccountList?.length > 0 &&
              bankAccountList.map((data: any, index: any) => (
                <Fragment key={index}>
                  <Card.Subtitle
                    className={`${styles.CardSubtitleStyle} ${"py-1"}`}
                  >
                    {data?.account_name}
                  </Card.Subtitle>
                  <Card.Text className={styles.CardMutedTextStyles}>
                    {getLastUpdated(data)}
                  </Card.Text>
                  <section className={styles.CardTextStyles}>
                    <Card.Text>Bank balance</Card.Text>
                    <Card.Text className="px-2">
                      {`$ ${
                        data?.formatted_bank_account_balance
                          ? data?.formatted_bank_account_balance
                          : "0.00"
                      }`}
                    </Card.Text>
                  </section>
                  {displayColorText && (
                    <Card.Text className={styles.CardColorTextStyles}>
                      {getUnmatchedAmountWithDays(data)}
                    </Card.Text>
                  )}
                </Fragment>
              ))}
          </div>
          {getNoRecordData()}
        </div>
        {bankAccountList?.length > 0 && (
          <div>
            <Card.Link
              className={`${styles.BottomLinkStyles} ${"c-p"}`}
              onClick={() => {
                dispatch(SetBankAccountTypeFromDashBoard(dataType));
                router.push(linkHref);
              }}
            >
              {linkText}
            </Card.Link>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default BankAccountsCard;
