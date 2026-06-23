import Link from "next/link";
import AdBlock from "@/components/AdBlock";
import Clock from "@/components/Clock";
import GameCards from "@/components/GameCards";
import MonthlyChartTable from "@/components/MonthlyChartTable";
import PublicLayout from "@/components/PublicLayout";
import YearlyChartSeoContent from "@/components/YearlyChartSeoContent";
import { getGamesWithTodayResults, getMonthlyRows, getTopGames } from "@/lib/data";
import { formatTime, istDate, monthName, slugify } from "@/lib/utils";

export const revalidate = 30;

function resultClass(value) {
  return String(value).toUpperCase() === "XX" ? " result-pending" : "";
}

const featuredGameList = [
  { key: "desawer", name: "DESAWER" },
  { key: "desawar", name: "DESAWER" },
  { key: "sadar bazar", name: "Sadar bazar" },
  { key: "delhi darbar", name: "Delhi Darbar" },
  { key: "gwalior", name: "Gwalior" },
  { key: "delhi bazar", name: "Delhi BAZAR" },
  { key: "new ganga", name: "New Ganga" },
  { key: "delhi matka", name: "Delhi Matka" },
  { key: "shri ganesh", name: "Shri Ganesh" },
  { key: "agra", name: "Agra" },
  { key: "faridabad", name: "FARIDABAD" },
  { key: "fatehabad", name: "Fatehabad" },
  { key: "alwar", name: "Alwar" },
  { key: "mandi bazar", name: "Mandi Bazar" },
  { key: "ghaziabad king", name: "Ghaziabad King" },
  { key: "ghaziabad", name: "GHAZIABAD" },
  { key: "dwarka", name: "Dwarka" },
  { key: "gali", name: "GALI" },
  { key: "shiv dham", name: "Shiv Dham" },
  { key: "pushkar bazar", name: "Pushkar Bazar" },
  { key: "delhi metro", name: "Delhi Metro" },
  { key: "shri sayam", name: "Shri Sayam" },
  { key: "kolmbia", name: "Kolmbia" },
  { key: "makka-madina", name: "Makka-Madina" },
  { key: "kalka night", name: "Kalka Night" }
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

function timeToMinutes(time = "") {
  const [hours, minutes] = String(time).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function currentIstMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(map.hour) * 60 + Number(map.minute);
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

function resultUpdatedTime(game) {
  const date = game.secondUpdatedAt ? new Date(game.secondUpdatedAt) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.valueOf() : 0;
}

function getHeroGames(games) {
  const now = currentIstMinutes();
  const byTime = [...games].sort((a, b) => timeToMinutes(a.resultTime) - timeToMinutes(b.resultTime));
  
  // Game 1: next upcoming (result time hasn't passed yet)
  const upcoming = byTime.find((game) => timeToMinutes(game.resultTime) > now) || byTime[0];
  
  const selected = upcoming ? [upcoming] : [];
  const selectedIds = new Set(selected.map((game) => String(game._id)));

  // Game 2 & 3: last 2 games with declared (non-pending) results, most recent first
  const recentlyDeclared = [...games]
    .filter((game) => !selectedIds.has(String(game._id)) && !isPending(game.second))
    .sort((a, b) => resultUpdatedTime(b) - resultUpdatedTime(a));

  for (const game of recentlyDeclared) {
    if (selected.length >= 3) break;
    selected.push(game);
    selectedIds.add(String(game._id));
  }

  // fallback: fill with any remaining games
  for (const game of games) {
    if (selected.length >= 3) break;
    if (!selectedIds.has(String(game._id))) selected.push(game);
  }

  return selected;
}

function LiveResultSection({ games, showClock = false }) {
  if (!games.length) return null;

  return (
    <section className={showClock ? "a7-hero-results" : "a7-compact-results"}>
      {showClock ? <Clock /> : null}
      {showClock ? <p className="hintext">हा भाई यही आती हे सबसे पहले खबर रूको और देखो</p> : null}
      <div className="live-result-list">
        {games.map((item) => (
          <div className="live-result-item text-center" key={item._id}>
            <h2 className="live-result-game">{item.name}</h2>
            <p className={`live-result-value${resultClass(item.second)}`}>{item.second}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedMarketStrip({ game }) {
  if (!game) return null;

  return (
    <section className="a7-feature-strip">
      <h2>{game.name}</h2>
      <p>{formatTime(game.resultTime)}</p>
      <strong>
        <span className={resultClass(game.first)}>{game.first}</span>
        <span className="a7-arrow">➜</span>
        <span className={resultClass(game.second)}>{game.second}</span>
      </strong>
    </section>
  );
}

function yearlyChartOrder(name = "") {
  const normalized = String(name).toLowerCase().trim();
  const index = featuredGameList.findIndex((game) => game.key === normalized);
  return index === -1 ? undefined : index;
}

export default async function HomePage() {
  const games = await getGamesWithTodayResults();
  const monthly = await getMonthlyRows({ untilToday: true, games });
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
    return String(a.resultTime).localeCompare(String(b.resultTime)) || normalizeGameName(a.name).localeCompare(normalizeGameName(b.name));
  });
  const today = istDate();
  const year = new Date().getFullYear();
  const title = `Satta Result Chart ${monthName(today)} ${year}`;
  const featuredMarket = featuredGames.find((game) => normalizeGameName(game.name) === "desawer") || featuredGames[0];
  const heroGames = getHeroGames(featuredGames);

  return (
    <PublicLayout>
      <LiveResultSection games={heroGames.length ? heroGames : featuredTopGames} showClock />
      <FeaturedMarketStrip game={featuredMarket} />
      <AdBlock />
      <GameCards games={featuredGames} />
      <LiveResultSection games={remainingTopGames} />
      <GameCards games={remainingGames} />
      <MonthlyChartTable title={title} rows={monthly.rows} columns={monthly.gameColumns} dateKey={today} />
      <section className="a7-year-links">
        <h2>SATTA RECORD CHART {year}</h2>
        <div className="a7-year-link-list">
          {yearlyGames.map((game) => (
            <Link href={`/year-chart/${slugify(game.name)}-result-chart-${year}`} key={game._id}>
              {game.name} {year}
            </Link>
          ))}
        </div>
      </section>
      <YearlyChartSeoContent />
    </PublicLayout>
  );
}
