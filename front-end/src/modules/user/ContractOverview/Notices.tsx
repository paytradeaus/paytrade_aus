"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteCookie, getCookie } from "cookies-next";

import GridExportActions from "@/components/GridExportActions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";

import TabSwitch from "@/components/TabSwitch";
import FormikControl from "@/components/FormikControl";
import { InputType, tabOptions } from "@/shared/constant/general";
import DynamicTable from "@/components/Table";
import { format } from "date-fns";
import { downloadExcelFileFromAPI, GenerateSignedUrl } from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import {
  fetchFiltersForAdminNotices,
  getNoticesListServices,
  NoticesListType,
} from "../Notices/notices.functions";
import {
  bankAccountShortTypes,
  NoticesexcelColumnNames,
  NoticespdfDataRow,
  NoticespdfheaderNames,
  Noticespdfheaders,
  NoticesRenderData,
} from "../Notices/notices.constants";

interface RowData {}

export default function NoticesList(props: any) {
  const { isArchived = false, overViewDetails = {} } = props;
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [page, setPage] = useState(1);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [accountList, setAccountList] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [actionData, setActionData] = useState<any>();
  const [activeTab, setActiveTab] = useState();

  const [selectedNoticesType, setSelectedNoticesType] = useState<any>("");
  const [selectedProjectName, setSelectedProjectName] = useState<any>("");
  const [selectedAccountName, setSelectedAccountName] = useState<any>("");
  const [selectedStatus, setSelectedStatus] = useState<any>({
    value: "",
    label: "All",
  });
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [noticesListData, setNoticesListData] = useState<NoticesListType[]>([]);
  const queryParams: any = useSearchParams();
  const paymentClaimId = queryParams.get("payment-claim");
  const [noticesTypeOptions, setNoticesTypeOptions] = useState<any>([]);

  //   const [selectedTab, setSelectedTab] = useState(
  //     isArchived ? tabOptions[1]?.id : tabOptions[0]?.id
  //   );

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  const statusNotices = [
    { value: "", label: "All" },
    { value: "Draft", label: "Draft" },
    { value: "Not Sent", label: "Not Sent" },
    { value: "Sending", label: "Sending" },
    { value: "Sent", label: "Sent" },
    { value: "Sent - Onboarded", label: "Sent - Onboarded" },
  ];

  useEffect(() => {
    deleteCookie("noticeListPath");
    fetchFilters();
  }, [selectedAccountName, selectedNoticesType, selectedProjectName]);

  useEffect(() => {
    fetchData(page, perPage);
  }, [selectedValue, page, perPage, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedValue,
    selectedAccountName,
    selectedNoticesType,
    selectedProjectName,
    activeTab,
  ]);

  useEffect(() => {
    resetFilters();
  }, [activeTab]);

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminNotices({
      company_id: selectedCompanyId || null,
      bank_account_id: Number(selectedAccountName) || null,
      account_type: "",
      notice_type: selectedNoticesType || null,
      project_id: overViewDetails?.overViewMode
        ? overViewDetails?.project_id
          ? Number(overViewDetails?.project_id)
          : null
        : selectedProjectName
        ? Number(selectedProjectName)
        : null,

      status: isArchived ? "Deleted" : "",
    });
    if (result) {
      setAccountList([
        { label: "All", value: "" },
        ...result?.account_list.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);

      setNoticesTypeOptions([
        { label: "All", value: "" },
        ...result.notice_type_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
      setProjectOpt([
        { label: "All", value: "" },
        ...result.project_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  const resetFilters = () => {
    setSelectedNoticesType("");
    setSelectedProjectName("");
    setSelectedAccountName("");
    setSelectedStatus({ value: "", label: "All" });
    setSelectedValue("");
  };

  const isAnyFilterActive =
    selectedNoticesType !== "" ||
    selectedProjectName !== "" ||
    selectedAccountName !== "" ||
    selectedValue !== "" ||
    selectedStatus.label !== "All";

  const handleSelectChange = (
    selectedValue: any,
    field?:
      | "project_name"
      | "account_name"
      | "notice_type"
      | "notice_source"
      | "status"
  ) => {
    if (field === "notice_type") {
      setSelectedNoticesType(selectedValue);
    }
    if (field === "project_name") {
      setSelectedProjectName(selectedValue);
    }
    if (field === "account_name") {
      setSelectedAccountName(selectedValue);
    }
    if (field === "status") {
      setSelectedStatus(selectedValue);
    }
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };
  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const payloadData = {
        company_id: selectedCompanyId,
        page: page,
        items_per_page: rowsPerPage,
        notice_type: selectedNoticesType ? selectedNoticesType : "",
        bank_account_id: selectedAccountName
          ? Number(selectedAccountName)
          : null,
        // status: isArchived
        //   ? "Deleted"
        //   : selectedStatus?.value
        //   ? selectedStatus?.value
        //   : "",
        status:
          activeTab === "Archived"
            ? "Deleted"
            : selectedStatus?.value
            ? selectedStatus.value
            : "",

        project_id: overViewDetails?.overViewMode
          ? overViewDetails?.project_id
            ? Number(overViewDetails?.project_id)
            : null
          : selectedProjectName
          ? Number(selectedProjectName)
          : null,
        contract_id: overViewDetails?.overViewMode
          ? overViewDetails?.contract_id
            ? Number(overViewDetails?.contract_id)
            : null
          : null,
        payment_claim_id: paymentClaimId ? +paymentClaimId : null,
      };
      const response = await getNoticesListServices(payloadData);

      setTotalRows(response?.total_count || 0);
      setPerPage(rowsPerPage);
      let printDataObjCreation = response?.notices_list?.map(
        (notices: NoticesListType) => {
          return {
            notice_date: notices?.notice_date
              ? format(new Date(notices?.notice_date), "dd MMM yyyy h:mm a")
              : "",
            notice_id: notices?.notice_id,
            notice_type: notices?.notice_type,
            account_name: notices?.account_name,
            bank_account_type: notices?.bank_account_type
              ? bankAccountShortTypes[
                  notices.bank_account_type as keyof typeof bankAccountShortTypes
                ]
              : "",

            notice_source: notices?.notice_source,
            project_id: notices?.project_id,
            project_name: notices?.project_name,
            status: notices?.status,
          };
        }
      );
      setNoticesListData(printDataObjCreation || []);

      setPrintDocumentData(printDataObjCreation);
    } catch (error) {
      console.error("Error fetching notices lists:", error);
    } finally {
      setLoading(false);
      setDisableExcelBtn(false);
    }
  };

  const handleRowView = (id: any) => {
    // setCookie("noticeListPath", ApplicationURLS.USER_NOTICES);
    // router.push(`${ApplicationURLS.USER_NOTICES_VIEW}/${id}`);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "notices",
        company_id: selectedCompanyId,

        notice_type: selectedNoticesType ? selectedNoticesType : "",
        bank_account_id: selectedAccountName
          ? Number(selectedAccountName)
          : null,

        status:
          activeTab === "Archived"
            ? "Deleted"
            : selectedStatus?.value
            ? selectedStatus.value
            : "",

        project_id: overViewDetails?.overViewMode
          ? overViewDetails?.project_id
            ? Number(overViewDetails?.project_id)
            : null
          : selectedProjectName
          ? Number(selectedProjectName)
          : null,
        contract_id: overViewDetails?.overViewMode
          ? overViewDetails?.contract_id
            ? Number(overViewDetails?.contract_id)
            : null
          : null,
        payment_claim_id: paymentClaimId ? +paymentClaimId : null,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      onClick: (row: RowData) => {
        console.log("Viewing row:", row);
      },
    },
  ];

  //Render Template
  return (
    <div className="container-fluid">
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters"></div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "transaction List",
                  tableData: noticesListData,
                  LabelAndValueKey: NoticesexcelColumnNames,
                }}
                pdfFile={{
                  fileName: "transaction List",
                  headerRow: Noticespdfheaders,
                  tableData: noticesListData,
                  dataRow: NoticespdfDataRow,
                }}
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={noticesListData.length > 0 ? false : true}
                hidePdfButton={noticesListData.length > 0 ? false : true}
                hideResetButton={!isAnyFilterActive}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                disabledOnExcel={disableExcelBtn}
                exportFromAPI={true}
              />
            </div>
          </div>
        </div>
        <div className="pt_filteroptions">
          <div>
            <FormikControl
              placeholder={"Account Name"}
              name="Account Name"
              options={accountList}
              onChange={(name: any) => {
                handleSelectChange(name, "account_name");
              }}
              control={InputType.SELECT}
              value={selectedAccountName}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Project Name"}
              name="Project Name"
              options={projectOpt}
              onChange={(project: any) => {
                handleSelectChange(project, "project_name");
              }}
              control={InputType.SELECT}
              value={selectedProjectName}
              renderKey="label"
              valueKey="value"
            />
          </div>
          <div>
            <FormikControl
              placeholder={"Notices Type"}
              name="Notices Type"
              options={noticesTypeOptions}
              onChange={(v: any) => {
                handleSelectChange(v, "notice_type");
              }}
              control={InputType.SELECT}
              value={selectedNoticesType}
              renderKey="label"
              valueKey="value"
            />
          </div>
          {activeTab !== "Archived" && (
            <div>
              <FormikControl
                placeholder={"Status"}
                name="Status"
                options={statusNotices}
                onChange={(status: any) => {
                  handleSelectChange(status, "status");
                }}
                control={InputType.SELECT}
                value={selectedStatus}
                renderKey="label"
                valueKey="value"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <div className="grid">
            <h4>{activeTab || "Current"}</h4>
          </div>

          <DynamicTable
            headers={
              activeTab === "Archived"
                ? NoticespdfheaderNames.filter(
                    (header) => header.title !== "Action"
                  )
                : NoticespdfheaderNames
            }
            gridData={noticesListData.length > 0 ? noticesListData : []}
            gridActions={activeTab === "Archived" ? [] : actions}
            onRowClick={(data: any) => handleRowView(data)}
            showLoader={loading}
            loaderColSpan={10}
            renderRowList={NoticesRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={setPerPage}
            onPageChange={setPage}
            totalEntries={totalRows}
          />
        </div>
      </div>
    </div>
  );
}
