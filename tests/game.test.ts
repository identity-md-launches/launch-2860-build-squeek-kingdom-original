import test from "node:test";
import assert from "node:assert/strict";
import {
  act,
  newGame,
  parseSave,
  costFor,
  production,
  level,
  QUESTS,
  type GameState,
  type Action,
} from "../src/game/engine.ts";
const NOW = 1793592000000;
function play(s: GameState, a: Action) {
  const r = act(s, a);
  assert.ok(!r.error, r.message);
  return r.state;
}
function stocked() {
  const s = newGame(NOW);
  for (const k of Object.keys(s.resources) as (keyof typeof s.resources)[])
    s.resources[k] = 10000;
  return s;
}
test("gathering is immutable, pays resources, and observes its cooldown", () => {
  const s = newGame(NOW),
    before = JSON.stringify(s);
  const next = play(s, { type: "gather", now: NOW });
  assert.equal(JSON.stringify(s), before);
  assert.equal(next.resources.wood, 191);
  assert.equal(next.stats.gathers, 1);
  assert.equal(next.xp, 8);
  assert.equal(act(next, { type: "gather", now: NOW + 7999 }).error, true);
  assert.equal(
    play(next, { type: "gather", now: NOW + 8000 }).stats.gathers,
    2,
  );
});
test("hero perks change production, gathering and building costs", () => {
  const s = stocked();
  s.buildings.mine = 1;
  s.hero = "Miner";
  assert.equal(production(s).stone, 5);
  assert.equal(production(s).gold, 2.5);
  assert.equal(production(s).crystals, 1.25);
  const regular = costFor(s, "workshop");
  s.hero = "Engineer";
  assert.ok(costFor(s, "workshop").wood! < regular.wood!);
  s.hero = "Warrior";
  assert.equal(play(s, { type: "gather", now: NOW }).resources.wood, 10025);
});
test("building costs, prerequisites, castle level cap and maximum levels are enforced", () => {
  let s = stocked();
  assert.equal(act(s, { type: "build", id: "laboratory" }).error, true);
  s = play(s, { type: "build", id: "mine" });
  assert.equal(s.buildings.mine, 1);
  assert.equal(act(s, { type: "build", id: "mine" }).error, true);
  s = play(s, { type: "build", id: "castle" });
  s = play(s, { type: "build", id: "mine" });
  assert.equal(s.buildings.mine, 2);
  s.buildings.castle = 5;
  assert.equal(act(s, { type: "build", id: "castle" }).error, true);
  s.resources.wood = 0;
  assert.equal(act(s, { type: "build", id: "workshop" }).error, true);
});
test("production is credited in 15-second steps and offline progress is capped at four hours", () => {
  let s = newGame(NOW);
  assert.equal(act(s, { type: "tick", now: NOW + 14999 }).state, s);
  s = play(s, { type: "tick", now: NOW + 15000 });
  assert.equal(s.resources.wood, 163);
  assert.equal(s.resources.food, 85);
  const late = play(s, { type: "tick", now: NOW + 15 * 60 * 60 * 1000 });
  assert.equal(late.resources.wood, 163 + 960 * 3);
  assert.equal(
    play(late, { type: "tick", now: NOW + 15 * 60 * 60 * 1000 + 100 }).resources
      .wood,
    late.resources.wood,
  );
});
test("crafting requires its building, spends resources, and counts produced items", () => {
  let s = stocked();
  assert.equal(act(s, { type: "craft", id: "planks" }).error, true);
  s = play(s, { type: "build", id: "workshop" });
  const wood = s.resources.wood;
  s = play(s, { type: "craft", id: "planks" });
  assert.equal(s.inventory.planks, 2);
  assert.equal(s.stats.crafts, 2);
  assert.equal(s.resources.wood, wood - 20);
  assert.equal(act(s, { type: "craft", id: "potion" }).error, true);
});
test("planks boost future timed gathers rather than creating a free crafting loop", () => {
  let s = stocked();
  s.inventory.planks = 2;
  s = play(s, { type: "use", id: "planks" });
  s = play(s, { type: "use", id: "planks" });
  assert.equal(s.resources.wood, 10000);
  assert.equal(s.gatherBonus, 30);
  s = play(s, { type: "gather", now: NOW });
  assert.equal(s.resources.wood, 10046);
  assert.equal(s.gatherBonus, 15);
  s = play(s, { type: "gather", now: NOW + 8000 });
  assert.equal(s.gatherBonus, 0);
});
test("quests grant their rewards once and XP increases kingdom level", () => {
  let s = newGame(NOW);
  assert.equal(act(s, { type: "claim", id: "gather" }).error, true);
  s = play(s, { type: "gather", now: NOW });
  s = play(s, { type: "claim", id: "gather" });
  assert.equal(s.resources.gold, 110);
  assert.equal(s.xp, 28);
  assert.equal(act(s, { type: "claim", id: "gather" }).error, true);
  s.xp = 199;
  assert.equal(level(s), 2);
  s.xp++;
  assert.equal(level(s), 3);
  assert.ok(QUESTS.every((q) => Number.isFinite(q.progress(s))));
});
test("safe mission choices consume supplies and complete exploration with loot", () => {
  let s = stocked();
  s = play(s, { type: "mission", kind: "explore" });
  assert.equal(s.resources.food, 9992);
  assert.equal(act(s, { type: "mission", kind: "survive" }).error, true);
  for (let i = 0; i < 3; i++) s = play(s, { type: "choice", choice: 0 });
  assert.equal(s.mission, null);
  assert.equal(s.stats.explorations, 1);
  assert.equal(s.resources.crystals, 10015);
  assert.equal(s.xp, 60);
});
test("reckless survival choices can fail and keep stage loot", () => {
  let s = stocked();
  s = play(s, { type: "mission", kind: "survive" });
  for (let i = 0; i < 3; i++) s = play(s, { type: "choice", choice: 1 });
  assert.equal(s.mission, null);
  assert.equal(s.stats.survivals, 0);
  assert.equal(s.resources.gold, 10030);
  assert.equal(s.xp, 10);
});
test("warrior and armor make a material difference in survival", () => {
  let s = stocked();
  s.hero = "Warrior";
  s = play(s, { type: "mission", kind: "survive" });
  for (let i = 0; i < 3; i++) s = play(s, { type: "choice", choice: 1 });
  assert.equal(s.stats.survivals, 1);
  s = stocked();
  s.inventory.armor = 2;
  s.buildings.workshop = 1;
  s = play(s, { type: "mission", kind: "survive" });
  s = play(s, { type: "use", id: "armor" });
  assert.equal(s.inventory.armor, 1);
  s = play(s, { type: "craft", id: "armor" });
  assert.equal(s.inventory.armor, 2);
  assert.equal(s.mission!.armored, true);
  assert.equal(act(s, { type: "use", id: "armor" }).error, true);
  for (let i = 0; i < 3; i++) s = play(s, { type: "choice", choice: 1 });
  assert.equal(s.stats.survivals, 1);
  assert.equal(s.inventory.armor, 2);
});
test("potions restore health, cap at 100, and require an active mission", () => {
  let s = stocked();
  s.inventory.potion = 2;
  assert.equal(act(s, { type: "use", id: "potion" }).error, true);
  s = play(s, { type: "mission", kind: "explore" });
  s = play(s, { type: "choice", choice: 1 });
  assert.equal(s.mission!.hp, 68);
  s = play(s, { type: "use", id: "potion" });
  assert.equal(s.mission!.hp, 100);
  assert.equal(s.inventory.potion, 1);
  s = play(s, { type: "retreat" });
  assert.equal(s.mission, null);
});
test("race entry, gear consumption, win and loss progression work", () => {
  let s = stocked();
  s = play(s, { type: "raceStart" });
  assert.equal(s.resources.food, 9995);
  assert.equal(act(s, { type: "raceGear" }).error, true);
  s.inventory.gears = 1;
  s = play(s, { type: "raceGear" });
  assert.equal(s.inventory.gears, 0);
  s = play(s, { type: "raceFinish", won: true });
  assert.equal(s.stats.races, 1);
  assert.equal(s.stats.wins, 1);
  assert.equal(s.resources.gold, 10030);
  s = play(s, { type: "raceFinish", won: false });
  assert.equal(s.stats.races, 2);
  assert.equal(s.xp, 50);
  s.resources.food = 4;
  assert.equal(act(s, { type: "raceStart" }).error, true);
});
test("round bonuses require the same deployment and a sufficient settled frontier, and cannot repeat", () => {
  let s = stocked();
  const live = {
    round: "950",
    core: "official-api-core",
    installation: "official-installation",
  };
  s = play(s, { type: "raceFinish", won: true, live });
  for (const a of [
    { frontier: "949", core: live.core, installation: live.installation },
    { frontier: "950", core: "other", installation: live.installation },
    { frontier: "950", core: live.core, installation: "other" },
  ])
    assert.equal(act(s, { type: "settle", ...a }).state, s);
  s = play(s, {
    type: "settle",
    frontier: "950",
    core: live.core,
    installation: live.installation,
  });
  assert.equal(s.resources.crystals, 10010);
  s = play(s, { type: "raceFinish", won: true, live });
  assert.equal(s.pendingRound, null);
  assert.equal(
    act(s, {
      type: "settle",
      frontier: "951",
      core: live.core,
      installation: live.installation,
    }).state,
    s,
  );
});
test("saved games round-trip, accrue offline production, and reject malformed data", () => {
  let s = stocked();
  s = play(s, { type: "mission", kind: "explore" });
  const loaded = parseSave(JSON.stringify(s), NOW + 30000);
  assert.equal(loaded.mission!.kind, "explore");
  assert.equal(loaded.resources.wood, 10006);
  for (const raw of [
    "{",
    "{}",
    "null",
    JSON.stringify({ ...s, hero: "Invented" }),
    JSON.stringify({ ...s, resources: null }),
  ])
    assert.deepEqual(parseSave(raw, NOW), newGame(NOW));
  const malformed = {
    ...s,
    mission: { kind: "explore", turn: 8, hp: -1, log: [{}] },
  };
  assert.equal(parseSave(JSON.stringify(malformed), NOW).mission, null);
});

test("strict save imports reject incomplete files instead of replacing progress", () => {
  assert.throws(() => parseSave("{}", NOW, true), /Invalid saved kingdom/);
  assert.throws(() => parseSave("null", NOW, true), /Invalid saved kingdom/);
  assert.equal(
    parseSave(JSON.stringify(stocked()), NOW, true).resources.wood,
    10000,
  );
});

test("a new race preserves an earlier round bonus until it settles", () => {
  let s = stocked();
  const first = {
    round: "950",
    core: "official-api-core",
    installation: "official-installation",
  };
  s = play(s, { type: "raceFinish", won: true, live: first });
  s = play(s, {
    type: "raceFinish",
    won: true,
    live: { ...first, round: "951" },
  });
  assert.equal(s.pendingRound!.round, "950");
  s = play(s, {
    type: "settle",
    frontier: "951",
    core: first.core,
    installation: first.installation,
  });
  assert.equal(s.pendingRound, null);
  assert.equal(s.resources.crystals, 10010);
});
