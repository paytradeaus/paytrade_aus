import { AccountType } from "@/shared/constant/data";
import { NA } from "@/shared/constant/general";
import { formatDate } from "@/utils";
import Link from "next/link";

// Interface defining the props for DashboardBox
interface DashboardBoxProps {
  title: string; // Title displayed at the top of the box
  hideBoxButton?: boolean; // Flag to show/hide the button at the top-right corner
  boxButtonLink?: any; // Link for the box button
  boxTotalCount?: number; // Total count displayed next to the title
  cardData: any[]; // Array of data to render each card inside the box
  enableWithOverLink?: boolean; // Flag to enable/disable cursor effect on cards
  enableLoader?: boolean; // Flag to show a loader when data is being fetched
  boxButtonName?: string; // Text for the box button (default: "View All")
  mappingKeys: any; // Object to map dynamic keys to display data in each card
  enableInvalidForRightMainContentOne?: boolean; // Adds an "invalid" class if true
  statusClassFn?: (cardObj: any) => string;
  displayDaysToMatch?: boolean; // Flag to display unmatched amount and days left
  HeaderLeftContent?: React.ReactNode; // Optional content for left header area
  subHeaderContent?: React.ReactNode;
  isContact?: boolean;
  onCardClick?: (cardObj: any, index: number) => void;
}

export default function DashboardBox({
  title,
  hideBoxButton,
  boxButtonLink,
  boxTotalCount,
  cardData,
  enableWithOverLink = false,
  enableLoader = false,
  boxButtonName = "View all",
  mappingKeys,
  isContact = false,
  enableInvalidForRightMainContentOne,
  statusClassFn,
  displayDaysToMatch,
  HeaderLeftContent,
  subHeaderContent,
  onCardClick,
}: Readonly<DashboardBoxProps>) {
  // Renders the optional right-side main content of each card
  function renderRightSideOptionalMainContentOne(cardObj: any) {
    if (cardObj?.[mappingKeys?.statusRightMainContentOne]) {
      return <span>Status</span>;
    } else if (cardObj?.[mappingKeys?.issueRightMainContentOne]) {
      return <span>Issue</span>;
    } else if (cardObj?.[mappingKeys?.contactRightMainContentOne]) {
      return <span>Contact</span>;
    } else if (cardObj?.[mappingKeys?.bankRightMainContentOne]) {
      return <span>Bank account</span>;
    } else if (cardObj?.[mappingKeys?.projectsRightMainContentOne]) {
      return <span>Contract sum</span>;
    } else if (mappingKeys?.isBank) {
      return <span>Bank balance</span>;
    } else {
      return "";
    }
  }

  // Returns unmatched amount with days left to match
  function getUnmatchedAmountWithDays(data: any) {
    if (data?.unmatched_transactions_count || data?.remaining_days) {
      return `${data?.unmatched_transactions_count} to match - ${
        data?.remaining_days ?? 0
      } days`;
    } else {
      return null;
    }
  }

  function cardHeaderContent(cardObj: any) {
    if (HeaderLeftContent) {
      return HeaderLeftContent;
    }
    if (
      cardObj[mappingKeys?.accountType] === AccountType.PROJECT_TRUST_ACCOUNT
    ) {
      return "pta";
    } else if (
      cardObj[mappingKeys?.accountType] === AccountType.RETENTION_TRUST_ACCOUNT
    ) {
      return "rta";
    } else if (cardObj[mappingKeys?.accountType] === AccountType.CASH_ACCOUNT) {
      return "ca";
    } else {
      return "";
    }
  }

  return (
    <div className="pt_box">
      {/* Header displaying title and count */}
      <h4>
        {title}{" "}
        {!!boxTotalCount && <div className="dashcount">{boxTotalCount}</div>}
      </h4>

      {/* Optional total count button */}
      {!hideBoxButton && (
        <Link href={boxButtonLink} passHref legacyBehavior>
          <a className="pt_dashbutton">
            <button className="contrast">{boxButtonName}</button>
          </a>
        </Link>
      )}

      {subHeaderContent && (
        <div style={{ padding: "0 16px 8px" }}>{subHeaderContent}</div>
      )}

      {/* Main container for cards */}
      <div className="pt_dashboxwrap">
        {/* Map over card data to render each card */}
        {!enableLoader &&
          cardData?.length > 0 &&
          cardData?.map((cardObj: any, index: number) => (
            <Link
              href={""}
              key={index}
              className={
                enableWithOverLink ? "pt_dashbox" : "pt_dashbox cur-default"
              }
              onClick={(e) => {
                if (onCardClick) {
                  e.preventDefault(); // Prevent default navigation if onCardClick is provided
                  onCardClick(cardObj, index);
                }
              }}
            >
              {/* Optional top section */}
              {(mappingKeys?.HeaderRightContent ||
                displayDaysToMatch ||
                mappingKeys?.accountType) && (
                <div className="pt_dashtop">
                  <div className="pt_topdashleft">
                    <span>{cardHeaderContent(cardObj)}</span>
                  </div>
                  {/* Display header right content and days to match if available */}
                  <div className="pt_topdashright ">
                    <span className="text_ellipsis">
                      {cardObj?.[mappingKeys?.HeaderRightContent]}
                    </span>
                    {displayDaysToMatch && (
                      <span>
                        <b className="invalid">
                          {getUnmatchedAmountWithDays(cardObj)}
                        </b>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Middle section showing main content */}
              <div className="pt_dashboxmiddle">
                <div className="pt_dashleft">
                  {/* Primary content */}
                  {cardObj?.[mappingKeys?.leftMainContentOne] ?? NA}
                  {/* Last updated date */}
                  {cardObj?.[mappingKeys?.leftMainContentLight] && (
                    <span>{cardObj?.[mappingKeys.leftMainContentLight]}</span>
                  )}
                  {cardObj?.[mappingKeys?.dateLeftMainContentTwo] && (
                    <span>
                      {`last updated on ${formatDate(
                        cardObj?.[mappingKeys.dateLeftMainContentTwo]
                      )}`}
                    </span>
                  )}
                  {cardObj?.[mappingKeys?.dateLeftMainContentThree] && (
                    <span>
                      {`Added on ${formatDate(
                        cardObj?.[mappingKeys.dateLeftMainContentThree]
                      )}`}
                    </span>
                  )}

                  {/* Eligibility status */}
                  {cardObj?.[mappingKeys?.eligibilityLeftMainContentOne] && (
                    <span>
                      Project Trust Account:{" "}
                      <b
                        className={
                          cardObj?.[
                            mappingKeys?.eligibilityLeftMainContentOne
                          ] === "Yes"
                            ? "valid"
                            : "invalid"
                        }
                      >
                        {cardObj?.[
                          mappingKeys?.eligibilityLeftMainContentOne
                        ] === "Yes"
                          ? "Eligible"
                          : "Not Eligible"}
                      </b>
                    </span>
                  )}
                </div>
                {/* Right side main content with conditional rendering */}
                <div className="pt_dashright">
                  {renderRightSideOptionalMainContentOne(cardObj)}
                  <b
                    className={
                      statusClassFn
                        ? statusClassFn(cardObj)
                        : cardObj?.[mappingKeys?.projectsRightMainContentOne] ||
                          enableInvalidForRightMainContentOne
                          ? "invalid"
                          : ""
                    }
                  >
                    {cardObj?.[mappingKeys?.rightMainContentOne] ||
                      cardObj?.[mappingKeys.statusRightMainContentOne] ||
                      cardObj?.[mappingKeys.issueRightMainContentOne] ||
                      cardObj?.[mappingKeys.contactRightMainContentOne] ||
                      `$${
                        (cardObj?.[
                          mappingKeys?.rightMainContentOneWithCurrency
                        ] ||
                          cardObj?.[
                            mappingKeys?.projectsRightMainContentOne
                          ]) ??
                        "0.00"
                      }`}
                  </b>
                  {/* Additional content for right section */}
                  {mappingKeys?.dateRightMainContentTwo && (
                    <span>
                      {cardObj?.[mappingKeys?.dateRightMainContentTwo]
                        ? formatDate(
                            cardObj?.[mappingKeys?.dateRightMainContentTwo]
                          )
                        : NA}
                    </span>
                  )}
                  {mappingKeys?.transactionsRightMainContentTwo && (
                    <span>
                      <b className="invalid">
                        {
                          cardObj?.[
                            mappingKeys?.transactionsRightMainContentTwo
                          ]
                        }
                      </b>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}

        {/* Loader or empty state message */}
        {(enableLoader || cardData?.length === 0) && (
          <div className="pt_empty">
            <p>
              {enableLoader ? "...Loading" : "You are up to date. Nice work"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
