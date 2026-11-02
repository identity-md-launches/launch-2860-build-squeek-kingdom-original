export const RESOURCES = ["wood", "stone", "gold", "crystals", "food"] as const;
export type Resource = (typeof RESOURCES)[number];
export type Resources = Record<Resource, number>;
export type Hero = "Miner" | "Warrior" | "Engineer" | "Explorer";
export type Building =
  "castle" | "mine" | "workshop" | "laboratory" | "arena" | "farm";
export type Item = "planks" | "gears" | "potion" | "armor";
export type Mission = {
  kind: "explore" | "survive";
  turn: number;
  hp: number;
  armored: boolean;
  log: string[];
};
export type GameState = {
  version: 1;
  hero: Hero;
  resources: Resources;
  buildings: Record<Building, number>;
  inventory: Record<Item, number>;
  xp: number;
  gatherBonus: number;
  lastTick: number;
  gatheredAt: number;
  stats: {
    gathers: number;
    builds: number;
    crafts: number;
    explorations: number;
    survivals: number;
    races: number;
    wins: number;
  };
  claimed: string[];
  mission: Mission | null;
  history: string[];
  pendingRound: { round: string; core: string; installation: string } | null;
  rewardedRounds: string[];
};
export const HEROES: {
  name: Hero;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    name: "Miner",
    title: "A nose for treasure",
    description: "+25% mine production",
    color: "#b7793e",
  },
  {
    name: "Warrior",
    title: "Small paws. Big courage.",
    description: "Take 30% less mission damage",
    color: "#b3574b",
  },
  {
    name: "Engineer",
    title: "Made to make things",
    description: "Building costs reduced by 20%",
    color: "#667d9a",
  },
  {
    name: "Explorer",
    title: "The wild is calling",
    description: "+25% gathering and exploration loot",
    color: "#52764d",
  },
];
export const BUILDINGS: Record<
  Building,
  {
    name: string;
    description: string;
    cost: Partial<Resources>;
    max: number;
    requires?: Building;
  }
> = {
  castle: {
    name: "Acorn Castle",
    description:
      "The heart of the kingdom. Produces wood and raises your building level cap.",
    cost: { wood: 90, stone: 80, gold: 40 },
    max: 5,
  },
  mine: {
    name: "Crystal Mine",
    description: "Produces stone, gold and crystals every 15 seconds.",
    cost: { wood: 55, stone: 35 },
    max: 5,
  },
  workshop: {
    name: "Workshop",
    description:
      "Unlocks crafting: planks, gears, potions and armor. Produces gold.",
    cost: { wood: 65, stone: 45, gold: 15 },
    max: 5,
  },
  laboratory: {
    name: "Moonlight Lab",
    description:
      "Turns clever ideas into crystals. Required to craft healing potions.",
    cost: { wood: 70, stone: 60, gold: 35, crystals: 10 },
    max: 5,
    requires: "workshop",
  },
  arena: {
    name: "Squeek Race Arena",
    description:
      "Train against local rivals or chase the real wheel. Upgrades improve your race pace.",
    cost: { wood: 70, stone: 60, gold: 35 },
    max: 5,
  },
  farm: {
    name: "Sunseed Farm",
    description: "Grows food for expeditions and races every 15 seconds.",
    cost: { wood: 40, stone: 20 },
    max: 5,
  },
};
export const RECIPES: Record<
  Item,
  {
    name: string;
    description: string;
    cost: Partial<Resources>;
    quantity: number;
    requires: Building;
  }
> = {
  planks: {
    name: "Oak planks",
    description: "Use 1 for +15 wood on a future gather.",
    cost: { wood: 20 },
    quantity: 2,
    requires: "workshop",
  },
  gears: {
    name: "Copper gear",
    description: "Use 1 for a +15 pace head start in your next race.",
    cost: { gold: 15, stone: 10 },
    quantity: 1,
    requires: "workshop",
  },
  potion: {
    name: "Berry potion",
    description: "Restore 35 health during a mission.",
    cost: { food: 15, crystals: 3 },
    quantity: 1,
    requires: "laboratory",
  },
  armor: {
    name: "Acorn armor",
    description: "Equip for 25% less damage throughout your next mission.",
    cost: { wood: 25, stone: 20, gold: 10 },
    quantity: 1,
    requires: "workshop",
  },
};
export function newGame(now = Date.now()): GameState {
  return {
    version: 1,
    hero: "Explorer",
    resources: { wood: 160, stone: 110, gold: 85, crystals: 12, food: 80 },
    buildings: {
      castle: 1,
      mine: 0,
      workshop: 0,
      laboratory: 0,
      arena: 1,
      farm: 1,
    },
    inventory: { planks: 0, gears: 0, potion: 0, armor: 0 },
    xp: 0,
    gatherBonus: 0,
    lastTick: now,
    gatheredAt: 0,
    stats: {
      gathers: 0,
      builds: 0,
      crafts: 0,
      explorations: 0,
      survivals: 0,
      races: 0,
      wins: 0,
    },
    claimed: [],
    mission: null,
    history: ["A new kingdom takes root. Welcome to Acorn Hollow."],
    pendingRound: null,
    rewardedRounds: [],
  };
}
export const level = (s: GameState) => 1 + Math.floor(s.xp / 100);
export function costFor(s: GameState, id: Building): Partial<Resources> {
  const multiplier = (s.buildings[id] + 1) * (s.hero === "Engineer" ? 0.8 : 1);
  return Object.fromEntries(
    Object.entries(BUILDINGS[id].cost).map(([r, n]) => [
      r,
      Math.ceil(n * multiplier),
    ]),
  );
}
export const canAfford = (s: GameState, cost: Partial<Resources>) =>
  Object.entries(cost).every(([r, n]) => s.resources[r as Resource] >= n);
export function production(s: GameState): Resources {
  const mining = s.hero === "Miner" ? 1.25 : 1;
  return {
    wood: 3 * s.buildings.castle,
    stone: 4 * s.buildings.mine * mining,
    gold: 2 * s.buildings.mine * mining + 2 * s.buildings.workshop,
    crystals: s.buildings.mine * mining + 2 * s.buildings.laboratory,
    food: 5 * s.buildings.farm,
  };
}
export const QUESTS = [
  {
    id: "gather",
    title: "A kingdom starts small",
    description: "Gather supplies from the woodland.",
    target: 1,
    progress: (s: GameState) => s.stats.gathers,
    reward: { gold: 25, wood: 30 },
    xp: 20,
  },
  {
    id: "mine",
    title: "Something in the stone",
    description: "Build your first crystal mine.",
    target: 1,
    progress: (s: GameState) => s.buildings.mine,
    reward: { crystals: 8, stone: 25 },
    xp: 30,
  },
  {
    id: "craft",
    title: "Made by tiny paws",
    description: "Craft any item in the workshop.",
    target: 1,
    progress: (s: GameState) => s.stats.crafts,
    reward: { gold: 35, food: 20 },
    xp: 30,
  },
  {
    id: "explore",
    title: "Beyond the treeline",
    description: "Finish a Mosswood exploration.",
    target: 1,
    progress: (s: GameState) => s.stats.explorations,
    reward: { crystals: 12, gold: 30 },
    xp: 40,
  },
  {
    id: "survive",
    title: "Stand your ground",
    description: "Survive all three waves at dusk.",
    target: 1,
    progress: (s: GameState) => s.stats.survivals,
    reward: { wood: 60, stone: 50 },
    xp: 50,
  },
  {
    id: "race",
    title: "Born to run",
    description: "Complete a race in the arena.",
    target: 1,
    progress: (s: GameState) => s.stats.races,
    reward: { food: 30, gold: 30 },
    xp: 30,
  },
];
export const ACHIEVEMENTS = [
  {
    title: "First foundations",
    text: "Build or upgrade a structure",
    test: (s: GameState) => s.stats.builds >= 1,
  },
  {
    title: "Busy paws",
    text: "Craft 5 items",
    test: (s: GameState) => s.stats.crafts >= 5,
  },
  {
    title: "Woodland wanderer",
    text: "Finish 3 explorations",
    test: (s: GameState) => s.stats.explorations >= 3,
  },
  {
    title: "Dusk defender",
    text: "Survive a dusk siege",
    test: (s: GameState) => s.stats.survivals >= 1,
  },
  {
    title: "A royal beginning",
    text: "Reach level 5",
    test: (s: GameState) => level(s) >= 5,
  },
  {
    title: "Fleet of feet",
    text: "Win 3 races",
    test: (s: GameState) => s.stats.wins >= 3,
  },
];
export type Action =
  | { type: "tick"; now: number }
  | { type: "gather"; now: number }
  | { type: "hero"; hero: Hero }
  | { type: "build"; id: Building }
  | { type: "craft"; id: Item }
  | { type: "claim"; id: string }
  | { type: "mission"; kind: "explore" | "survive" }
  | { type: "choice"; choice: number }
  | { type: "retreat" }
  | { type: "use"; id: Item }
  | { type: "raceStart" }
  | { type: "raceGear" }
  | {
      type: "raceFinish";
      won: boolean;
      live?: { round: string; core: string; installation: string };
    }
  | { type: "settle"; frontier: string; core: string; installation: string };
export type Result = { state: GameState; message?: string; error?: boolean };
export function act(previous: GameState, action: Action): Result {
  const s = structuredClone(previous);
  const fail = (message: string): Result => ({
    state: previous,
    message,
    error: true,
  });
  const add = (resources: Partial<Resources>) => {
    for (const [key, n] of Object.entries(resources))
      s.resources[key as Resource] = Math.min(
        999999,
        s.resources[key as Resource] + n,
      );
  };
  const pay = (cost: Partial<Resources>) => {
    for (const [key, n] of Object.entries(cost))
      s.resources[key as Resource] -= n;
  };
  const done = (message?: string): Result => {
    if (message) s.history = [message, ...s.history].slice(0, 15);
    return { state: s, message };
  };
  switch (action.type) {
    case "tick": {
      const elapsed = Math.max(
        0,
        Math.min(action.now - s.lastTick, 4 * 60 * 60 * 1000),
      );
      const ticks = Math.floor(elapsed / 15000);
      if (!ticks) return { state: previous };
      const rates = production(s);
      for (const r of RESOURCES) add({ [r]: rates[r] * ticks });
      s.lastTick = action.now - (elapsed % 15000);
      return done();
    }
    case "hero":
      s.hero = action.hero;
      return done(`${action.hero} ready for adventure.`);
    case "gather": {
      if (action.now - s.gatheredAt < 8000)
        return fail("The woodland is recovering. Gather again in a moment.");
      const boost = s.hero === "Explorer" ? 1.25 : 1;
      add({
        wood: Math.floor(25 * boost) + Math.min(15, s.gatherBonus),
        stone: Math.floor(15 * boost),
        food: Math.floor(12 * boost),
      });
      s.gatherBonus = Math.max(0, s.gatherBonus - 15);
      s.gatheredAt = action.now;
      s.xp += 8;
      s.stats.gathers++;
      return done("Supplies gathered! Wood, stone and food added.");
    }
    case "build": {
      const b = BUILDINGS[action.id];
      const current = s.buildings[action.id];
      const cost = costFor(s, action.id);
      if (current >= b.max) return fail("This building is fully upgraded.");
      if (b.requires && !s.buildings[b.requires])
        return fail(`Build the ${BUILDINGS[b.requires].name} first.`);
      if (action.id !== "castle" && current >= s.buildings.castle)
        return fail("Upgrade Acorn Castle to raise the building level cap.");
      if (!canAfford(s, cost))
        return fail("Gather more supplies to afford this building.");
      pay(cost);
      s.buildings[action.id]++;
      s.stats.builds++;
      s.xp += 25;
      return done(
        `${b.name} ${current ? "upgraded" : "built"} to level ${current + 1}.`,
      );
    }
    case "craft": {
      const recipe = RECIPES[action.id];
      if (!s.buildings[recipe.requires])
        return fail(
          `Build the ${BUILDINGS[recipe.requires].name} to craft this item.`,
        );
      if (!canAfford(s, recipe.cost))
        return fail("Gather more supplies for this recipe.");
      pay(recipe.cost);
      s.inventory[action.id] += recipe.quantity;
      s.stats.crafts += recipe.quantity;
      s.xp += 12;
      return done(`Crafted ${recipe.quantity} ${recipe.name.toLowerCase()}.`);
    }
    case "claim": {
      const q = QUESTS.find((q) => q.id === action.id);
      if (!q || s.claimed.includes(q.id) || q.progress(s) < q.target)
        return fail("Complete the quest before claiming its reward.");
      s.claimed.push(q.id);
      s.xp += q.xp;
      add(q.reward);
      return done(`Quest complete: ${q.title}. Rewards collected!`);
    }
    case "mission": {
      if (s.mission)
        return fail("Finish or retreat from your current mission first.");
      if (s.resources.food < 8)
        return fail("Gather 8 food to start a mission.");
      s.resources.food -= 8;
      s.mission = {
        kind: action.kind,
        turn: 0,
        hp: 100,
        armored: false,
        log: [
          action.kind === "explore"
            ? "You step beneath the Mosswood canopy."
            : "The sun sets. Three waves approach the kingdom.",
        ],
      };
      return done("Your expedition has begun. Choose your next move.");
    }
    case "choice": {
      const m = s.mission;
      if (!m) return fail("Start a mission first.");
      let damage = 0;
      let line = "";
      if (action.choice === 0) {
        if (s.resources.wood < 8) return fail("Gather 8 wood for a safe path.");
        s.resources.wood -= 8;
        damage = 10 + m.turn * 4;
        add({ stone: 8 });
        line =
          m.kind === "explore"
            ? "A sturdy bridge gets you safely across. +8 stone."
            : "Your barricade holds. +8 stone salvaged.";
      } else if (action.choice === 1) {
        damage = 32 + m.turn * 6;
        add({ crystals: m.kind === "explore" ? 5 : 2, gold: 10 });
        line =
          m.kind === "explore"
            ? "Fireflies lead you through thorns to a crystal cache."
            : "A brave charge drives the beetles back.";
      } else {
        if (s.resources.food < 4) return fail("Gather 4 food to scout.");
        s.resources.food -= 4;
        damage = 18 + m.turn * 3;
        add({ wood: s.hero === "Explorer" ? 25 : 20, food: 8 });
        line =
          m.kind === "explore"
            ? "You find a berry clearing and gather fallen wood."
            : "A hidden path lets you ambush the beetles.";
      }
      if (s.hero === "Warrior") damage = Math.ceil(damage * 0.7);
      if (m.armored) damage = Math.ceil(damage * 0.75);
      m.hp = Math.max(0, m.hp - damage);
      m.turn++;
      m.log.push(`${line} −${damage} health.`);
      if (!m.hp) {
        s.mission = null;
        s.xp += 10;
        return done(
          "The expedition ended. You kept your finds. Heal up and try again.",
        );
      }
      if (m.turn >= 3) {
        add({
          stone: 35,
          gold: 30,
          crystals: s.hero === "Explorer" && m.kind === "explore" ? 15 : 12,
        });
        s.xp += 60;
        s.stats[m.kind === "explore" ? "explorations" : "survivals"]++;
        s.mission = null;

        return done(
          `${m.kind === "explore" ? "Mosswood explored" : "All three waves survived"}! +35 stone, +30 gold, crystals and 60 XP.`,
        );
      }
      return done(`Stage ${m.turn} cleared. ${m.hp} health remaining.`);
    }
    case "retreat":
      s.mission = null;
      return done("You returned home safely. Collected loot is yours to keep.");
    case "use": {
      if (s.inventory[action.id] < 1)
        return fail("Craft this item in the workshop first.");
      if (action.id === "planks") {
        s.inventory.planks--;
        s.gatherBonus += 15;
        return done("Planks packed. +15 wood on a future gather.");
      }
      if (action.id === "potion") {
        if (!s.mission) return fail("Use a potion during an active mission.");
        s.inventory.potion--;
        s.mission.hp = Math.min(100, s.mission.hp + 35);
        return done("Potion used. Restored 35 health.");
      }
      if (action.id === "armor") {
        if (!s.mission) return fail("Equip armor during an active mission.");
        if (s.mission.armored)
          return fail("Armor is already equipped for this mission.");
        s.inventory.armor--;
        s.mission.armored = true;
        return done("Acorn armor equipped for this mission.");
      }
      return fail("Use a copper gear from the race screen.");
    }
    case "raceStart":
      if (s.resources.food < 5) return fail("Gather 5 food to enter a race.");
      s.resources.food -= 5;
      return done();
    case "raceGear":
      if (s.inventory.gears < 1)
        return fail("Craft a copper gear in the workshop first.");
      s.inventory.gears--;
      return done("Copper gear fitted. +15 race pace.");
    case "raceFinish":
      s.stats.races++;
      if (action.won) {
        s.stats.wins++;
        add({ gold: 30, food: 5 });
      }
      s.xp += action.won ? 35 : 15;
      if (
        action.live &&
        action.won &&
        !s.pendingRound &&
        !s.rewardedRounds.includes(action.live.core + ":" + action.live.round)
      )
        s.pendingRound = action.live;
      return done(
        action.won
          ? "Race won! +30 gold and 35 XP. Tiny paws, mighty pace."
          : "Race complete! +15 XP. Try a gear or upgrade the arena for more pace.",
      );
    case "settle": {
      const p = s.pendingRound;
      if (
        !p ||
        p.core !== action.core ||
        p.installation !== action.installation ||
        BigInt(action.frontier) < BigInt(p.round)
      )
        return { state: previous };
      add({ crystals: 10 });
      s.rewardedRounds.push(p.core + ":" + p.round);
      s.pendingRound = null;
      return done(
        `Round ${p.round} settled on Sepolia. +10 game crystals for your wheel challenge!`,
      );
    }
  }
}
export function parseSave(
  raw: string | null,
  now = Date.now(),
  strict = false,
): GameState {
  const invalid = (): GameState => {
    if (strict) throw new Error("Invalid saved kingdom");
    return newGame(now);
  };
  if (!raw) return strict ? invalid() : newGame(now);
  try {
    const value: unknown = JSON.parse(raw);
    const base = newGame(now);
    if (!value || typeof value !== "object") return invalid();
    const s = value as GameState;
    s.gatherBonus = Number.isFinite(s.gatherBonus)
      ? Math.max(0, Math.min(9999, s.gatherBonus))
      : 0;
    if (s.version !== 1 || !HEROES.some((h) => h.name === s.hero))
      return invalid();
    const validNumbers = (record: object, keys: string[], allowArmor = false) =>
      keys.every(
        (k) =>
          typeof (record as Record<string, unknown>)?.[k] === "number" &&
          Number.isFinite((record as Record<string, number>)[k]) &&
          ((allowArmor && k === "armor") ||
            (record as Record<string, number>)[k] >= 0),
      );
    if (
      !validNumbers(s.resources, RESOURCES as unknown as string[]) ||
      !validNumbers(s.buildings, Object.keys(BUILDINGS)) ||
      !validNumbers(s.inventory, Object.keys(RECIPES)) ||
      !validNumbers(s.stats, Object.keys(base.stats)) ||
      !Number.isFinite(s.xp) ||
      s.xp < 0 ||
      !Number.isFinite(s.lastTick) ||
      !Number.isFinite(s.gatheredAt) ||
      !Array.isArray(s.claimed) ||
      !Array.isArray(s.history) ||
      !Array.isArray(s.rewardedRounds)
    )
      return invalid();
    if (
      s.mission &&
      (!["explore", "survive"].includes(s.mission.kind) ||
        !Number.isFinite(s.mission.hp) ||
        !Number.isInteger(s.mission.turn) ||
        !Array.isArray(s.mission.log))
    )
      s.mission = null;
    if (
      s.pendingRound &&
      (!/^\d+$/.test(s.pendingRound.round) ||
        typeof s.pendingRound.core !== "string" ||
        typeof s.pendingRound.installation !== "string")
    )
      s.pendingRound = null;
    for (const id of Object.keys(BUILDINGS) as Building[])
      s.buildings[id] = Math.min(
        BUILDINGS[id].max,
        Math.floor(s.buildings[id]),
      );
    for (const r of RESOURCES)
      s.resources[r] = Math.min(999999, s.resources[r]);
    for (const id of Object.keys(RECIPES) as Item[])
      s.inventory[id] = Math.max(
        0,
        Math.min(9999, Math.floor(s.inventory[id])),
      );
    s.xp = Math.min(100000, s.xp);
    s.lastTick = Math.min(now, s.lastTick);
    s.gatheredAt = Math.min(now, s.gatheredAt);
    s.claimed = s.claimed.filter((id) => typeof id === "string");
    s.history = s.history.filter((line) => typeof line === "string");
    if (s.mission) s.mission.armored = !!s.mission.armored;
    if (
      s.mission &&
      (!s.mission.log.every((line) => typeof line === "string") ||
        s.mission.turn < 0 ||
        s.mission.turn > 2 ||
        s.mission.hp < 1 ||
        s.mission.hp > 100)
    )
      s.mission = null;
    return act(s, { type: "tick", now }).state;
  } catch {
    return invalid();
  }
}
