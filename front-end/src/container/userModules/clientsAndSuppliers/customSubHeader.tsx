import {
  generateAndPrintPDF,
  convertJsonToExcel,
} from "@/common/commonFunctions";
import { filterByDuration } from "@/common/constants/data";
import { DD_MM_YYYY } from "@/common/constants/general";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TextField from "@/components/TextField/textField";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import React, { useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import {
  Search,
  Printer,
  FileEarmarkExcel,
  ArrowClockwise,
} from "react-bootstrap-icons";
import { toggleOptions } from "./clientSuppliers.constant";
import customStyles from "./clientsAndSuppliers.module.scss";
import { useClientsSuppliersContext } from "./clientsAndSuppliersContext";

interface TableData {
  id: string;
  client_supplier_name: string;
  business_name: string;
  client_supplier_type: string;
  client_supplier_address: string;
  contract_count: string;
  payment_claims: string;
  client_supplier_status: string;
}

export default function CustomSubHeader({ invokeGridList, gridData }: any) {
  const {
    searchedValue,
    selectedToggle,
    selectedDuration,
    customStartDate,
    customEndDate,
    setSearchedValue,
    setCustomStartDate,
    setCustomEndDate,
    setSelectedDuration,
    setIsCustomDate,
    setSelectedToggle,
  }: any = useClientsSuppliersContext();

  useEffect(() => {
    invokeGridList();
  }, [
    searchedValue,
    selectedToggle,
    selectedDuration,
    customStartDate,
    customEndDate,
  ]);

  function handleSearch(value: string) {
    setSearchedValue(value);
  }

  function onStartDateChange(selectedDate: string) {
    const fromDate = new Date(new Date(selectedDate).setHours(0, 0, 0, 0));
    if (fromDate > customEndDate) {
      setCustomStartDate(fromDate);
      setCustomEndDate(new Date(selectedDate));
    } else {
      setCustomStartDate(fromDate);
    }
  }

  function onEndDateChange(selectedDate: string) {
    const toDate = new Date(selectedDate);
    if (toDate < customStartDate) return;
    setCustomEndDate(toDate);
  }

  function handleDurationChange(selectedValue: any) {
    setSelectedDuration(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      resetDateFilters();
    }
  }

  function resetDateFilters() {
    setCustomStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setCustomEndDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setIsCustomDate(false);
  }

  function handlePrintPDF() {
    const formattedTableData: any[] = gridData.map((data: TableData) => [
      data.client_supplier_name,
      data.business_name,
      data.client_supplier_type,
      data.client_supplier_address,
      data.contract_count,
      data.client_supplier_status,
    ]);
    const headerNames: string[] = [
      "Name",
      "Business Name",
      "Client/Supplier",
      "Address",
      "Contracts",
      "Status",
    ];
    generateAndPrintPDF(
      formattedTableData,
      headerNames,
      "clients-and-suppliers"
    );
  }

  function downloadExcel() {
    const columnNames = [
      { value: "client_supplier_name", label: "Name" },
      { value: "business_name", label: "Business Name (if applicable)" },
      { value: "client_supplier_type", label: "Client/Supplier" },
      { value: "client_supplier_address", label: "Address" },
      { value: "contract_count", label: "Contracts" },
      { value: "client_supplier_status", label: "Status" },
    ];
    convertJsonToExcel(gridData, "clients/suppliers list", columnNames);
  }

  function resetFilters() {
    setSearchedValue(""); // Clear the search input
    // resetDateFilters(); // Reset date filters
    // setSelectedToggle(toggleOptions[0]); // Reset toggle to the first option, adjust as needed
    // setSelectedDuration(null); // Reset duration selection
  }

  // Check for active filters to determine if the reset button should be shown
  const isAnyFilterActive = !!(
    searchedValue
    // selectedDuration ||
    // customStartDate ||
    // customEndDate
  );

  return (
    <Row className="w-100">
      <Col xs={12} sm={10} md={10} lg={10} xl={10}>
        <Row>
          <Col xs={12} sm={6} md={5} lg={4}>
            <RadioSwitchToggle
              radioOptions={toggleOptions}
              selected={selectedToggle}
              handleToggleChange={(e: any) => setSelectedToggle(e)}
            />
          </Col>
          <Col xs={12} sm={4} md={4} lg={3} className={customStyles.nameField}>
            <TextField
              placeholder="Search by name"
              value={searchedValue}
              onChange={(e: any) => handleSearch(e?.target?.value)}
              type="text"
              endingData={<Search />}
              endingDataStyles={customStyles.searchBarIcon}
              className={customStyles.searchBar}
            />
          </Col>
          <Col lg={3}>
            {isAnyFilterActive && (
              <div>
                <button
                  onClick={resetFilters}
                  className={customStyles.resetButton}
                >
                  <ArrowClockwise /> Reset Filters
                </button>
              </div>
            )}
          </Col>
        </Row>
      </Col>
      <Col
        xs={12}
        sm={2}
        md={2}
        lg={2}
        xl={2}
        className={customStyles?.subHeaderIcon}
      >
        <span
          className={customStyles.icon}
          onClick={() => {
            if (gridData?.length) {
              handlePrintPDF();
            }
          }}
          title="Print PDF"
        >
          <Printer />
        </span>
        <span
          className={customStyles.icon}
          onClick={() => {
            if (gridData?.length) {
              downloadExcel();
            }
          }}
          title="Export to Excel"
        >
          <FileEarmarkExcel />
        </span>
      </Col>
    </Row>
  );
}
