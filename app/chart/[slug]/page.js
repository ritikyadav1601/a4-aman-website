import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import { getMonthlyRows } from "@/lib/data";
import { monthName } from "@/lib/utils";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

function parseDateFromSlug(slug = "") {
  const raw = decodeURIComponent(slug).replace(/^result-chart-/, "");
  const date = new Date(`01 ${raw.replace(/-/g, " ")}`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const safeDate = parseDateFromSlug(resolvedParams.slug || "");
  const year = safeDate.getFullYear();
  const month = safeDate.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const dateKey = `${year}-${String(safeDate.getMonth() + 1).padStart(2, "0")}-01`;
  const title = `Satta King Chart ${monthName(dateKey)} | ${month} ${year} Result Records`;

  return {
    title,
    description: `Complete Satta King Result Chart for ${month} ${year}. Daily results for Gali, Desawar, Ghaziabad, Faridabad and all major satta games with full monthly records.`,
    alternates: {
      canonical: `${siteUrl}/chart/${resolvedParams.slug}`
    },
    openGraph: {
      title,
      description: `Satta King chart for ${month} ${year} — complete day-by-day results for all games.`,
      url: `${siteUrl}/chart/${resolvedParams.slug}`,
      type: "website"
    }
  };
}

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
      <MonthlyChartTable title={`Satta Result Chart ${monthName(dateKey)}`} rows={monthly.rows} columns={monthly.gameColumns} dateKey={dateKey} />
    </PublicLayout>
  );
}
