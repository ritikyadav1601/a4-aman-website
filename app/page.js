import Link from "next/link";
import AdBlock from "@/components/AdBlock";
import Clock from "@/components/Clock";
import GameCards from "@/components/GameCards";
import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import { getAds, getGamesWithTodayResults, getMonthlyRows, getTopGames } from "@/lib/data";
import { istDate, monthName, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

function resultClass(value) {
  return String(value).toUpperCase() === "XX" ? " result-pending" : "";
}

export default async function HomePage() {
  const [ads, games, monthly] = await Promise.all([
    getAds(),
    getGamesWithTodayResults(),
    getMonthlyRows({ untilToday: true })
  ]);
  const topGames = await getTopGames(games);
  const today = istDate();
  const title = `Satta King Record Chart ${monthName(today)}`;
  const year = new Date().getFullYear();

  return (
    <PublicLayout>
      <div className="home-blue-band home-blue-band-top"></div>
      <div className="live-result-section bg-white">
        <Clock />
        <h1 className="live-result-title">Satta King Live Result Today</h1>
        <div className="live-result-list">
          {topGames.map((item) => (
            <div className="live-result-item text-center" key={item._id}>
              <h2 className="live-result-game">{item.name}</h2>
              <p className={`live-result-value${resultClass(item.second)}`}>{item.second}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="home-blue-band home-blue-band-bottom"></div>
      <AdBlock ad={ads[0]} />
      <GameCards games={games} />
      {/* <AdBlock ad={ads[1] || ads[0]} /> */}
      <hr style={{ height: 10, marginTop: 0, marginBottom: 10, backgroundColor: "#00FF00" }} />
      <hr style={{ height: 10, backgroundColor: "rgb(2 85 70)" }} />
      <MonthlyChartTable title={title} rows={monthly.rows} columns={monthly.gameColumns} dateKey={today} />
      <div className="mx-auto py-8">
        <div className="px-5 grid grid-cols-1">
          {games.map((game) => (
            <Link className="hover:underline border-2 shadow-xl rounded-lg my-1" href={`/year-chart/${slugify(game.name)}-result-chart-${year}`} key={game._id}>
              <div className="overflow-hidden transition-all duration-300 transform cursor-pointer">
                <div className="py-4 text-center">
                  <h3 className="text-xl font-bold uppercase">{game.name} YEARLY CHART {year}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
