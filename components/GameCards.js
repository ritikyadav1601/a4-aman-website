import Link from "next/link";
import { formatTime, slugify } from "@/lib/utils";

function ResultText({ value }) {
  const pending = String(value).toUpperCase() === "XX";
  return <span className={pending ? "result-pending a7-wait" : undefined}>{pending ? "wait" : value}</span>;
}

function GameRow({ game }) {
  const year = new Date().getFullYear();
  return (
    <tr>
      <td>
        <Link className="a7-game-link" href={`/year-chart/${slugify(game.name)}-result-chart-${year}`}>
          {game.name}
        </Link>
        <span className="a7-game-time">{formatTime(game.resultTime)}</span>
      </td>
      <td><ResultText value={game.first} /></td>
      <td><ResultText value={game.second} /></td>
    </tr>
  );
}

export default function GameCards({ games }) {
  const filtered = games.filter(
    (game) => game.name?.toLowerCase() !== "desawer"
  );

  if (!filtered.length) {
    return <div className="empty-state p-4 text-center font-bold">No active games found. Import SQL data from admin database backup.</div>;
  }

  return (
    <section className="a7-result-table-section">
      <table className="a7-result-table">
        <thead>
          <tr>
            <th>सट्टा का नाम</th>
            <th>कल आया था</th>
            <th>आज का रिज़ल्ट</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((game) => <GameRow key={game._id} game={game} />)}
        </tbody>
      </table>
    </section>
  );
}
