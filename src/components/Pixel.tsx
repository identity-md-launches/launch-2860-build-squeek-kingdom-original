import { useEffect, useRef } from "react";
import { hamster, structure } from "../game/art";
import type { Building, Hero, Resource, Item } from "../game/engine";
export function Hamster({
  hero = "Explorer",
  size = 64,
}: {
  hero?: Hero;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) {
      c.clearRect(0, 0, 64, 64);
      hamster(c, 32, 53, hero, 0, 1.7);
    }
  }, [hero]);
  return (
    <canvas
      aria-hidden="true"
      ref={ref}
      width={64}
      height={64}
      style={{ width: size, height: size }}
      className="pixel-art"
    />
  );
}
export function BuildingArt({
  id,
  size = 90,
}: {
  id: Building;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (c) {
      c.clearRect(0, 0, 150, 150);
      structure(c, id, 75, 125, 1, 0);
    }
  }, [id]);
  return (
    <canvas
      aria-hidden="true"
      ref={ref}
      width={150}
      height={150}
      style={{ width: size, height: size }}
      className="pixel-art"
    />
  );
}
const paths: Record<
  Resource | Item,
  { color: string; path: string; accent?: string }
> = {
  wood: {
    color: "#94663f",
    path: "M3 9 12 4 21 9 12 14ZM3 10V17L12 22V15ZM13 15V22L21 17V10",
    accent: "#c39a5a",
  },
  stone: {
    color: "#929b92",
    path: "M3 10 8 4H16L22 13 17 20H7L2 16ZM8 5 10 13 3 16M10 13 17 19 20 13",
    accent: "#bdc3b1",
  },
  gold: {
    color: "#b88629",
    path: "M8 3H17L22 8V17L16 22H7L2 16V8ZM9 7V18H15V7Z",
    accent: "#e4bc55",
  },
  crystals: {
    color: "#659b99",
    path: "M12 2 19 8 18 18 11 23 5 17 4 8ZM12 2V18L5 17M12 18 19 8",
    accent: "#a9dcd0",
  },
  food: {
    color: "#be7153",
    path: "M10 7 18 10 8 22 5 22 4 18ZM12 7 13 1 16 2 15 7 21 4 23 6 17 10",
    accent: "#718d4c",
  },
  planks: {
    color: "#ab8351",
    path: "M2 7 17 3 22 7 7 12ZM3 13 18 9 22 13 7 18ZM3 19 18 15 22 19 8 23",
    accent: "#d2b073",
  },
  gears: {
    color: "#a68a4c",
    path: "M9 2H15V6L19 4 22 9 19 12 22 16 18 21 15 18V23H9V19L5 21 2 16 5 12 2 8 6 4 9 6ZM10 9V15H15V9Z",
    accent: "#d4b56a",
  },
  potion: {
    color: "#9d759b",
    path: "M9 2H15V9L20 15V21H4V15L9 9ZM7 15V19H17V15ZM8 1H16V5H8",
    accent: "#cfb0c2",
  },
  armor: {
    color: "#8d9d87",
    path: "M7 3 12 7 17 3 22 7 18 12V22H6V12L2 7ZM10 10V20H14V10Z",
    accent: "#c3c9aa",
  },
};
export function ResourceIcon({
  id,
  size = 24,
}: {
  id: Resource | Item;
  size?: number;
}) {
  const p = paths[id];
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 26"
      className="resource-icon"
    >
      <path
        d={p.path}
        fill={p.color}
        stroke={p.accent}
        strokeWidth="1.1"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
