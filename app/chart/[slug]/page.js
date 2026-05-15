import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import { getMonthlyRows } from "@/lib/data";
import { monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MonthChartPage({ params }) {
  const resolvedParams = await params;
  const raw = decodeURIComponent(resolvedParams.slug || "").replace(/^result-chart-/, "");
  const date = new Date(`01 ${raw.replace(/-/g, " ")}`);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = safeDate.getMonth() + 1;
  const monthly = await getMonthlyRows({ year, month, untilToday: false });
  const dateKey = `${year}-${String(month).padStart(2, "0")}-01`;

  return (
    <PublicLayout>
      <MonthlyChartTable title={`Satta King Record Chart ${monthName(dateKey)}`} rows={monthly.rows} columns={monthly.gameColumns} dateKey={dateKey} />
    </PublicLayout>
  );
}
