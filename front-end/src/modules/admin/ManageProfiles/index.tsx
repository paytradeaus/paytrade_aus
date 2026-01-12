"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  DateFormat,
  filterByDuration,
  InputType,
} from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import {
  subscriptionProfileRenderData,
  subscriptionProfileHeaders,
  pdfDataRow,
  pdfHeaders,
  statusOptions,
} from "./manageProfiles.constant";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import {
  AdminListSubscribedUsers,
  CancelSubscriptionForUser,
} from "./manageProfiles.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { fetchFiltersForAdminJournals } from "../AdminJournals/jornalList.functions";
import {
  connectWebSocket,
  dateStringToUtcConversion,
  formatDate,
  getDatePickerFormat,
} from "@/utils";
import { useLoaderContext } from "@/context/useLoader";

function ManageSubscriptionProfiles() {
  const [profilesGridData, setProfilesGridData] = useState<any[]>([]);
  const { setLoader }: any = useLoaderContext();
  const [searchValue, setSearchValue] = useState("");
  const [selectedStatusType, setSelectedStatusType] = useState<any>(null);
  const [totalRows, setTotalRows] = useState(0);

  const [tableLoader, setTableLoader] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortValues, setSortValues] = useState<any>("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [availableCompanyOptions, setAvailableCompanyOptions] = useState<any>(
    []
  );

  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>("All dates");
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    getDatePickerFormat()
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    getDatePickerFormat()
  );
  const [isCustomDate, setIsCustomDate] = useState(false);

  useEffect(() => {
    getExistingCompanyProfiles();
  }, []);

  useEffect(() => {
    getSubscriptionProfiles(currentPage, entriesPerPage);
  }, [
    searchValue,
    selectedCompany,
    selectedDate,
    activityLogStartDate,
    activityLogEndDate,
    sortValues,
  ]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "Cancel subscription",
      style: "contrast",
      icon: "fa-light fa-xmark",
      onClick: (row: any) => {
        setActionData(row);
        setDisplayConfirmationModal(true);
      },
      comparisonRowKey: "subscription_status",
      conditionalComparisonData: "Cancelled",
      notEqualTo: true,
    },
  ];

  function handleCompanyChange(selectedValue: string) {
    setSelectedCompany(selectedValue);
  }

  function handleStatusChange(selectionOption: any) {
    setSelectedStatusType(
      selectionOption?.value || selectionOption?.label || "All"
    );
    setCurrentPage(1);
    getSubscriptionProfiles(1, entriesPerPage, selectionOption?.value);
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getSubscriptionProfiles(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getSubscriptionProfiles(1, value);
  }

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "subscription_user",
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        date_filter: selectedDate == "All dates" ? "" : selectedDate,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        search: searchValue ?? "",
        status:
          !selectedStatusType || selectedStatusType == "All"
            ? null
            : selectedStatusType,
        page_number: currentPage,
        page_size: entriesPerPage,
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

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "subscription_user",
        company_id: selectedCompany?.value
          ? Number(selectedCompany?.value)
          : null,
        date_filter: selectedDate == "All dates" ? "" : selectedDate,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        search: searchValue ?? "",
        status:
          !selectedStatusType || selectedStatusType == "All"
            ? null
            : selectedStatusType,
        page_number: currentPage,
        page_size: entriesPerPage,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  async function getSubscriptionProfiles(
    page: number,
    rowsPerPage: number,
    selectedStatus?: string
  ) {
    try {
      setTableLoader(true);
      const postData = {
        getAllSubscribedUsersInput: {
          company_id: selectedCompany?.value
            ? Number(selectedCompany?.value)
            : null,
          date_filter: selectedDate == "All dates" ? "" : selectedDate,
          start_date: isCustomDate
            ? dateStringToUtcConversion(activityLogStartDate)
            : null,
          end_date: isCustomDate
            ? dateStringToUtcConversion(activityLogEndDate)
            : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          search: searchValue ?? "",
          status: selectedStatus || null,
          page_number: page,
          page_size: rowsPerPage,
          sorting_order: sortValues?.direction || "",
          sorting_field: sortValues?.sortKey || "",
        },
      };
      const subscriptionProfilesResponse: any = await AdminListSubscribedUsers(
        postData
      );

      if (subscriptionProfilesResponse.user_list?.length) {
        setProfilesGridData(
          subscriptionProfilesResponse.user_list.map((x: any) => {
            return {
              ...x,
              start_date: formatDate(x?.start_date),
              expiry_date: formatDate(x?.expiry_date),
            };
          }) ?? []
        );
      } else {
        setProfilesGridData([]);
      }
      setTotalRows(subscriptionProfilesResponse?.total_count || 0);

      setTableLoader(false);
    } catch (err: any) {
      setTableLoader(false);
    }
  }

  async function handleDeleteSubscription() {
    try {
      setDisplayConfirmationModal(false);
      setLoader(true);
      const response = await CancelSubscriptionForUser(actionData?.company_id);
      if (response) {
        await getSubscriptionProfiles(1, entriesPerPage);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function getExistingCompanyProfiles() {
    const result = await fetchFiltersForAdminJournals({});
    if (result?.company_list?.length) {
      setAvailableCompanyOptions([
        { name: "All", value: null },
        ...result.company_list,
      ]);
    }
  }

  function handleActivityChange(selectedValue: any) {
    if (selectedDate === "Custom") {
      setActivityLogStartDate(getDatePickerFormat());
      setActivityLogEndDate(getDatePickerFormat());
    }
    setSelectedDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
  }

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"Manage profiles"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Manage profiles</h1>
            </div>
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="pt_topfilters">
            <GridExportActions
              pdfFile={{
                fileName: "manage-plans",
                headerRow: pdfHeaders,
                tableData: profilesGridData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                handleStatusChange("");
                setEmptySearchField(true);
                setSelectedDate("All dates");
                setSelectedCompany({ label: "All", value: null });
                setIsCustomDate(false);
              }}
              hideResetButton={
                ((selectedStatusType && selectedStatusType == "All") ||
                  !selectedStatusType) &&
                !searchValue &&
                ((selectedCompany && selectedCompany?.label == "All") ||
                  !selectedCompany) &&
                selectedDate &&
                selectedDate == "All dates"
              }
              hideExcelButton={profilesGridData?.length == 0}
              hidePdfButton={profilesGridData?.length == 0}
              handleDownloadExcelFile={() => {
                handleDownloadExcelFile();
              }}
              disabledOnExcel={disableExcelBtn}
              exportFromAPI={true}
              disabledPDF={disablePDFBtn}
              handleDownloadPrintPDF={() => {
                handleDownloadPdfFile();
              }}
            />
          </div>
          <div className="pt_filteroptions">
            {/* <FormikControl
              control={InputType.SEARCH}
              onChange={(value: any) => handleSearch(value)}
              clearSearch={emptySearchField}
              placeholder={"Search by name"}
            /> */}

            <SearchableSelect
              placeholder="Select a business profile"
              name="bankAccounts"
              options={availableCompanyOptions}
              onChange={(value: any) => handleCompanyChange(value)}
              selectedData={selectedCompany}
              renderKey="name"
              valueKey="value"
            />
            <FormikControl
              placeholder={"Select a status"}
              name="status Type"
              options={statusOptions}
              control={InputType.SELECT}
              value={selectedStatusType}
              renderKey="label"
              valueKey="value"
              returnSelectedObject
              onChange={(value: any) => handleStatusChange(value)}
            />
            <FormikControl
              placeholder={"Activity Range"}
              name="Activity Range"
              options={filterByDuration}
              onChange={handleActivityChange}
              control={InputType.SELECT}
              value={selectedDate}
              renderKey="label"
              valueKey="value"
            />
          </div>
          {isCustomDate && (
            <div className="grid">
              <div>
                <FormikControl
                  label="From date"
                  name="activityLogStartDate"
                  control={InputType.DATE_PICKER}
                  type="date"
                  value={activityLogStartDate}
                  onChange={(selectedDate: any) => {
                    if (selectedDate > activityLogEndDate) {
                      setActivityLogStartDate(selectedDate);
                      setActivityLogEndDate(selectedDate);
                    } else {
                      setActivityLogStartDate(selectedDate);
                    }
                  }}
                  minDate="" // Set any minimum date if needed
                  maxDate={activityLogEndDate}
                  disabled={false}
                />
              </div>
              <div>
                <FormikControl
                  label="To date"
                  name="activityLogEndDate"
                  type="date"
                  control={InputType.DATE_PICKER}
                  value={activityLogEndDate}
                  onChange={(selectedDate: any) => {
                    // Ensure end date is not before start date
                    if (selectedDate >= activityLogStartDate) {
                      setActivityLogEndDate(selectedDate);
                    }
                  }}
                  minDate={activityLogStartDate}
                  maxDate="" // Set any maximum date if needed
                  disabled={false}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid">
          <div className="pt_box">
            <DynamicTable
              headers={subscriptionProfileHeaders}
              gridData={profilesGridData?.length > 0 ? profilesGridData : []}
              gridActions={currentActions}
              showLoader={tableLoader}
              loaderColSpan={8}
              renderRowList={subscriptionProfileRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(value: any) =>
                handleRowsPerPageChange(value)
              }
              onPageChange={(value: any) => handlePageChange(value)}
              totalEntries={totalRows}
              alignActionsDataCenter
              onSortChange={(sortConfig) => {
                if (profilesGridData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"cancel subscription modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteSubscription();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you wish to cancel this subscription?
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
export default ManageSubscriptionProfiles;
