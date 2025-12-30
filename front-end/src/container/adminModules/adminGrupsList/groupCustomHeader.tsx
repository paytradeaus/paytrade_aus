import React from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TextField from "@/components/TextField/textField";
import { Printer, FileEarmarkExcel } from "react-bootstrap-icons";
import styles from "./adminGrupsList.module.scss";

interface CustomSubHeaderProps {
  search: string;
  onInputChange: (e: { target: { value: string } }) => void;
  options: { value: string; label: string }[];
  handleSelectChange: (selectedValue: any) => void;
  singleSelectedData: any;
  printDocumentData: any[];
  handlePrintPDF: () => void;
  downloadExcel: () => void;
}
const CustomSubHeader: React.FC<CustomSubHeaderProps> = ({
  search,
  onInputChange,
  options,
  singleSelectedData,
  handleSelectChange,
  printDocumentData,
  handlePrintPDF,
  downloadExcel,
}) => (
  <div className={styles.customSubHeaderCon}>
    <div className={styles.textAndSelectCon}>
      <TextField
        placeholder="Search by Name"
        value={search}
        onChange={onInputChange}
        type="text"
        className={styles.textFieldStyles}
      />
      <SearchableSelect
        options={options}
        singleSelectedData={singleSelectedData}
        onChange={handleSelectChange}
        disabled={false}
        placeholder="Status"
      />
    </div>
    {printDocumentData?.length > 0 && (
      <div className={styles.headerIconCon}>
        <span
          className={styles.iconStyles}
          onClick={handlePrintPDF}
          title="Print PDF"
        >
          <Printer />
        </span>
        <span
          className={styles.iconStyles}
          onClick={downloadExcel}
          title="Export to Excel"
        >
          <FileEarmarkExcel />
        </span>
      </div>
    )}
  </div>
);

export default CustomSubHeader;
