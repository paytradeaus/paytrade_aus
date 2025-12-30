import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface AccountData {
  account: string;
  debit: number;
  credit: number;
  reason: string;
}

// Extend jsPDF interface to include autoTable and lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
}

const GeneratePDF: React.FC<{
  data: AccountData[];
  secondTableData: AccountData[];
}> = ({ data, secondTableData }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add header with background color and center alignment
    doc.setFillColor("#A41E34");
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(
      "Trust Ledger Trial Balance Statement for Project Trust Account (PTA)",
      105,
      12,
      { align: "center" }
    );

    // Add subheader centered
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("For Period Ended 30/04/2022", 105, 30, { align: "center" });

    // First table with custom styles
    (doc as any).autoTable({
      startY: 38,
      head: [["Account", "Dr", "Cr"]],
      body: data.map((row) => [
        row.account,
        isNaN(row.debit) ? "" : `$${row.debit.toFixed(2)}`,
        isNaN(row.credit) ? "" : `$${row.credit.toFixed(2)}`,
      ]),
      styles: {
        halign: "center",
        valign: "middle",
        textColor: [0, 0, 0],
        fontStyle: "normal",
        lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },
        lineColor: [0, 0, 0],
        cellPadding: 3,
      },
      headStyles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: { top: 0, left: 0.1, right: 0.1, bottom: 0.1 },
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { halign: "center", valign: "middle", cellWidth: "wrap" }, // Account column
        1: { halign: "center", valign: "middle", cellWidth: "auto" }, // Dr column
        2: { halign: "center", valign: "middle", cellWidth: "auto" }, // Cr column
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.1,
      lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },

      // Override default styles for body
      didDrawCell: (data: any) => {
        // Apply background color to the first row of body section
        if (data.row.index === 0 && data.row.section === "body") {
          doc.setFillColor("#F9DFE3");
          doc.setDrawColor(169, 44, 64);
          doc.setLineWidth(0.3);
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            "F"
          );

          // Draw borders
          doc.setDrawColor(169, 44, 64);
          doc.setLineWidth(0.3);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height
          );
          doc.line(
            data.cell.x + data.cell.width,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y
          );
          doc.setLineWidth(0.9);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        } else {
          doc.setFillColor("#FFFFFF");
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            "F"
          );
          doc.setDrawColor(0);
          doc.setLineWidth(0.1);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height
          );
          doc.line(
            data.cell.x + data.cell.width,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        }

        // Set text color to black
        doc.setTextColor(0);

        // Adjust text position to center within cell
        const textPos = {
          x: data.cell.x + data.cell.width / 2,
          y: data.cell.y + data.cell.height / 2 + 1,
        };
        doc.text(data.cell.text, textPos.x, textPos.y, {
          align: "center",
          baseline: "middle",
        });
      },
      margin: { top: 35 },
    });

    // Calculate text height manually for Adjustments text
    const adjustmentsText =
      "Trust Ledger Trial Balance Statement for Retention Trust Account (RTA)";
    const pageWidth = doc.internal.pageSize.getWidth();
    const startY = (doc as any).lastAutoTable.finalY + 20;
    const fontSize = (doc as any).internal.getFontSize();
    const textHeight =
      (fontSize * (doc as any).internal.scaleFactor) /
      (doc as any).internal.scaleFactor;

    // Draw background rectangle for "Adjustments" spanning the full width
    doc.setFillColor("#575A5D");
    doc.rect(0, startY - textHeight / 2 - 2, pageWidth, textHeight + 2, "F");

    // Add Adjustments text
    doc.setFontSize(14);
    doc.setTextColor(255);
    doc.text(adjustmentsText, pageWidth / 2, startY, {
      align: "center",
    });

    // Add Reasons for Adjustments text with additional top space
    const reasonsForAdjustmentsY = startY + 18; // Adjust this value to increase/decrease top space
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(
      "For Period Ended 30/04/2022",
      pageWidth / 2,
      reasonsForAdjustmentsY,
      {
        align: "center",
      }
    );

    // Second table with different styles
    (doc as any).autoTable({
      startY: reasonsForAdjustmentsY + 10, // Start below the headings with additional top space
      head: [["Account", "Dr", "Cr"]],
      body: secondTableData.map((row) => [
        row.account,
        isNaN(row.debit) ? "" : `$${row.debit.toFixed(2)}`,
        isNaN(row.credit) ? "" : `$${row.credit.toFixed(2)}`,
      ]),
      styles: {
        halign: "center",
        valign: "middle",
        textColor: [0, 0, 0],
        fontStyle: "normal",
        lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },
        lineColor: [0, 0, 0],
        cellPadding: 3,
        fillColor: [230, 230, 230], // Light grey background for all cells
      },
      headStyles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        fillColor: [200, 200, 200], // Darker grey for header
        textColor: [0, 0, 0],
        lineWidth: { top: 0.1, left: 0.1, right: 0.1, bottom: 0.1 },
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { halign: "left", valign: "middle", cellWidth: "auto" }, // Reason column
        1: { halign: "center", valign: "middle", cellWidth: "auto" }, // Dr column
        2: { halign: "center", valign: "middle", cellWidth: "auto" }, // Cr column
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.1,

      didDrawCell: (data: any) => {
        // Apply background color to the first row of body section
        if (data.row.index === 0 && data.row.section === "body") {
          doc.setFillColor("#FDF4E4");
          doc.setDrawColor(247, 170, 41);
          doc.setLineWidth(0.3);
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            "F"
          );

          // Draw borders
          doc.setDrawColor(247, 170, 41);
          doc.setLineWidth(0.3);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height
          );
          doc.line(
            data.cell.x + data.cell.width,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y
          );
          doc.setLineWidth(0.9);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        } else {
          doc.setFillColor("#FFFFFF");
          doc.rect(
            data.cell.x,
            data.cell.y,
            data.cell.width,
            data.cell.height,
            "F"
          );
          doc.setDrawColor(0);
          doc.setLineWidth(0.1);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height
          );
          doc.line(
            data.cell.x + data.cell.width,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        }

        // Set text color to black
        doc.setTextColor(0);

        // Adjust text position to center within cell
        const textPos = {
          x: data.cell.x + data.cell.width / 2,
          y: data.cell.y + data.cell.height / 2 + 1,
        };
        doc.text(data.cell.text, textPos.x, textPos.y, {
          align: "center",
          baseline: "middle",
        });
      },
    });

    doc.save("account_statement.pdf");
  };

  return (
    <div>
      <button onClick={generatePDF}>Generate PDF</button>
    </div>
  );
};

export default GeneratePDF;
