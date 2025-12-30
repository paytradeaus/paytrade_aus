import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface AccountData {
  date: string;
  audit: string;
  transaction: string;
  corresponding: string;
  bsb: string;
  accnt: string;
  amt: string;
  bal: string;
}

// Extend jsPDF interface to include autoTable and lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
}

const GenerateSinglePDF: React.FC<{ data: AccountData[] }> = ({ data }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add header with background color and center alignment
    doc.setFillColor("#E7EEF4");
    doc.rect(0, 0, 210, 20, "F");

    // Create the header text with correct spacing
    const headerText = "Record of Deposits and Withdrawals for";
    const highlightedText = "Project Trust Account"; // Notice the leading space here
    const fullText = headerText + highlightedText;

    // Split the text to manage different styles
    const headerTextWidth = doc.getTextWidth(headerText);
    const highlightedTextWidth = doc.getTextWidth(highlightedText);

    // Set the font size and style for the header
    doc.setFontSize(14.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(
      headerText,
      105 - (headerTextWidth + highlightedTextWidth) / 2,
      12,
      {
        align: "left",
      }
    );

    // Set the font size and style for the highlighted text
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 0, 0);
    doc.text(
      highlightedText,
      105 - (headerTextWidth + highlightedTextWidth) / 2 + headerTextWidth,
      12,
      {
        align: "left",
      }
    );

    // First table with custom styles
    (doc as any).autoTable({
      startY: 30,
      head: [
        [
          "Date",
          "Audit No",
          "Transaction Details",
          "Corresponding Account",
          "BSB",
          "Account No",
          "Transaction Amount",
          "Balance",
        ],
      ],
      body: data.map((row) => [
        row.date,
        row.audit,
        row.transaction,
        row.corresponding,
        row.bsb,
        row.accnt,
        row.amt,
        row.bal,
      ]),
      styles: {
        fontSize: 7, // Reduce font size of body text
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
        2: { cellWidth: 50 }, // Increase width of "Transaction Details"
        3: { cellWidth: 30 }, // Increase width of "Corresponding Account"
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.1,
      lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },

      // Override default styles for body
      didDrawCell: (data: any) => {
        let fillColor = "#E7EEF4"; // Default fill color

        // Set background color for specific columns
        if (data.column.index === 3) {
          fillColor = "#7FDFFF"; // "Corresponding Account"
        } else if (data.column.index === 4 || data.column.index === 5) {
          fillColor = "#BBBDBF"; // "BSB" and "Account No"
        }

        // Draw cell background
        doc.setFillColor(fillColor);
        doc.rect(
          data.cell.x,
          data.cell.y,
          data.cell.width,
          data.cell.height,
          "F"
        );

        // Draw cell borders for first row in body
        if (data.row.index === 0 && data.row.section === "body") {
          doc.setDrawColor(0);
          doc.setLineWidth(0.1);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y
          ); // Top border
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height
          ); // Left border
          doc.line(
            data.cell.x + data.cell.width,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          ); // Right border
        } else {
          // Draw left and right borders for other rows
          doc.setDrawColor(0);
          doc.setLineWidth(0.1);
          doc.line(
            data.cell.x,
            data.cell.y,
            data.cell.x,
            data.cell.y + data.cell.height
          ); // Left border
          doc.line(
            data.cell.x + data.cell.width,
            data.cell.y,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          ); // Right border
        }

        // Set text color to black
        doc.setTextColor(0);

        // Adjust text position to center within cell
        const textPos = {
          x: data.cell.x + data.cell.width / 2,
          y: data.cell.y + data.cell.height / 2,
        };
        doc.text(data.cell.text, textPos.x, textPos.y, {
          align: "center",
          baseline: "middle",
        });
      },
      margin: { top: 30 },
    });

    doc.save("account_statement.pdf");
  };

  return (
    <div>
      <button onClick={generatePDF}>Generate PDF</button>
    </div>
  );
};

export default GenerateSinglePDF;
