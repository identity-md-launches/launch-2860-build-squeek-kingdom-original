import { useEffect, useRef, useState } from "react";
import { Flag, Zap, Trophy, ArrowRight, Radio } from "lucide-react";
import { Hamster } from "./Pixel";
import type { GameState, Action } from "../game/engine";
import {
  currentRound,
  freshMeasurement,
  type useSqueekChain,
} from "../integration/api";
type Feed = ReturnType<typeof useSqueekChain>;
type Running = {
  mode: "practice" | "wheel";
  start: number;
  player: number;
  boosts: number;
  startWork: string;
  epoch: string;
  core: string;
  installation: string;
  round: string;
  invalid: boolean;
  gear: boolean;
  duration: number;
};
export function Race({
  game,
  perform,
  feed,
  onRacing,
}: {
  game: GameState;
  perform: (a: Action) => boolean;
  feed: Feed;
  onRacing: (v: boolean) => void;
}) {
  const [race, setRace] = useState<Running | null>(null),
    [mode, setMode] = useState<"practice" | "wheel">("practice"),
    [result, setResult] = useState<{
      won: boolean;
      text: string;
      player: number;
      opponent: number;
      mode: "practice" | "wheel";
    } | null>(null),
    [clock, setClock] = useState(Date.now());
  const raceRef = useRef(race),
    feedRef = useRef(feed),
    gameRef = useRef(game);
  raceRef.current = race;
  feedRef.current = feed;
  gameRef.current = game;
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 100);
    return () => {
      clearInterval(id);
      onRacing(false);
    };
  }, [onRacing]);
  useEffect(() => {
    const r = raceRef.current;
    if (!r) return;
    const f = feedRef.current;
    const s = gameRef.current;
    const elapsed = Math.min(r.duration, (clock - r.start) / 1000);
    const liveHealthy =
      f.ready &&
      freshMeasurement(f.pipeline.data) &&
      f.pipeline.data?.measurement?.counterEpoch === r.epoch &&
      f.core.data?.identities.core === r.core &&
      f.core.data?.installationId === r.installation;
    const invalid = r.invalid || (r.mode === "wheel" && !liveHealthy);
    if (elapsed >= r.duration) {
      const player =
        elapsed * (3 + (s.buildings.arena - 1) * 0.35) +
        (r.gear ? 15 : 0) +
        r.boosts * 9;
      const current = f.pipeline.data?.measurement?.cumulativeWorkUnits;
      const delta =
        current && BigInt(current) >= BigInt(r.startWork)
          ? Number(BigInt(current) - BigInt(r.startWork))
          : 0;
      const opponent =
        r.mode === "wheel" && !invalid ? delta * 2 : elapsed * 3.6 + 5;
      const won = player >= opponent;
      perform({
        type: "raceFinish",
        won,
        ...(r.mode === "wheel" && !invalid
          ? {
              live: {
                round: r.round,
                core: r.core,
                installation: r.installation,
              },
            }
          : {}),
      });
      setResult({
        won,
        player,
        opponent,
        mode: invalid ? "practice" : r.mode,
        text: invalid
          ? "Measurement became unavailable. This finished as a practice race; no round bonus was registered."
          : r.mode === "wheel"
            ? `Compared with ${delta} real wheel passages between the sampled device observations. A winning challenge can register a local bonus for round ${r.round} once it settles. Only one round bonus can be pending at a time.`
            : "Practice against a local computer rival. Boosts and arena upgrades improve your pace.",
      });
      setRace(null);
      raceRef.current = null;
      onRacing(false);
    } else if (invalid && !r.invalid) setRace({ ...r, invalid: true });
  }, [clock, perform, onRacing]);
  function start() {
    const now = Date.now(),
      p = feed.pipeline.data,
      c = feed.core.data;
    const useLive = mode === "wheel" && feed.ready && p?.measurement && c;
    if (mode === "wheel" && !useLive) return;
    if (!perform({ type: "raceStart" })) return;
    const next: Running = {
      mode,
      start: now,
      player: 0,
      boosts: 0,
      startWork: p?.measurement?.cumulativeWorkUnits ?? "0",
      epoch: p?.measurement?.counterEpoch ?? "",
      core: c?.identities.core ?? "",
      installation: c?.installationId ?? "",
      round: c ? currentRound(c, now).id : "",
      invalid: false,
      gear: false,
      duration: 20,
    };
    setRace(next);
    raceRef.current = next;
    setResult(null);
    onRacing(true);
  }
  const elapsed = race ? Math.min(20, (clock - race.start) / 1000) : 0;
  const player = race
    ? elapsed * (3 + (game.buildings.arena - 1) * 0.35) +
      (race.gear ? 15 : 0) +
      race.boosts * 9
    : (result?.player ?? 0);
  const work = feed.pipeline.data?.measurement?.cumulativeWorkUnits;
  const wheelDelta =
    race && work && BigInt(work) >= BigInt(race.startWork)
      ? Number(BigInt(work) - BigInt(race.startWork))
      : 0;
  const rival = race
    ? race.mode === "wheel" && !race.invalid
      ? wheelDelta * 2
      : elapsed * 3.6 + 5
    : (result?.opponent ?? 0);
  const maximum = Math.max(100, player, rival);
  return (
    <div className="race-content">
      <div className="section-intro">
        <div>
          <h2>Small paws. Serious speed.</h2>
          <p>A 20-second sprint. No stakes, just sunflower-fueled glory.</p>
        </div>
        <Flag size={28} />
      </div>
      <div className="segmented" aria-label="Race mode">
        <button
          aria-pressed={mode === "practice"}
          disabled={!!race}
          onClick={() => setMode("practice")}
        >
          Practice race
        </button>
        <button
          aria-pressed={mode === "wheel"}
          disabled={!!race}
          onClick={() => setMode("wheel")}
        >
          <Radio size={15} />
          Wheel challenge
        </button>
      </div>
      <p className="race-explainer">
        {mode === "practice"
          ? "Race Bramble, a local computer rival. Use up to three boosts to find your winning pace."
          : "Race against actual WHEELY9000 passage counts observed during your sprint. Real 600-second rounds unlock a local crystal bonus after settlement."}
      </p>
      {mode === "wheel" && !feed.ready && (
        <p className="notice-inline">
          Wheel challenges need fresh hardware measurements and a current
          Sepolia round. Try a practice race or refresh the signal below.
        </p>
      )}
      <div className="race-world" aria-label="Animated race track">
        <div className="race-scenery" />
        <div className="finish-line" />
        <div className="race-lane">
          <span className="lane-name">You</span>
          <div
            className={`runner ${race ? "running" : ""}`}
            style={{ left: `${8 + Math.min(80, (player / maximum) * 80)}%` }}
          >
            <Hamster hero={game.hero} size={60} />
          </div>
        </div>
        <div className="race-lane">
          <span className="lane-name">
            {(
              race
                ? race.mode === "wheel" && !race.invalid
                : result
                  ? result.mode === "wheel"
                  : mode === "wheel"
            )
              ? "Squeektoshi"
              : "Bramble · CPU"}
          </span>
          <div
            className={`runner rival ${race && (race.mode === "practice" || race.invalid || (feed.pipeline.data?.measurement?.rpmMilli ?? 0) > 0) ? "running" : ""}`}
            style={{ left: `${8 + Math.min(80, (rival / maximum) * 80)}%` }}
          >
            <Hamster hero="Warrior" size={60} />
          </div>
        </div>
        <div className="race-flower" />
      </div>
      {race ? (
        <>
          <div className="race-readout">
            <strong>{Math.max(0, 20 - elapsed).toFixed(1)}s</strong>
            <span>
              {race.mode === "wheel" && !race.invalid
                ? `${wheelDelta} observed wheel passages`
                : "Local practice race"}
            </span>
            <span>{3 - race.boosts} boosts left</span>
          </div>
          <div className="button-row">
            <button
              className="primary"
              disabled={race.boosts >= 3}
              onClick={() =>
                setRace((r) => (r ? { ...r, boosts: r.boosts + 1 } : r))
              }
            >
              <Zap size={17} />
              Boost pace
            </button>
            <button
              className="secondary"
              disabled={race.gear || game.inventory.gears < 1}
              onClick={() => {
                if (perform({ type: "raceGear" }))
                  setRace((r) => (r ? { ...r, gear: true } : r));
              }}
            >
              Use copper gear ({game.inventory.gears})
            </button>
          </div>
          <p className="fine-print">
            Race animation shows relative game pace. Wheel passages are device
            measurements, not settled work.
          </p>
        </>
      ) : (
        <div className="race-start">
          <div>
            <strong>Ready at the starting line?</strong>
            <span>Entry: 5 food · Win: 30 game gold + 35 XP</span>
          </div>
          <button
            className="primary"
            disabled={
              (mode === "wheel" && !feed.ready) || game.resources.food < 5
            }
            onClick={start}
          >
            Start {mode === "wheel" ? "wheel challenge" : "practice race"}
            <ArrowRight size={17} />
          </button>
        </div>
      )}
      {result && (
        <div className={`race-result ${result.won ? "win" : ""}`} role="status">
          <Trophy size={26} />
          <div>
            <h3>
              {result.won
                ? "A mighty little victory!"
                : "Every lap makes a champion."}
            </h3>
            <p>{result.text}</p>
          </div>
        </div>
      )}
      {game.pendingRound && (
        <p className="notice-inline">
          Round {game.pendingRound.round} bonus pending. The game will add 10
          crystals when the API reports this round settled on the same
          deployment.
        </p>
      )}
    </div>
  );
}
