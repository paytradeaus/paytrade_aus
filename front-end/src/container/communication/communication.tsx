"use client";
import React, { useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import styles from "./communication.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import FormButton from "@/components/Button/button";
import { FetchAllEmailsSentByAdmin } from "./communication.functions";
import { format } from "date-fns";
import { RowsPerPageInTable } from "@/common/constants";
import { ApplicationURLS } from "@/common/applicationURLS";
import CustomSubHeader from "./customheader";

const Communication = () => {
  const routePath = usePathname();
  const router = useRouter();

  // State Destructuring
  const [emailsList, setEmailsList] = useState<any>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("This Month");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });

  // Reset filter function
  const resetFilters = () => {
    setActivityDate("This Month"); // Reset date filter
    setSingleActivyDate({ value: "This Month", label: "This Month" }); // Reset dropdown date
    setIsCustomDate(false); // Reset custom date selection
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date
  };

  // Check if any date-related filter is active
  const isAnyFilterActive =
    activityDate !== "This Month" || isCustomDate === true;

  const activityDateOptions = [
    { value: "Custom", label: "Custom" },
    { value: "Last Month", label: "Last Month" },
    { value: "This Month", label: "This Month" },
  ];

  useEffect(() => {
    getFetchAllEmailsSentByAdmin(page, perPage);
  }, [activityDate, activityLogEndDate, activityLogStartDate]);

  const getFetchAllEmailsSentByAdmin = async (
    page: number,
    rowsPerPage: number
  ) => {
    setLoading(true);
    let responseData = await FetchAllEmailsSentByAdmin(
      {
        page: Number(page),
        perPage: Number(rowsPerPage),
        startDate: isCustomDate ? activityLogStartDate : null,
        endDate: isCustomDate ? activityLogEndDate : null,
        dateFilter: activityDate,
      },
      setLoading
    );
    setEmailsList(responseData?.emails_list || []);
    setTotalRows(responseData?.total_count || 0);
    setPerPage(rowsPerPage);
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getFetchAllEmailsSentByAdmin(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getFetchAllEmailsSentByAdmin(page, newPerPage);
  };

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value);
  };

  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;
    if (option === "View") {
      router.push(`${ApplicationURLS.ADMIN_COMMUNICATION_VIEW}/${id}`);
    }
  };

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_COMMUNICATION_VIEW}/${id}`);
  };

  const columns = [
    {
      name: "Date Sent",
      grow: true,
      selector: (row: any) =>
        row?.created_on
          ? format(new Date(row?.created_on), "dd/MM/yyyy")
          : "N/A",
    },
    {
      name: "To",
      selector: (row: any) => row?.toEmails?.toString(),
      wrap: true,
      fixed: "left",
      grow: true,
      minWidth: "200px",
    },
    {
      name: "Subject",
      selector: (row: any) => row.subject,
      wrap: true,
    },
    {
      name: "Action",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: any) => (
        <Overlays
          trigger="click"
          placement={"bottom-end"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[{ label: "View", value: "View" }]}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row.id,
          }}
          popperConfig={{
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [20, 10], // Adjust the offset as needed
                },
              },
            ],
          }}
        >
          <div style={{ cursor: "pointer" }}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: "",
            label: "Communication",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Communication Management</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.ADMIN_COMMUNICATION_ADD)}
        >
          + New
        </FormButton>
      </div>

      <ReusableDataTable
        columns={columns}
        data={emailsList}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            activityDateOptions={activityDateOptions}
            singleActivyDate={singleActivyDate}
            handleActivityChange={handleActivityChange}
            isCustomDate={isCustomDate}
            activityLogStartDate={activityLogStartDate}
            setActivityLogStartDate={setActivityLogStartDate}
            activityLogEndDate={activityLogEndDate}
            setActivityLogEndDate={setActivityLogEndDate}
            resetFilters={resetFilters} // Pass reset function to child
            isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => {
          handleRowView(data?.id);
        }}
      />
    </div>
  );
};

export default Communication;
