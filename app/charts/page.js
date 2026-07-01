import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import { getMonthlyRows } from "@/lib/data";
import { istDate, monthName } from "@/lib/utils";

export const revalidate = 30;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

export async function generateMetadata() {
  const today = istDate();
  const year = new Date().getFullYear();
  const month = monthName(today);
  return {
    title: `Satta King Chart ${month} ${year} | Monthly Result Records`,
    description: `Complete Satta King Result Chart for ${month} ${year}. View daily results for Gali, Desawar, Ghaziabad, Faridabad and all major games in one monthly chart.`,
    alternates: {
      canonical: `${siteUrl}/charts`
    },
    openGraph: {
      title: `Satta King Chart ${month} ${year} | Monthly Result Records`,
      description: `Satta King monthly chart for ${month} ${year} with complete daily results for all games.`,
      url: `${siteUrl}/charts`,
      type: "website"
    }
  };
}

export default async function ChartsPage() {
  const monthly = await getMonthlyRows({ untilToday: true });
  const today = istDate();
  return (
    <PublicLayout>
      <MonthlyChartTable title={`Satta Result Chart ${monthName(today)}`} rows={monthly.rows} columns={monthly.gameColumns} dateKey={today} />
    </PublicLayout>
  );
}
