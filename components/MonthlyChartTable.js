import Link from "next/link";
import { monthName, shortMonthYear } from "@/lib/utils";

function chunkColumns(columns, chunkSize) {
  const chunks = [];
  for (let index = 0; index < columns.length; index += chunkSize) {
    chunks.push(columns.slice(index, index + chunkSize));
  }
  return chunks;
}

function displayGameName(game) {
  const name = game.replaceAll("_", " ").trim();
  const normalized = name.toLowerCase();
  const shortNames = {
    desawer: "DS",
    desawar: "DS",
    "delhi bazar": "DB",
    "shri ganesh": "SG",
    ghaziabad: "GB",
    faridabad: "FB"
  };

  return shortNames[normalized] || name.toUpperCase();
}

function ResultText({ value }) {
  const result = value || "-";
  const pending = String(result).toUpperCase() === "XX";
  return <span className={pending ? "result-pending" : undefined}>{result}</span>;
}

function ChartTables({ rows, chunks }) {
  return chunks.map((group, groupIndex) => (
    <table key={groupIndex} className="satta-results-table chart-table w-full border mb-5">
      <thead className="text-black">
        <tr className="chart-header-row text-sm md:text-base ">
          <th className="chart-cell chart-date-cell whitespace-nowrap px-3 py-2 border">Date</th>
          {group.map((game) => (
            <th key={game} className="chart-cell text-center px-3 py-2 border">
              {displayGameName(game)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${groupIndex}-${row.Date}-${rowIndex}`} className={`${rowIndex % 2 === 0 ? "chart-row" : "chart-row-alt"} text-center`}>
            <td className="chart-cell chart-date-cell px-3 py-2 border font-semibold text-sm md:text-base text-left">{row.Date}</td>
            {group.map((game) => (
              <td key={game} className="chart-cell px-3 py-2 border text-sm md:text-base">
                <ResultText value={row[game]} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ));
}

function monthLink(dateKey, offset) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return `/chart/result-chart-${shortMonthYear(date.toISOString().slice(0, 10))}`;
}

function monthLabel(dateKey, offset) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return monthName(date.toISOString().slice(0, 10));
}

export default function MonthlyChartTable({ title, rows, columns, dateKey, chunkSize = 10 }) {
  const desktopChunks = chunkColumns(columns, chunkSize);
  const mobileChunks = chunkColumns(columns, 6);
  const chartDateKey = dateKey || new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto mt-5">
      <div className="satta-table-container">
        <h2 className="chart-title text-center font-bold text-lg md:text-xl py-3 uppercase">{title}</h2>
        <div className="table-wrapper monthly-chart-desktop mb-8">
          <ChartTables rows={rows} chunks={desktopChunks} />
        </div>
        <div className="table-wrapper monthly-chart-mobile mb-8">
          <ChartTables rows={rows} chunks={mobileChunks} />
        </div>
        <div className="monthly-chart-nav">
          <Link className="monthly-chart-nav-btn" href={monthLink(chartDateKey, -1)}>
            {monthLabel(chartDateKey, -1)}
          </Link>
          <Link className="monthly-chart-nav-btn" href={monthLink(chartDateKey, 1)}>
            {monthLabel(chartDateKey, 1)}
          </Link>
        </div>
      </div>
    </div>
  );
}
