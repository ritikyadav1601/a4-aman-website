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

const featuredGameList = [
  { key: "shiv dham", name: "Shiv Dham" },
  { key: "pushkar bazar", name: "Pushkar Bazar" },
  { key: "delhi metro", name: "Delhi Metro" },
  { key: "delhi bazar", name: "Delhi BAZAR" },
  { key: "shri sayam", name: "Shri Sayam" },
  { key: "shri ganesh", name: "Shri Ganesh" },
  { key: "kolmbia", name: "Kolmbia" },
  { key: "faridabad", name: "FARIDABAD" },
  { key: "makka-madina", name: "Makka-Madina" },
  { key: "ghaziabad", name: "GHAZIABAD" },
  { key: "kalka night", name: "Kalka Night" },
  { key: "gali", name: "GALI" },
  { key: "desawer", name: "DESAWER" },
  { key: "desawar", name: "DESAWER" }
];

const featuredGameKeys = new Set(featuredGameList.map((game) => game.key));

function normalizeGameName(name = "") {
  return String(name).toLowerCase().trim();
}

function featuredGameOrder(name = "") {
  return featuredGameList.findIndex((game) => game.key === normalizeGameName(name));
}

function isPending(value) {
  return String(value).toUpperCase() === "XX";
}

function resultScore(game) {
  return (isPending(game.first) ? 0 : 2) + (isPending(game.second) ? 0 : 1);
}

function pickBestGame(candidates, displayName) {
  return [...candidates].sort((a, b) => {
    const score = resultScore(b) - resultScore(a);
    if (score) return score;
    return Number(normalizeGameName(b.name) === normalizeGameName(displayName)) - Number(normalizeGameName(a.name) === normalizeGameName(displayName));
  })[0];
}

function LiveResultSection({ games, showClock = false }) {
  if (!games.length) return null;

  return (
    <div className="live-result-section bg-white">
      {showClock ? <Clock /> : null}
      <h1 className="live-result-title">Satta King Live Result Today</h1>
      <div className="live-result-list">
        {games.map((item) => (
          <div className="live-result-item text-center" key={item._id}>
            <h2 className="live-result-game">{item.name}</h2>
            <p className={`live-result-value${resultClass(item.second)}`}>{item.second}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function yearlyChartOrder(name = "") {
  const main = new Map([
    ["desawer", 0],
    ["desawar", 0],
    ["delhi bazar", 1],
    ["shri ganesh", 2],
    ["faridabad", 3],
    ["ghaziabad", 4],
    ["gali", 5]
  ]);
  return main.get(String(name).toLowerCase().trim());
}

export default async function HomePage() {
  const [ads, games, monthly] = await Promise.all([
    getAds(),
    getGamesWithTodayResults(),
    getMonthlyRows({ untilToday: true })
  ]);
  const gamesByName = games.reduce((map, game) => {
    const key = normalizeGameName(game.name);
    const existing = map.get(key) || [];
    existing.push(game);
    map.set(key, existing);
    return map;
  }, new Map());
  const featuredGames = featuredGameList
    .map((item) => {
      const candidates = gamesByName.get(item.key) || [];
      const game = pickBestGame(candidates, item.name);
      return game ? { ...game, name: item.name } : null;
    })
    .filter(Boolean)
    .filter((game, index, list) => list.findIndex((item) => normalizeGameName(item.name) === normalizeGameName(game.name)) === index);
  const featuredTopGames = await getTopGames(featuredGames);
  const remainingGames = games.filter((game) => !featuredGameKeys.has(normalizeGameName(game.name)));
  const remainingTopGames = await getTopGames(remainingGames);
  const yearlyGames = [...games].sort((a, b) => {
    const aOrder = yearlyChartOrder(a.name);
    const bOrder = yearlyChartOrder(b.name);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return 0;
  });
  const today = istDate();
  const title = `Satta King Record Chart ${monthName(today)}`;
  const year = new Date().getFullYear();

  return (
    <PublicLayout>
      <div className="home-blue-band home-blue-band-top"></div>
      <LiveResultSection games={featuredTopGames} showClock />
      <div className="home-blue-band home-blue-band-bottom"></div>
      <AdBlock ad={ads[0]} />
      <GameCards games={featuredGames} />
      <LiveResultSection games={remainingTopGames} />
      <GameCards games={remainingGames} />
      {/* <AdBlock ad={ads[1] || ads[0]} /> */}
      <hr style={{ height: 10, marginTop: 0, marginBottom: 10, backgroundColor: "#00FF00" }} />
      <hr style={{ height: 10, backgroundColor: "rgb(2 85 70)" }} />
      <MonthlyChartTable title={title} rows={monthly.rows} columns={monthly.gameColumns} dateKey={today} />
      <div className="mx-auto py-8">
        <div className="px-5 grid grid-cols-1">
          {yearlyGames.map((game) => (
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
