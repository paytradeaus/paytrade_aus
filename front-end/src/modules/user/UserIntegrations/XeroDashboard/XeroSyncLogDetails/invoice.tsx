"use client";
import React, { useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType } from "@/shared/constant/general";
import { useRouter } from "next/navigation";

export default function SyncLogDetailsInvoice() {
  const router = useRouter();

  const [syncLogDetails, setSyncLogDetails] = useState<any>();

  const [syncLogDetailsData, setSyncLogDetailsData] = useState({
    invoiceData: [
      {
        source: "Invoice",
        paytrade: "pt-invoice-52",
        xero: "xero-invoice-89",
        status: "Draft",
      },
      {
        source: "Client/Supplier",
        paytrade: "Du pont",
        xero: "Du pont",
        status: "Ok",
      },
      {
        source: "Date",
        paytrade: "03/04/2025",
        xero: "03/04/2025",
        status: "Ok",
      },
      {
        source: "Due Date",
        paytrade: "03/08/2025",
        xero: "03/08/2025",
        status: "Ok",
      },
    ],
    invoiceDetails: [
      [
        { source: "Line 1", paytrade: "323", xero: "323", status: "Ok" },
        {
          source: "Description",
          paytrade: "Flooring",
          xero: "323",
          status: "Ok",
        },
        { source: "Quantity", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Unit Price", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Account", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Tax rate", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Project", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Contract", paytrade: "323", xero: "323", status: "Ok" },
        {
          source: "Retention Amount",
          paytrade: "323",
          xero: "323",
          status: "Ok",
        },
      ],
      [
        { source: "Line 1", paytrade: "323", xero: "323", status: "Ok" },
        {
          source: "Description",
          paytrade: "Cement",
          xero: "323",
          status: "Ok",
        },
        { source: "Quantity", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Unit Price", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Account", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Tax rate", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Project", paytrade: "323", xero: "323", status: "Ok" },
        { source: "Contract", paytrade: "323", xero: "323", status: "Ok" },
        {
          source: "Retention Amount",
          paytrade: "323",
          xero: "323",
          status: "Ok",
        },
      ],
    ],
  });
  const statusColors = {
    Ok: "#22bb33",
    ERROR: "#FF2C2C",
    WARNING: "orange",
    Draft: "orange",
    PENDING: "blue",
    DEFAULT: "black",
  };
  const [loading, setLoading] = useState(false);
  return (
    <>
      <div className="container-fluid">
        <div className="pt_title">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: "Integrations",
                path: AppRoutes.USER_INTEGRATION,
              },
              {
                name: "Xero",
                path: AppRoutes.USER_XERO,
              },
            ]}
            activeRoute={"Sync log details"}
          />
          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Sync log details</h1>
              <h4>{loading ? <div className="skeleton"></div> : 12520}</h4>
            </div>
            <div className="pt_pageactions">
              <div className="pt_addnewbutton">
                <CustomButton
                  buttonName={"Back"}
                  buttonType={buttonType.CONTRAST_SMALL}
                  iconClassName="fa-light fa-arrow-left"
                  actionType={"button"}
                  onClick={() => {
                    router.push(AppRoutes.USER_XERO);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="pt_overviewinfo">
          <div>
            <div className="pt_infodata">
              <div
                className="pt_infolistdata"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: "x-large",
                }}
              >
                {loading ? (
                  <div className="skeleton"></div>
                ) : (
                  "Xero" + " \u27A4 " + "Pay Trade"
                )}
              </div>
            </div>
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>Status</h6>
                {loading ? <div className="skeleton"></div> : "Succeeded"}
              </div>

              <div className="pt_infolistdata">
                <h6>Type</h6>
                {loading ? <div className="skeleton"></div> : "Contacts"}
              </div>
              <div className="pt_infolistdata">
                <h6>Reference</h6>
                {loading ? <div className="skeleton"></div> : "Reference"}
              </div>
              <div className="pt_infolistdata">
                <h6>Project</h6>
                {loading ? <div className="skeleton"></div> : "Project"}
              </div>
              <div className="pt_infolistdata">
                <h6>Started</h6>
                <span>
                  {loading ? (
                    <div className="skeleton"></div>
                  ) : (
                    "Mon 31 Mar 2025 03:30 PM"
                  )}
                </span>
                <span
                  style={{
                    color: "gray",
                    display: "block",
                    fontSize: "small",
                  }}
                >
                  {loading ? (
                    <div className="skeleton"></div>
                  ) : (
                    "about 22 hours ago"
                  )}
                </span>
              </div>
            </div>
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>Message</h6>
                {loading ? (
                  <div className="skeleton"></div>
                ) : (
                  "Bank accounts has been imported"
                )}
              </div>
            </div>
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>Notification</h6>
                {loading ? <div className="skeleton"></div> : "NA"}
              </div>
              <div className="pt_infolistdata">
                <h6>Information Required</h6>
                {loading ? <div className="skeleton"></div> : "NA"}
              </div>
            </div>
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>Identified Type</h6>
                {loading ? <div className="skeleton"></div> : "Claim"}
              </div>
            </div>
            <div className="pt_infolistdata">
              <h6>Important checks</h6>
            </div>
            <div className="pt_infodata">
              <table>
                <tr>
                  <td>
                    <div className="pt_infolistdata">
                      Import data format validation
                    </div>
                  </td>
                  <td>
                    <div
                      className="pt_infolistdata"
                      style={{
                        color: statusColors["Ok"] || statusColors.DEFAULT,
                      }}
                    >
                      Ok
                    </div>
                  </td>
                </tr>{" "}
                <tr>
                  <td>
                    <div className="pt_infolistdata">
                      {" "}
                      Import account/tax type validation
                    </div>
                  </td>
                  <td>
                    <div
                      className="pt_infolistdata"
                      style={{
                        color: statusColors["Ok"] || statusColors.DEFAULT,
                      }}
                    >
                      Ok
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="pt_infolistdata">
                      Import tracking id validation
                    </div>
                  </td>
                  <td>
                    <div
                      className="pt_infolistdata"
                      style={{
                        color: statusColors["Ok"] || statusColors.DEFAULT,
                      }}
                    >
                      Ok
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="pt_infolistdata">
                      Client/supplier mapping validation
                    </div>
                  </td>
                  <td>
                    <div
                      className="pt_infolistdata"
                      style={{
                        color: statusColors["Ok"] || statusColors.DEFAULT,
                      }}
                    >
                      Ok
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="pt_infolistdata">
                      Transaction step validation
                    </div>
                  </td>
                  <td>
                    <div
                      className="pt_infolistdata"
                      style={{
                        color: statusColors["Ok"] || statusColors.DEFAULT,
                      }}
                    >
                      Ok
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            <div className="pt_infodata">
              <table>
                <tr>
                  <th>
                    <div className="pt_infolistdata">Tracking</div>
                  </th>
                  <th>
                    <div className="pt_infolistdata">Paytrade</div>
                  </th>
                  <th>
                    <div className="pt_infolistdata">Xero</div>
                  </th>
                  <th>
                    <div className="pt_infolistdata">Status</div>
                  </th>
                </tr>
                {syncLogDetailsData?.invoiceData?.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className="pt_infolistdata">{item.source}</div>
                    </td>
                    <td>
                      <div
                        className="pt_infolistdata"
                        style={{ color: "#e94439" }}
                      >
                        {item.paytrade}
                      </div>
                    </td>
                    <td style={{ color: "#13b5ea" }}>
                      <div className="pt_infolistdata">{item.xero}</div>
                    </td>
                    <td>
                      <div
                        className="pt_infolistdata"
                        style={{
                          color:
                            statusColors[
                              item.status as keyof typeof statusColors
                            ] || statusColors.DEFAULT,
                        }}
                      >
                        {item.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </table>
            </div>
            {syncLogDetailsData?.invoiceDetails.map((item, index) => (
              <div className="pt_expandtable">
                <details open>
                  <summary>Item {index + 1}</summary>
                  <div className="pt_infodata">
                    <table>
                      {item.map((innerItem, innerIndex) => (
                        <tr key={innerIndex}>
                          <td>
                            <div className="pt_infolistdata">
                              {innerItem.source}
                            </div>
                          </td>
                          <td>
                            <div
                              className="pt_infolistdata"
                              style={{ color: "#e94439" }}
                            >
                              {innerItem.paytrade}
                            </div>
                          </td>
                          <td>
                            <div
                              className="pt_infolistdata"
                              style={{ color: "#13b5ea" }}
                            >
                              {innerItem.xero}
                            </div>
                          </td>
                          <td>
                            <div
                              className="pt_infolistdata"
                              style={{
                                color:
                                  statusColors[
                                    innerItem.status as keyof typeof statusColors
                                  ] || statusColors.DEFAULT,
                              }}
                            >
                              {innerItem.status}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </table>
                  </div>
                </details>
              </div>
            ))}
            <div className="pt_infodata">
              <div className="pt_infolistdata">
                <h6>History</h6>
                API triggered from billable claim 1225 <br /> Export Successful
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
