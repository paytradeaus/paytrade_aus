import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface AccountData {
  date1: string;
  audit: string;
  trans: string;
  corres: string;
  dr: string;
  bal: string;
}

// Extend jsPDF interface to include autoTable and lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
}

const TransparentTable: React.FC<{ data: AccountData[] }> = ({ data }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add header with background color and center alignment
    doc.setFillColor("#E7EEF4");
    doc.rect(0, 0, 210, 20, "F");

    // Create the header text with correct spacing
    const headerText = "Trust Account Ledger";
    const highlightedText = " for Project Trust Account"; // Notice the leading space here

    // Split the text to manage different styles
    const headerTextWidth = doc.getTextWidth(headerText);
    const highlightedTextWidth = doc.getTextWidth(highlightedText);

    // Set the font size and style for the header
    doc.setFontSize(14.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 0, 0);
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
    doc.setTextColor(0, 0, 0);
    doc.text(
      highlightedText,
      105 - (headerTextWidth + highlightedTextWidth) / 2 + headerTextWidth,
      12,
      {
        align: "left",
      }
    );

    const tableStyles = {
      fontSize: 8, // Reduce font size of body text
      halign: "center",
      valign: "middle",
      textColor: [0, 0, 0],
      fontStyle: "normal",
      lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },
      lineColor: [0, 0, 0],
      cellPadding: 3,
    };

    const headStyles = {
      halign: "center",
      valign: "left",
      fontStyle: "bold",
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },
      lineColor: [0, 0, 0],
    };

    const columnStyles = {
      0: { cellWidth: 25 }, // Reduced width for "Audit No"
      2: { cellWidth: 70 }, // Increased width for "Transaction Details"
      3: { cellWidth: 30 }, // Width for "Corresponding Account"
    };

    const didDrawCell = (data: any) => {
      let fillColor = "#FFFFFF"; // Default fill color

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
      } else {
        // Draw left and right borders for other rows
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
      }

      // Make "Transaction Details" column text bold
      if (data.column.index === 2) {
        doc.setFont("helvetica", "bold");
      } else if (
        data.column.index === 3 &&
        [
          "AD Electrician Pty Ltd",
          "AZ Concreter Pty Ltd",
          "CA Carpenter Pty Ltd",
        ].includes(data.cell.raw)
      ) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
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

      // Reset font to normal for next cell
      if (data.column.index === 2 || data.column.index === 3) {
        doc.setFont("helvetica", "normal");
      }
    };

    // Split the data into chunks and add them as separate tables
    const dataChunks = [
      data.slice(0, 2), // First two rows
      data.slice(2, 4), // Next two rows
      data.slice(4, 9), // Next five rows
    ];

    let currentY = 30; // Starting Y position

    dataChunks.forEach((chunk, index) => {
      if (index > 0) {
        currentY += 10; // Add space between tables
      }

      (doc as any).autoTable({
        startY: currentY,
        head:
          index === 0
            ? [
                [
                  "Date",
                  "Audit No",
                  "Transaction Details",
                  "Corresponding Account",
                  "Dr (Cr)",
                  "Balance",
                ],
              ]
            : undefined, // Only add head for the first table
        body: chunk.map((row) => [
          row.date1,
          row.audit,
          row.trans,
          row.corres,
          row.dr,
          row.bal,
        ]),
        styles: tableStyles,
        headStyles: headStyles,
        columnStyles: columnStyles,
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.1,
        lineWidth: { top: 0, left: 0, right: 0, bottom: 0.1 },
        didDrawCell: didDrawCell,
        margin: { top: 30 },
      });

      currentY = (doc as any).lastAutoTable.finalY;
    });

    doc.save("account_statement.pdf");
  };

  return (
    <div>
      <button onClick={generatePDF}>Generate PDF</button>
    </div>
  );
};

export default TransparentTable;
