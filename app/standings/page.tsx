import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { formatPlayerName } from "@/lib/formatName";
import { LEAGUE } from "@/lib/league";
import { getStandings, rankRows } from "@/lib/standings";
import styles from "./standings.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const data = await getStandings(LEAGUE.currentSeasonId)();
  const ranked = rankRows(data.rows);

  const hasData = data.rows.length > 0;

  return (
    <main className="screen screen--standings">
      <header className="rs-header">
        <Link href="/" className="back-btn">
          ← Today
        </Link>
        <div className="rs-title-wrap">
          <Eyebrow rule={false}>[ SEASON · {LEAGUE.currentSeasonId} ]</Eyebrow>
          <h1 className="rs-title">The Standings</h1>
          <div className="rs-course">
            ▸ {LEAGUE.name} · {LEAGUE.course}
          </div>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>EVENTS/</span>
            <span>{String(data.events.length).padStart(2, "0")}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>PLAYERS/</span>
            <span>{String(data.rows.length).padStart(2, "0")}</span>
          </div>
        </div>
      </header>

      {!hasData && (
        <section className="state-center">
          <Eyebrow rule hot>[ NO DATA ]</Eyebrow>
          <p className="state-body">
            No events have been ingested yet. Run a backfill via
            <code> /api/admin/backfill</code> to populate the season.
          </p>
        </section>
      )}

      {hasData && (
        <div className={styles.scoreboard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.cellPos} ${styles.headCell}`}>POS</th>
                <th className={`${styles.cellPts} ${styles.headCell}`}>PTS</th>
                <th className={`${styles.cellPlayer} ${styles.headCell}`}>
                  PLAYER
                </th>
                {data.events.map((ev) => (
                  <th
                    key={ev.id}
                    className={`${styles.cellMatch} ${styles.headCell}`}
                  >
                    <div className={styles.matchHeadTop}>M{ev.matchNo}</div>
                    <div className={styles.matchHeadBot}>
                      {formatShortDate(ev.eventDate)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, idx) => (
                <tr key={row.playerId}>
                  <td className={styles.cellPos}>
                    {String(row.rank).padStart(2, "0")}
                  </td>
                  <td
                    className={`${styles.cellPts} ${idx === 0 ? styles.cellPtsHot : ""}`}
                  >
                    {formatPoints(row.totalPoints)}
                  </td>
                  <td className={styles.cellPlayer}>
                    {formatPlayerName(row.displayName)}
                  </td>
                  {data.events.map((ev) => {
                    const pts = row.pointsByEvent[ev.id];
                    return (
                      <td
                        key={ev.id}
                        className={`${styles.cellMatch} ${
                          pts === undefined ? styles.cellEmpty : ""
                        }`}
                      >
                        {pts === undefined ? "·" : formatPoints(pts)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="home-footer">
        <div className="home-footer__rule" />
        <div className="home-footer__text">
          <span>v0.5 · STANDINGS</span>
          <span>UDISC ↔ LIVE</span>
        </div>
      </footer>
    </main>
  );
}

function formatPoints(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}.${parseInt(d, 10)}`;
}
