import { useEffect, useRef } from "react";
import { anchor, drawKingdom, MAP_W, MAP_H } from "../game/art";
import { BUILDINGS, type Building, type GameState } from "../game/engine";
export function KingdomMap({
  game,
  onSelect,
  paused,
}: {
  game: GameState;
  onSelect: (b: Building) => void;
  paused: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const current = useRef(game);
  current.current = game;
  const hover = useRef<Building | null>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    let frame = 0,
      last = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || reduced.matches) {
      drawKingdom(
        c,
        current.current.buildings,
        current.current.hero,
        0,
        hover.current,
      );
      return;
    }
    const draw = (t: number) => {
      if (t - last > 100) {
        drawKingdom(
          c,
          current.current.buildings,
          current.current.hero,
          paused || reduced.matches ? 0 : t,
          hover.current,
        );
        last = t;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [paused, game.buildings, game.hero]);
  return (
    <div className="kingdom-scene">
      <canvas
        ref={ref}
        width={MAP_W}
        height={MAP_H}
        aria-label="Isometric pixel-art kingdom on a wooded river island. Use the building controls to build and upgrade."
        role="img"
      />
      {(Object.keys(BUILDINGS) as Building[]).map((id) => {
        const [x, y] = anchor(id);
        return (
          <button
            key={id}
            className={`map-hotspot ${game.buildings[id] ? "" : "unbuilt"}`}
            style={{
              left: `${(x / MAP_W) * 100}%`,
              top: `${(y / MAP_H) * 100}%`,
            }}
            aria-label={`${BUILDINGS[id].name}, ${game.buildings[id] ? `level ${game.buildings[id]}` : "empty plot"}. Build or upgrade.`}
            onMouseEnter={() => (hover.current = id)}
            onFocus={() => (hover.current = id)}
            onMouseLeave={() => (hover.current = null)}
            onBlur={() => (hover.current = null)}
            onClick={() => onSelect(id)}
          >
            <span className="map-building-name">{BUILDINGS[id].name}</span>
            <span className="map-level">{game.buildings[id] || "+"}</span>
          </button>
        );
      })}
    </div>
  );
}
