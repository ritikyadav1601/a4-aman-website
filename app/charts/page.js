import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import { getMonthlyRows } from "@/lib/data";
import { istDate, monthName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChartsPage() {
  const monthly = await getMonthlyRows({ untilToday: true });
  const today = istDate();
  return (
    <PublicLayout>
      <MonthlyChartTable title={`Satta King Record Chart ${monthName(today)}`} rows={monthly.rows} columns={monthly.gameColumns} dateKey={today} />
    </PublicLayout>
  );
}
