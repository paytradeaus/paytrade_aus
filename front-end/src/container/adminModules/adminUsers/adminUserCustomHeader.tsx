import React from "react";
import TextField from "@/components/TextField/textField";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { Printer, FileEarmarkExcel } from "react-bootstrap-icons";
import styles from "./adminUsers.module.scss";

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: { target: { value: string } }) => void;
  options: { value: string; label: string }[];
  handleSelectChange: (selectedValue: any) => void;
  selectedData: any;
  printDocumentData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
}

const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  options,
  handleSelectChange,
  selectedData,
  printDocumentData,
  handlePrintPDF,
  downloadExcel,
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <TextField
        placeholder="Search by Name,Email"
        value={search}
        onChange={onInputChange}
        type="text"
        className={styles.textFieldStyles}
      />
      <SearchableSelect
        options={options}
        onChange={handleSelectChange}
        disabled={false}
        placeholder="Status"
        selectedData={selectedData}
      />
    </div>
    {printDocumentData?.length > 0 && (
      <div className={styles.headerIconCon}>
        <span
          className={styles.iconStyles}
          onClick={() => {
            if (printDocumentData?.length) {
              handlePrintPDF();
            }
          }}
          title="Print PDF"
        >
          <Printer />
        </span>
        <span
          className={styles.iconStyles}
          onClick={() => {
            if (printDocumentData?.length) {
              downloadExcel();
            }
          }}
          title="Export to Excel"
        >
          <FileEarmarkExcel />
        </span>
      </div>
    )}
  </div>
);

export default CustomSubHeader;
