import type { Building, Hero } from "./engine";
export const MAP_W = 768,
  MAP_H = 500;
export const PLOTS: Record<Building, [number, number]> = {
  castle: [3, 3],
  mine: [7, 2],
  workshop: [2, 5],
  laboratory: [7, 5],
  arena: [6, 8],
  farm: [3, 7],
};
export const point = (x: number, y: number): [number, number] => [
  384 + (x - y) * 31,
  66 + (x + y) * 16,
];
export const anchor = (id: Building) => point(...PLOTS[id]);
type Ctx = CanvasRenderingContext2D;
function rect(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function poly(c: Ctx, p: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  p.forEach(([x, y], i) =>
    i
      ? c.lineTo(Math.round(x), Math.round(y))
      : c.moveTo(Math.round(x), Math.round(y)),
  );
  c.closePath();
  c.fill();
}
function rand(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function diamond(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  poly(
    c,
    [
      [x, y - h / 2],
      [x + w / 2, y],
      [x, y + h / 2],
      [x - w / 2, y],
    ],
    color,
  );
}
function block(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  d: number,
  color: string,
  side: string,
) {
  poly(
    c,
    [
      [x - w / 2, y - d / 2],
      [x, y],
      [x, y - h],
      [x - w / 2, y - h - d / 2],
    ],
    color,
  );
  poly(
    c,
    [
      [x, y],
      [x + w / 2, y - d / 2],
      [x + w / 2, y - h - d / 2],
      [x, y - h],
    ],
    side,
  );
  diamond(c, x, y - h - d / 2, w, d, color);
}
function tree(c: Ctx, x: number, y: number, n: number) {
  const colors =
    n % 5 === 0
      ? ["#ba774e", "#d7985b", "#e6b96c"]
      : ["#446b4b", "#638751", "#86a15c"];
  diamond(c, x + 5, y + 4, 42, 18, "#587d5277");
  rect(c, x - 4, y - 29, 9, 32, "#76563e");
  rect(c, x + 1, y - 28, 4, 30, "#997249");
  poly(
    c,
    [
      [x - 22, y - 19],
      [x - 26, y - 33],
      [x - 18, y - 43],
      [x - 19, y - 50],
      [x - 11, y - 57],
      [x - 10, y - 64],
      [x + 6, y - 68],
      [x + 19, y - 56],
      [x + 25, y - 43],
      [x + 20, y - 34],
      [x + 21, y - 22],
      [x + 9, y - 16],
    ],
    colors[0],
  );
  poly(
    c,
    [
      [x - 20, y - 34],
      [x - 16, y - 48],
      [x - 7, y - 57],
      [x + 4, y - 61],
      [x + 16, y - 51],
      [x + 19, y - 38],
      [x + 8, y - 32],
      [x - 1, y - 25],
    ],
    colors[1],
  );
  rect(c, x - 8, y - 55, 12, 7, colors[2]);
  rect(c, x - 16, y - 43, 8, 7, colors[2]);
  rect(c, x + 8, y - 41, 8, 5, colors[2]);
  rect(c, x + 11, y - 27, 6, 5, colors[1]);
  rect(c, x - 10, y - 23, 5, 4, colors[1]);
}
function pine(c: Ctx, x: number, y: number) {
  rect(c, x - 3, y - 30, 6, 33, "#775b43");
  for (let i = 0; i < 3; i++) {
    const yy = y - 14 - i * 14;
    poly(
      c,
      [
        [x, yy - 35],
        [x + 22 - i * 4, yy],
        [x - 22 + i * 4, yy],
      ],
      "#3c6652",
    );
    poly(
      c,
      [
        [x, yy - 35],
        [x, yy - 3],
        [x - 22 + i * 4, yy],
      ],
      "#548262",
    );
    rect(c, x - 7, yy - 17, 6, 4, "#739867");
  }
}
function crystal(c: Ctx, x: number, y: number, h: number) {
  poly(
    c,
    [
      [x, y],
      [x - 7, y - 7],
      [x - 7, y - h + 8],
      [x, y - h],
      [x + 6, y - h + 8],
      [x + 6, y - 5],
    ],
    "#5b91aa",
  );
  poly(
    c,
    [
      [x, y - 1],
      [x, y - h],
      [x + 6, y - h + 8],
      [x + 6, y - 5],
    ],
    "#a7e2d5",
  );
  poly(
    c,
    [
      [x, y - h],
      [x - 7, y - h + 8],
      [x, y - h + 12],
      [x + 6, y - h + 8],
    ],
    "#d9f4db",
  );
}
function roof(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color = "#ad634b",
) {
  poly(
    c,
    [
      [x - w / 2 - 5, y - 5],
      [x - 7, y - h - 20],
      [x + w / 2 + 5, y - 22],
      [x + 8, y + 2],
    ],
    color,
  );
  poly(
    c,
    [
      [x - 7, y - h - 20],
      [x + w / 2 + 5, y - 22],
      [x + w / 2 + 5, y - 15],
      [x - 7, y - h - 13],
    ],
    "#d98b61",
  );
  for (let i = 0; i < 4; i++)
    poly(
      c,
      [
        [x - w / 2 + 4 + i * 8, y - 7 - i * 8],
        [x + 8 + i * 8, y - 1 - i * 8],
        [x + 8 + i * 8, y + 1 - i * 8],
        [x - w / 2 + 4 + i * 8, y - 5 - i * 8],
      ],
      "#8b5546",
    );
}
export function hamster(
  c: Ctx,
  x: number,
  y: number,
  hero: Hero = "Explorer",
  step = 0,
  scale = 1,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  diamond(c, 1, 2, 24, 8, "#45614955");
  rect(c, -9, -18, 18, 14, "#ab7047");
  rect(c, -11, -14, 22, 9, "#cc965c");
  rect(c, -8, -23, 6, 7, "#b87b4c");
  rect(c, 3, -23, 6, 7, "#b87b4c");
  rect(c, -6, -21, 3, 4, "#f1b4a0");
  rect(c, 4, -21, 3, 4, "#f1b4a0");
  rect(c, -7, -17, 15, 13, "#e1b880");
  rect(c, -5, -10, 11, 8, "#fff0c9");
  rect(c, -5, -15, 2, 3, "#354838");
  rect(c, 4, -15, 2, 3, "#354838");
  rect(c, 0, -11, 2, 2, "#8f5447");
  rect(c, -8, -11, 3, 2, "#d78b70");
  rect(c, 7, -11, 3, 2, "#d78b70");
  rect(c, -7 + (step % 2) * 2, -3, 5, 3, "#a77550");
  rect(c, 4 - (step % 2) * 2, -3, 5, 3, "#a77550");
  const color = {
    Miner: "#b09d4a",
    Warrior: "#a4584b",
    Engineer: "#6b8ba0",
    Explorer: "#55794c",
  }[hero];
  rect(c, -9, -7, 18, 3, color);
  if (hero === "Explorer") {
    rect(c, -10, -20, 21, 3, color);
    rect(c, -5, -25, 12, 6, color);
    rect(c, 2, -26, 4, 2, "#d5bc75");
  }
  if (hero === "Miner") {
    rect(c, -10, -21, 21, 4, color);
    rect(c, -6, -25, 13, 5, color);
    rect(c, -1, -25, 5, 4, "#fff0ae");
  }
  if (hero === "Warrior") {
    rect(c, -8, -23, 17, 6, "#a0aaa4");
    rect(c, 6, -21, 3, 10, "#a0aaa4");
    rect(c, -11, -21, 3, 10, "#a0aaa4");
  }
  if (hero === "Engineer") {
    rect(c, -8, -17, 8, 4, "#506070");
    rect(c, 2, -17, 8, 4, "#506070");
    rect(c, -6, -16, 4, 2, "#afd4d1");
    rect(c, 4, -16, 4, 2, "#afd4d1");
  }
  c.restore();
}
export function structure(
  c: Ctx,
  id: Building,
  x: number,
  y: number,
  level: number,
  time = 0,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  const built = level > 0;
  diamond(c, 3, 5, id === "arena" ? 116 : 85, 38, "#5c714f44");
  if (!built) {
    diamond(c, 0, 0, 70, 33, "#c5bb8a");
    diamond(c, 0, -2, 62, 27, "#dfd2a0");
    for (const [xx, yy] of [
      [-26, -5],
      [0, 7],
      [26, -5],
      [0, -18],
    ]) {
      rect(c, xx - 2, yy - 13, 4, 16, "#89694b");
      rect(c, xx - 3, yy - 12, 6, 3, "#c2a577");
    }
    rect(c, -23, -14, 45, 3, "#ae8c61");
    rect(c, -17, -18, 35, 3, "#cdb58c");
    if (id === "mine") {
      crystal(c, 10, -7, 26);
      crystal(c, -6, -7, 17);
    }
    c.restore();
    return;
  }
  if (id === "castle") {
    block(c, 0, -1, 82, 44, 35, "#d8d6b7", "#b0b9aa");
    rect(c, -11, -29, 21, 28, "#707c6a");
    rect(c, -8, -27, 15, 27, "#656e60");
    rect(c, -4, -24, 3, 24, "#b5a278");
    for (let i = 0; i < 5; i++)
      rect(c, -32 + i * 14, -36 + (i % 2) * 2, 8, 3, "#a8b09e");
    roof(c, 0, -45, 83, 31, "#6b7c8c");
    for (const xx of [-39, 39]) {
      block(c, xx, -5, 26, 66, 17, "#e3dfc1", "#afb7a7");
      rect(c, xx - 5, -48, 6, 13, "#677c79");
      rect(c, xx + 4, -32, 4, 9, "#879480");
      poly(
        c,
        [
          [xx - 19, -74],
          [xx, -105],
          [xx + 19, -74],
          [xx, -64],
        ],
        "#637786",
      );
      poly(
        c,
        [
          [xx, -105],
          [xx + 19, -74],
          [xx, -64],
        ],
        "#8799a0",
      );
      rect(c, xx - 1, -118, 2, 17, "#7c7056");
      poly(
        c,
        [
          [xx + 1, -118],
          [xx + 19, -113],
          [xx + 1, -107],
        ],
        "#bf7859",
      );
    }
    block(c, 0, -54, 33, 38, 22, "#e6e1c4", "#b9c3b0");
    roof(c, 0, -92, 38, 20, "#637786");
    rect(c, -4, -85, 7, 12, "#668680");
    diamond(c, 0, 4, 29, 13, "#cabd91");
    if (level > 1) {
      rect(c, -26, -50, 10, 16, "#b77958");
      rect(c, 18, -50, 10, 16, "#b77958");
    }
  }
  if (id === "workshop") {
    block(c, 0, 0, 67, 36, 32, "#e0c399", "#b59573");
    roof(c, 0, -37, 76, 22);
    rect(c, -15, -24, 14, 24, "#7c6c50");
    rect(c, 8, -28, 13, 11, "#586e67");
    rect(c, 9, -27, 4, 9, "#b3d0a2");
    block(c, 19, -38, 12, 26, 8, "#b8ac90", "#8b8c79");
    for (let i = 0; i < 3; i++) {
      const d = (time / 400 + i * 7) % 25;
      rect(
        c,
        15 + Math.sin(i + time / 1000) * 3,
        -70 - d,
        8 + i * 2,
        5,
        "#f1e8cf88",
      );
    }
    rect(c, -31, -12, 13, 3, "#8a6749");
    rect(c, -29, -10, 3, 10, "#8a6749");
    rect(c, -21, -10, 3, 10, "#8a6749");
    rect(c, 26, -4, 12, 10, "#b78d54");
    rect(c, 28, -5, 8, 2, "#e2bd79");
  }
  if (id === "mine") {
    poly(
      c,
      [
        [-46, 0],
        [-46, -21],
        [-34, -36],
        [-27, -56],
        [-5, -62],
        [11, -48],
        [25, -48],
        [44, -24],
        [43, -5],
        [15, 8],
      ],
      "#8e9993",
    );
    poly(
      c,
      [
        [-46, -21],
        [-27, -56],
        [-5, -62],
        [-14, -32],
        [4, -18],
        [-5, 6],
      ],
      "#b6bfaa",
    );
    poly(
      c,
      [
        [-5, -62],
        [11, -48],
        [25, -48],
        [44, -24],
        [12, -31],
      ],
      "#a5b3a4",
    );
    rect(c, -17, -29, 32, 31, "#69796c");
    rect(c, -12, -24, 23, 26, "#435c55");
    rect(c, -21, -32, 42, 5, "#9d7c57");
    rect(c, -21, -32, 5, 33, "#b19063");
    rect(c, 17, -32, 5, 29, "#80684d");
    crystal(c, -31, -8, 25);
    crystal(c, 27, -8, 35);
    crystal(c, 39, -7, 21);
    crystal(c, 8, -43, 27);
    poly(
      c,
      [
        [-10, 4],
        [-25, 20],
        [-12, 25],
        [4, 7],
      ],
      "#ac9d7d",
    );
    rect(c, -15, 10, 10, 3, "#6c6e5b");
  }
  if (id === "laboratory") {
    block(c, 0, 0, 59, 40, 30, "#d7ceb6", "#b0b0aa");
    poly(
      c,
      [
        [-35, -48],
        [-26, -63],
        [-8, -76],
        [12, -74],
        [31, -58],
        [35, -48],
        [3, -37],
      ],
      "#7c8195",
    );
    poly(
      c,
      [
        [-8, -76],
        [12, -74],
        [31, -58],
        [35, -48],
        [3, -37],
        [3, -58],
      ],
      "#9d9fb0",
    );
    rect(c, 7, -30, 13, 15, "#c8dec7");
    rect(c, 13, -30, 2, 15, "#7e8e87");
    rect(c, 7, -24, 13, 2, "#7e8e87");
    rect(c, -17, -24, 12, 24, "#7c7d77");
    rect(c, -5, -83, 5, 15, "#797f91");
    poly(
      c,
      [
        [-5, -84],
        [-13, -87],
        [-11, -92],
        [6, -87],
        [6, -82],
      ],
      "#b7b8b4",
    );
    crystal(c, 31, -3, 21);
  }
  if (id === "arena") {
    diamond(c, 0, -2, 121, 59, "#7d8c5d");
    diamond(c, 0, -5, 111, 51, "#e0c595");
    diamond(c, 0, -7, 81, 34, "#a4b877");
    diamond(c, 0, -7, 108, 48, "#c7a578");
    diamond(c, 0, -8, 91, 37, "#e2cda0");
    diamond(c, 0, -9, 68, 26, "#8da76b");
    for (const xx of [-51, 51]) {
      rect(c, xx - 2, -33, 4, 28, "#a1885e");
      rect(c, xx - 1, -39, 2, 9, "#7d7456");
      poly(
        c,
        [
          [xx + 1, -39],
          [xx + 17, -34],
          [xx + 1, -29],
        ],
        "#bd7656",
      );
    }
    const a = time / 2500;
    hamster(
      c,
      Math.cos(a) * 35,
      -9 + Math.sin(a) * 11,
      "Warrior",
      Math.floor(time / 150),
      0.6,
    );
    rect(c, -8, -14, 16, 4, "#d3c9a1");
    rect(c, -3, -17, 6, 4, "#f2dd9e");
  }
  if (id === "farm") {
    diamond(c, 0, 0, 83, 39, "#826e4c");
    for (let r = 0; r < 4; r++)
      for (let i = 0; i < 5; i++) {
        const xx = (i - r) * 8 - 3,
          yy = (i + r) * 4 - 26;
        rect(c, xx, yy, 6, 3, "#a99861");
        rect(c, xx + 2, yy - 5, 2, 7, "#4d7746");
        rect(c, xx, yy - 5, 5, 3, "#73954e");
        if ((i + r) % 3 === 0) rect(c, xx + 1, yy - 8, 4, 4, "#e4bc5e");
      }
    for (let i = 0; i < 5; i++) {
      rect(c, -37 + i * 8, 1 + i * 4, 3, 11, "#c4b58a");
      rect(c, -34 + i * 8, 5 + i * 4, 8, 2, "#c4b58a");
    }
    rect(c, 28, -10, 14, 15, "#af8756");
    rect(c, 30, -12, 10, 4, "#ceac6a");
  }
  c.restore();
}
export function drawKingdom(
  c: Ctx,
  buildings: Record<Building, number>,
  hero: Hero,
  time: number,
  selected: Building | null,
  detail = true,
) {
  c.clearRect(0, 0, MAP_W, MAP_H);
  rect(c, 0, 0, MAP_W, MAP_H, "#cedbc5");
  // A misty landscape frames the island rather than competing with its controls.
  poly(
    c,
    [
      [0, 75],
      [60, 35],
      [94, 48],
      [145, 6],
      [210, 59],
      [263, 26],
      [320, 70],
      [385, 38],
      [463, 63],
      [529, 13],
      [606, 57],
      [680, 23],
      [768, 79],
      [768, 210],
      [0, 210],
    ],
    "#b9cdb4",
  );
  poly(
    c,
    [
      [0, 115],
      [86, 62],
      [139, 80],
      [195, 53],
      [270, 102],
      [343, 70],
      [424, 103],
      [490, 68],
      [551, 98],
      [618, 59],
      [715, 93],
      [768, 67],
      [768, 204],
      [0, 204],
    ],
    "#a5c3ad",
  );
  rect(c, 0, 173, 768, 327, "#9dc4b7");
  for (let i = 0; i < 170; i++) {
    const x = rand(i * 3) * 768,
      y = 180 + rand(i * 3 + 1) * 320;
    rect(
      c,
      x,
      y,
      5 + Math.floor(rand(i + 10) * 18),
      2,
      i % 3 === 0 ? "#c4d9bd" : "#87b6ac",
    );
  }
  // Bank on the far shore.
  poly(
    c,
    [
      [0, 106],
      [73, 103],
      [136, 119],
      [176, 133],
      [169, 166],
      [97, 192],
      [42, 205],
      [0, 190],
    ],
    "#96b58d",
  );
  for (let i = 0; i < 20; i++) {
    const x = rand(i + 500) * 162,
      y = 80 + rand(i + 300) * 100;
    if (i % 3 === 0) pine(c, x, y);
    else tree(c, x, y, i);
  }
  poly(
    c,
    [
      [676, 146],
      [724, 124],
      [768, 131],
      [768, 315],
      [719, 295],
      [689, 254],
    ],
    "#a0b890",
  );
  for (let i = 0; i < 9; i++)
    tree(c, 720 + rand(i + 299) * 62, 170 + i * 14, i + 20);
  const tiles: { x: number; y: number; px: number; py: number }[] = [];
  for (let x = 0; x < 11; x++)
    for (let y = 0; y < 11; y++) {
      if (x + y < 3 || x + y > 18 || x - y > 8 || y - x > 8) continue;
      const [px, py] = point(x, y);
      tiles.push({ x, y, px, py });
    }
  tiles.sort((a, b) => a.py - b.py);
  for (const t of tiles) {
    const { px, py } = t;
    diamond(c, px, py + 24, 64, 34, "#638b78");
    diamond(c, px, py + 18, 64, 34, "#7e8f68");
    poly(
      c,
      [
        [px - 31, py],
        [px, py + 16],
        [px, py + 29],
        [px - 31, py + 13],
      ],
      "#a59d73",
    );
    poly(
      c,
      [
        [px, py + 16],
        [px + 31, py],
        [px + 31, py + 13],
        [px, py + 29],
      ],
      "#8e8f68",
    );
    diamond(
      c,
      px,
      py,
      64,
      34,
      ["#9eaf77", "#a6b77d", "#a9b980", "#adbd83"][
        Math.floor(rand(t.x * 35 + t.y) * 4)
      ],
    );
    if (detail)
      for (let i = 0; i < 7; i++) {
        const xx = px + (rand(t.x * 70 + t.y * 11 + i) - 0.5) * 43,
          yy = py + (rand(t.x * 17 + t.y * 69 + i) - 0.5) * 14;
        rect(c, xx, yy, 2, 1, i % 2 ? "#bdc58c" : "#8da16a");
      }
    // Soft, worn paths join the working parts of the kingdom.
    if (t.x === 4 || t.y === 4 || (t.x === 6 && t.y > 4)) {
      diamond(c, px, py - 1, 60, 29, "#cebd90");
      for (let i = 0; i < 4; i++)
        rect(c, px - 16 + i * 10, py + (i % 2 ? 3 : -3), 5, 2, "#dccc9f");
    }
  }
  // Wooden footbridge to the mainland.
  poly(
    c,
    [
      [59, 273],
      [84, 259],
      [152, 293],
      [127, 310],
    ],
    "#8c7b58",
  );
  for (let i = 0; i < 11; i++)
    poly(
      c,
      [
        [62 + i * 6, 272 + i * 3],
        [81 + i * 6, 262 + i * 3],
        [84 + i * 6, 264 + i * 3],
        [65 + i * 6, 274 + i * 3],
      ],
      i % 2 ? "#c2aa77" : "#b59b68",
    );
  const objects: { y: number; draw: () => void }[] = [];
  const trees = [
    [0, 3],
    [0, 5],
    [0, 7],
    [1, 9],
    [2, 10],
    [4, 10],
    [7, 10],
    [9, 9],
    [10, 7],
    [10, 5],
    [10, 3],
    [9, 1],
    [7, 0],
    [5, 0],
    [3, 0],
    [1, 2],
    [2, 1],
    [8, 0],
    [0, 8],
    [10, 8],
    [8, 10],
    [5, 10],
    [1, 7],
  ];
  trees.forEach(([x, y], i) => {
    const [px, py] = point(x, y);
    objects.push({
      y: py,
      draw: () => (i % 4 ? tree(c, px, py - 2, i) : pine(c, px, py - 2)),
    });
  });
  for (const id of Object.keys(PLOTS) as Building[]) {
    const [x, y] = anchor(id);
    objects.push({
      y,
      draw: () => {
        if (selected === id)
          diamond(c, x, y + 3, id === "arena" ? 133 : 102, 49, "#e8dda0");
        structure(c, id, x, y, buildings[id], time);
      },
    });
  }
  for (let i = 0; i < 40; i++) {
    const tx = 1 + rand(i + 88) * 8,
      ty = 1 + rand(i + 99) * 8;
    if (
      Math.abs(tx - 4) < 0.7 ||
      Math.abs(ty - 4) < 0.7 ||
      Object.values(PLOTS).some(([x, y]) => Math.hypot(x - tx, y - ty) < 1)
    )
      continue;
    const [x, y] = point(tx, ty);
    objects.push({
      y,
      draw: () => {
        rect(c, x, y - 4, 2, 5, "#69834f");
        rect(c, x - 1, y - 6, 4, 3, i % 3 ? "#e8d2a0" : "#c58468");
        if (i % 4 === 0) {
          rect(c, x + 4, y - 5, 4, 2, "#d0c997");
        }
      },
    });
  }
  objects.push({
    y: point(4.2, 5.1)[1],
    draw: () => {
      const [x, y] = point(4.2 + Math.sin(time / 6000) * 0.35, 5.1);
      hamster(c, x, y, hero, Math.floor(time / 200), 1.1);
    },
  });
  objects.push({
    y: point(5, 3.8)[1],
    draw: () => {
      const [x, y] = point(5, 3.8);
      hamster(c, x, y, "Miner", 0, 0.8);
    },
  });
  objects.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
  // Reeds, stepping stones and ripples give the world its small-scale details.
  for (let i = 0; i < 13; i++) {
    const x = 129 + i * 37,
      y = 406 + Math.sin(i) * 15;
    rect(c, x, y, 15, 4, "#83ada1");
    rect(c, x + 3, y - 3, 10, 4, "#b7c5aa");
  }
  for (const [x, y] of [
    [145, 361],
    [615, 304],
    [590, 386],
    [95, 329],
  ]) {
    rect(c, x, y - 12, 2, 18, "#6b8a59");
    rect(c, x + 4, y - 16, 2, 22, "#7c955d");
    rect(c, x + 9, y - 7, 2, 14, "#6b8a59");
    rect(c, x + 4, y - 20, 3, 6, "#997e50");
  }
  // Original firefly and butterfly sprites.
  if (detail)
    for (let i = 0; i < 6; i++) {
      const x = 210 + i * 65 + Math.sin(time / 1600 + i) * 8,
        y = 90 + (i % 3) * 65 + Math.cos(time / 2200 + i) * 6;
      rect(c, x, y, 2, 3, "#f0e8ba");
      rect(c, x - 3, y - 2, 3, 3, "#dbc49b");
      rect(c, x + 2, y - 1, 3, 3, "#e9d5b0");
    }
}
