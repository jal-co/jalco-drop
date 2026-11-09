import type { Table } from "@/table";

export function DataTable({ table }: { table: Table }) {
  const hidden = table.totalRows - table.rows.length;
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th aria-label="Row" />
            {table.header.map((cell, column) => <th key={column}>{cell}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              <td className="row-number">{index + 1}</td>
              {table.header.map((_, column) => <td key={column}>{row[column] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {hidden > 0 && <p className="data-table-note">{hidden.toLocaleString("en-US")} more rows. Download the file to see them all.</p>}
    </div>
  );
}
