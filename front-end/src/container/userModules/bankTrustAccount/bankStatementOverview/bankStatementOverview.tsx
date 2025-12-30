import { ApplicationURLS } from "@/common/applicationURLS";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { RowsPerPageInTable } from "@/common/constants";
import { DD_MM_YYYY, EDIT, VIEW } from "@/common/constants/general";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { useParams, useRouter } from "next/navigation";
import React, { Fragment, useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { FetchAllBankStatements } from "../backTrustAccount.functions";
import { useLoaderContext } from "@/context/useLoader";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  FileEarmarkExcel,
  Printer,
  Search,
  ThreeDots,
} from "react-bootstrap-icons";
import styles from "../bankTrustAccountOverview/bankTrustAccountOverview.module.scss";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import FormButton from "@/components/Button/button";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TextField from "@/components/TextField/textField";
import customStyles from "./addEditBankStatement.module.scss";
import { activityDateOptions } from "../bankTrustAccount.constant";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import moment from "moment";

export default function BankStatementOverview({ bankDetailsData }: any) {
  //useState and useEffect Management
  const dispatch = useDispatch();
  const [statementPerPage, setStatementPerPage] = useState(RowsPerPageInTable);
  const [statementPage, setStatementPage] = useState(1);
  const [statementSearch, setStatementSearch] = useState("");
  const [bankTrustList, setBankTrustList] = useState([]);
  const [bankTrustListTotalCount, setBankTrustListTotalCount] = useState(0);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState<any>(
    activityDateOptions[0]
  );
  const [customStartDate, setCustomStartDate] = useState<any>(
    new Date().setHours(0, 0, 0, 0)
  );
  const [customEndDate, setCustomEndDate] = useState(new Date());

  useEffect(() => {
    if (params?.id?.length === 2) getBankTrustList();
  }, [
    statementPage,
    statementPerPage,
    statementSearch,
    selectedDateOption,
    customStartDate,
    customEndDate,
  ]);

  //Other Hooks
  const router = useRouter();
  const params = useParams();
  const { setLoader, loader }: any = useLoaderContext();

  //Functions
  function handleBankStatementActions(selectedOption: string, data: any) {
    if (selectedOption === EDIT || selectedOption === VIEW) {
      dispatch(
        setScreenDetails({
          fromScreen: "bankOverView",
          toScreen: "bank Statement",
          mainActiveTab: "",
          selectTab: "",
          subSelectTab: "",
        })
      );
      router.push(
        `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/bank-statement?screen=${selectedOption}&company=${params?.id[0]}&bank=${params?.id[1]}&account=${bankDetailsData?.bank_account_id}&statement=${data?.bank_statement_id}`
      );
    }
  }

  const handleRowView = (data: any) => {
    dispatch(
      setScreenDetails({
        fromScreen: "bankOverView",
        toScreen: "bank Statement",
        mainActiveTab: "",
        selectTab: "",
        subSelectTab: "",
      })
    );
    router.push(
      `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/bank-statement?screen=${VIEW}&company=${params?.id[0]}&bank=${params?.id[1]}&account=${bankDetailsData?.bank_account_id}&statement=${data?.bank_statement_id}`
    );
  };

  function handleAddBankStatement() {
    dispatch(
      setScreenDetails({
        fromScreen: "bankOverView",
        toScreen: "bank Statement",
        mainActiveTab: "",
        selectTab: "",
        subSelectTab: "",
      })
    );
    router.push(
      `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/bank-statement?screen=add&company=${params?.id[0]}&bank=${params?.id[1]}&account=${bankDetailsData?.bank_account_id}`
    );
  }

  async function handleStatementPerRowsChange(
    newPerPage: number,
    page: number
  ) {
    setStatementPerPage(newPerPage);
  }

  async function handleStatementPageChange(page: number) {
    setStatementPage(page);
  }

  async function getBankTrustList() {
    const postData = {
      payload: {
        bank_account_id: Number(params?.id[1]),
        company_id: Number(params?.id[0]),
        items_per_page: statementPerPage,
        status: null,
        search: statementSearch,
        page: statementPage,
        date_filter:
          selectedDateOption?.value === "All dates"
            ? ""
            : selectedDateOption?.value,
        added_date_to: customEndDate,
        added_date_from: customStartDate,
      },
    };

    setLoader(true);
    const response = await FetchAllBankStatements(postData);

    try {
      if (response) {
        setBankTrustList(response?.bank_statements);
        setBankTrustListTotalCount(response?.total_count);
        setLoader(false);
      } else {
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  function handleSearch(value: string) {
    setStatementSearch(value);
  }

  function onStartDateChange(selectedDate: string) {
    let fromDate = new Date(selectedDate);
    if (fromDate > customEndDate) {
      setCustomStartDate(fromDate);
      setCustomEndDate(new Date(selectedDate));
    } else {
      setCustomStartDate(fromDate);
    }
  }

  function onEndDateChange(selectedDate: string) {
    let toDate = new Date(selectedDate);
    if (toDate < customStartDate) {
      return;
    } else {
      setCustomEndDate(toDate);
    }
  }

  function handleDurationChange(selectedValue: any) {
    setSelectedDateOption(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setCustomStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setCustomEndDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setIsCustomDate(false);
    }
  }

  const bankStatementColumns = [
    {
      name: "Statement Date",
      grow: 1.5,
      wrap: true,

      selector: (row: any) =>
        row?.statement_date
          ? moment(row?.statement_date).format("MM/YYYY")
          : "",
    },

    {
      name: "Added on Date",
      grow: 1.5,
      wrap: true,

      selector: (row: any) =>
        row?.created_on ? formatDate(row?.created_on) : "",
    },

    {
      name: "View",
      grow: 2.5,
      selector: (row: any) => row?.bank_statement_name,
    },
    {
      name: "Actions",
      grow: 1,
      center: true,
      cell: (row: any, index: number) => (
        <Overlays
          trigger="click"
          placement={index === 0 ? "bottom-end" : "auto"}
          overlay={<span></span>}
          popoverActions={[
            { label: "View", value: "view" },
            { label: "Edit", value: EDIT },
          ]}
          popoverTypes={"tableActions"}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data: any) => {
            handleBankStatementActions(data?.option, row);
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
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  function handlePrintPDF() {
    let formattedTableData: any[] = bankTrustList.map((data: any) => [
      formatDate(data?.statement_date),
      formatDate(data?.created_on),
      data.bank_statement_name,
    ]);
    let headerNames: string[] = ["Statement Date", "Added on Date", "View"];
    generateAndPrintPDF(formattedTableData, headerNames, "bank-statements");
  }

  function downloadExcel() {
    const columnNames = [
      { value: "statement_date", label: "Statement Date" },
      { value: "created_on", label: "Added on Date" },
      { value: "bank_statement_name", label: "View" },
    ];

    const modifiedBankStatement = bankTrustList.map((data: any) => ({
      ...data,
      statement_date: formatDate(data?.statement_date),
      created_on: formatDate(data?.created_on),
    }));
    convertJsonToExcel(
      modifiedBankStatement,
      "bank-statements list",
      columnNames
    );
  }

  //Render Template
  return (
    <Fragment>
      <Row className="w-100">
        <Col xs={12}>
          <div className={styles.addButton}>
            <FormButton
              className={styles.buttonStyles}
              onClick={() => handleAddBankStatement()}
            >
              + Add
            </FormButton>
          </div>
        </Col>
        <Col>
          <Row>
            <Col xl={3} lg={4} md={4} sm={12} xs={12} className="mb-4">
              <TextField
                placeholder="Search by View"
                value={statementSearch}
                onChange={(e: any) => handleSearch(e?.target?.value)}
                type="text"
                autoFocus
                endingData={<Search />}
                endingDataStyles={styles.searchBarIcon}
                className={styles.searchBar}
              />
            </Col>
            <Col xl={6} lg={6} sm={12} xs={12} md={12} className="px-0">
              <Row>
                <Col xs={12} sm={12} md={4} lg={4} xl={3}>
                  <SearchableSelect
                    options={activityDateOptions}
                    onChange={handleDurationChange}
                    disabled={false}
                    placeholder="select option"
                    singleSelectedData={selectedDateOption}
                  />
                </Col>
                <Col xs={12} sm={12} md={6} lg={7} xl={6}>
                  {isCustomDate && (
                    <Row>
                      <Col>
                        <CustomDatePicker
                          showIcon={true}
                          placeholderText="&nbsp;From date"
                          value={customStartDate}
                          onChange={(selectedDate: string) =>
                            onStartDateChange(selectedDate)
                          }
                          format={DD_MM_YYYY}
                          className={customStyles.listDatePicker}
                        />
                      </Col>
                      <Col>
                        <CustomDatePicker
                          showIcon={true}
                          placeholderText="&nbsp;To date"
                          value={customEndDate}
                          onChange={(selectedDate: string) =>
                            onEndDateChange(selectedDate)
                          }
                          format={DD_MM_YYYY}
                          className={customStyles.listDatePicker}
                        />
                      </Col>
                    </Row>
                  )}
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
        {bankTrustList?.length > 0 && (
          <Col xl={2} lg={2} md={2} xs={12} className={styles?.subHeaderIcon}>
            <span
              className={styles.icon}
              onClick={() => handlePrintPDF()}
              title="Print PDF"
            >
              <Printer />
            </span>
            <span
              className={styles.icon}
              onClick={() => downloadExcel()}
              title="Export to Excel"
            >
              <FileEarmarkExcel />
            </span>
          </Col>
        )}
      </Row>
      <ReusableDataTable
        columns={bankStatementColumns}
        data={bankTrustList ?? []}
        subHeader
        pagination
        progressPending={loader}
        paginationServer
        paginationTotalRows={bankTrustListTotalCount ?? 0}
        onChangeRowsPerPage={handleStatementPerRowsChange}
        onChangePage={handleStatementPageChange}
        onRowClicked={(data: any) => handleRowView(data)}
      />
    </Fragment>
  );
}
