import React from "react";

export default function ComparisonTable({
  heading,
  caption,
  columns,
  rows,
  notes,
}: {
  heading?: string;
  caption?: string;
  columns: string[];
  rows: string[][];
  notes?: string[];
}) {
  return (
    <section>
      {heading && <h2>{heading}</h2>}
      <div style={{ overflowX: "auto" }}>
        <table>
          {caption && <caption style={{ textAlign: "left", fontSize: "0.85rem", opacity: 0.75 }}>{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row" style={{ textAlign: "left" }}>
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex}>{cell}</td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notes?.map((note, index) => (
        <p key={index} style={{ fontSize: "0.85rem", opacity: 0.75 }}>
          {note}
        </p>
      ))}
    </section>
  );
}
