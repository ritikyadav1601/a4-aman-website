import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import { getMonthlyRows } from "@/lib/data";
import { istDate, monthName } from "@/lib/utils";

export const revalidate = 30;

export default async function ChartsPage() {
  const monthly = await getMonthlyRows({ untilToday: true });
  const today = istDate();
  const year = new Date().getFullYear();
  return (
    <PublicLayout>
      <MonthlyChartTable title={`Satta Result Chart ${monthName(today)} ${year}`} rows={monthly.rows} columns={monthly.gameColumns} dateKey={today} />
    </PublicLayout>
  );
}
