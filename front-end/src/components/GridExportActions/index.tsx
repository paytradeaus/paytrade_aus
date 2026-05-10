import { convertJsonToExcel, generateAndPrintPDF } from "@/utils/export";
import { ReactNode, useRef } from "react";

// TypeScript interfaces for props and data structures
interface ButtonConfig {
  className?: string;
  toolTip?: string;
  buttonName?: string;
  function?: () => void;
}

interface ExcelFileConfig {
  tableData: any[];
  sheetName: string;
  LabelAndValueKey: any[];
}

interface PdfFileConfig {
  tableData: any[];
  fileName: string;
  headerRow: string[];
  dataRow: string[];
}

interface GridExportActionsProps {
  pdfButton?: ButtonConfig;
  excelButton?: ButtonConfig;
  excelFile?: ExcelFileConfig;
  pdfFile?: PdfFileConfig;
  resetFilter?: ButtonConfig;
  templateButton?: ButtonConfig;
  uploadFileButton?: ButtonConfig;
  hideUploadFileButton?: boolean;
  hideTemplateButton?: boolean;
  resetFilterFunction?: () => void;
  hidePdfButton?: boolean;
  hideExcelButton?: boolean;
  hideResetButton?: boolean;
  handleDownloadPrintPDF?: () => void;
  handleDownloadExcelFile?: () => void;
  handleDownloadAbaFile?: () => void;
  handleTemplateButton?: () => void;
  handleUploadFileButton?: (file: File) => void;
  disabledOnExcel?: boolean;
  disabledPDF?: boolean;
  exportFromAPI?: boolean;
  hideAbaFileButton?: boolean;
  abaFileButton?: ButtonConfig;
  disabledAbaFile?: boolean;
  leadingActions?: ReactNode;
}

const defaultPdfButton: ButtonConfig = {
  className: "fa-light fa-print",
  toolTip: "Print",
};

const defaultResetButton: ButtonConfig = {
  className: "fa-light fa-arrow-rotate-left",
  buttonName: "Reset Filters",
};

const defaultExcelButton: ButtonConfig = {
  className: "fa-light fa-file-spreadsheet",
  toolTip: "Export",
};

const defaultAbaFileButton: ButtonConfig = {
  className: "fa-light fa-building-columns",
  toolTip: "Generate ABA file",
};

const defaultTemplateButton: ButtonConfig = {
  className: "fa-light fa-file-import",
  toolTip: "Download template",
};

const defaultUploadFileButton: ButtonConfig = {
  className: "fa-light fa-file-upload",
  toolTip: "Upload file",
};

const defaultExcelFile: ExcelFileConfig = {
  sheetName: "excel list",
  tableData: [],

  LabelAndValueKey: [],
};

const defaultPdfFile: PdfFileConfig = {
  fileName: "paytrade",
  tableData: [],
  headerRow: [],
  dataRow: [],
};

export default function GridExportActions({
  pdfButton = defaultPdfButton,
  excelButton = defaultExcelButton,
  excelFile = defaultExcelFile,
  pdfFile = defaultPdfFile,
  resetFilter = defaultResetButton,
  templateButton = defaultTemplateButton,
  uploadFileButton = defaultUploadFileButton,
  resetFilterFunction = () => {},
  hideExcelButton,
  hidePdfButton,
  hideResetButton,
  hideUploadFileButton = true,
  hideTemplateButton = true,
  handleDownloadPrintPDF,
  handleDownloadExcelFile,
  handleUploadFileButton,
  handleTemplateButton,
  disabledOnExcel = false,
  disabledPDF = false,
  exportFromAPI = false,
  hideAbaFileButton = true,
  abaFileButton = defaultAbaFileButton,
  handleDownloadAbaFile,
  disabledAbaFile = false,
  leadingActions,
}: Readonly<GridExportActionsProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadExcel() {
    if (excelFile.tableData.length > 0) {
      convertJsonToExcel(
        excelFile?.tableData,
        excelFile?.sheetName,
        excelFile?.LabelAndValueKey
      );
    }
  }

  function handlePrintPDF() {
    if (pdfFile.tableData.length > 0) {
      const formattedTableData = pdfFile.tableData.map((dataObj) =>
        pdfFile.dataRow.map((key) => dataObj[key])
      );

      generateAndPrintPDF(
        formattedTableData,
        pdfFile?.headerRow,
        pdfFile?.fileName
      );
    }
  }

  const handleUploadFileRef = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: any) => {
    const file = event.target.files[0];
    handleUploadFileButton?.(file);
    event.target.value = "";
  };

  return (
    <div className="pt_pageactions">
      <div className="actionbuttons">
        <div role="group">
          {leadingActions}
          {!hideResetButton && (
            <button
              className="secondary outline resetlink"
              onClick={resetFilterFunction}
            >
              <i className={resetFilter?.className}></i>
              <span>{resetFilter?.buttonName}</span>
            </button>
          )}
          {!hideTemplateButton && (
            <button
              className="secondary outline"
              data-tooltip={templateButton?.toolTip}
              onClick={downloadExcel}
            >
              <i className={templateButton?.className}></i>
            </button>
          )}
          {!hideUploadFileButton && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                className="secondary outline"
                data-tooltip={uploadFileButton?.toolTip}
                onClick={handleUploadFileRef}
              >
                <i className={uploadFileButton?.className}></i>
              </button>
            </>
          )}
          {!hideAbaFileButton && (
            <button
              className="secondary outline"
              data-tooltip={abaFileButton?.toolTip}
              onClick={handleDownloadAbaFile}
              disabled={disabledAbaFile}
            >
              <i className={abaFileButton?.className}></i>
            </button>
          )}
          {!hidePdfButton && (
            <button
              className="secondary outline"
              data-tooltip={pdfButton?.toolTip}
              onClick={
                exportFromAPI
                  ? handleDownloadPrintPDF
                  : pdfButton.function || handlePrintPDF
              }
              disabled={disabledPDF}
            >
              <i className={pdfButton?.className}></i>
            </button>
          )}
          {!hideExcelButton && (
            <button
              className="secondary outline"
              data-tooltip={excelButton?.toolTip}
              onClick={
                exportFromAPI
                  ? handleDownloadExcelFile
                  : excelButton.function || downloadExcel
              }
              disabled={disabledOnExcel}
            >
              <i className={excelButton?.className}></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
