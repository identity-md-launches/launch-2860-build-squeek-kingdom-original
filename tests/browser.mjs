import assert from "node:assert/strict";
import { browserType, launchOptions, AxeBuilder } from "./tools.mjs";
import { serve } from "./serve.mjs";
import { writeFile } from "node:fs/promises";
await (
  await import("node:fs/promises")
).mkdir("test/scratch", { recursive: true });
const { server, url } = await serve();
const browser = await browserType.launch(launchOptions);
const events = [];
const errors = [];
const failures = [];
const steps = [];
function pass(s) {
  steps.push(s);
  console.log("PASS", s);
}
async function saved(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("squeek-kingdom-save-v1")),
  );
}
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(url) && r.status() >= 400) failures.push(r.url());
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Gather supplies" }).click();
  assert.equal((await saved(page)).stats.gathers, 1);
  assert.ok(await page.getByRole("button", { name: /Gather in/ }).isDisabled());
  pass("Gather supplies and cooldown");
  await page.getByRole("button", { name: "Change hero" }).click();
  await page.getByRole("button", { name: /Miner A nose/ }).click();
  assert.equal((await saved(page)).hero, "Miner");
  pass("Choose a hamster hero");
  await page.getByRole("button", { name: /Crystal Mine, empty plot/ }).click();
  await page
    .getByRole("button", { name: "Build Crystal Mine", exact: true })
    .click();
  assert.equal((await saved(page)).buildings.mine, 1);
  pass("Build crystal mine from the isometric map");
  await page.getByRole("button", { name: "Build & upgrade" }).click();
  await page.getByRole("button", { name: /Workshop Empty plot/ }).click();
  await page
    .getByRole("button", { name: "Build Workshop", exact: true })
    .click();
  assert.equal((await saved(page)).buildings.workshop, 1);
  pass("Build workshop from the building picker");
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Craft 2", exact: true }).click();
  assert.equal((await saved(page)).inventory.planks, 2);
  await page
    .locator(".bag-item")
    .filter({ hasText: "Oak planks" })
    .getByRole("button", { name: "Use", exact: true })
    .click();
  assert.equal((await saved(page)).inventory.planks, 1);
  assert.equal((await saved(page)).gatherBonus, 15);
  pass("Craft inventory items and use planks");
  await page.getByRole("button", { name: "Quests", exact: true }).click();
  await page
    .getByRole("article")
    .filter({ hasText: "A kingdom starts small" })
    .getByRole("button", { name: "Claim reward" })
    .click();
  assert.ok((await saved(page)).claimed.includes("gather"));
  pass("Claim a quest reward once");
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
  await page.getByRole("button", { name: /Explore Mosswood/ }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Forage the clearing/ }).click();
  assert.equal((await saved(page)).stats.explorations, 1);
  pass("Finish all three exploration stages");
  await page.getByRole("button", { name: /Defend the kingdom/ }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: /Build a barricade/ }).click();
  assert.equal((await saved(page)).stats.survivals, 1);
  pass("Survive three waves with tactical choices");
  await page.getByRole("button", { name: "Race", exact: true }).click();
  await page.clock.install();
  await page
    .getByRole("button", { name: "Start practice race", exact: true })
    .click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Boost pace" }).click();
  await page.screenshot({ path: "test/scratch/racing.png", fullPage: true });
  await page.clock.fastForward(21000);
  await page
    .getByRole("heading", { name: "A mighty little victory!" })
    .waitFor();
  assert.equal((await saved(page)).stats.races, 1);
  assert.equal((await saved(page)).stats.wins, 1);
  pass("Animated practice race, three boosts, real result and rewards");
  await page.clock.resume();
  await page.getByRole("button", { name: "NFTs", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your next adventure needs no NFT." })
    .waitFor();
  pass("NFT guest empty state");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.ok(
    await page
      .getByRole("button", { name: "Connect wallet" })
      .evaluate((el) => el === document.activeElement),
  );
  pass("Wallet sheet opens, Escape closes, focus restored");
  const before = await saved(page);
  await page.reload();
  assert.equal(
    (await saved(page)).stats.explorations,
    before.stats.explorations,
  );
  assert.equal((await saved(page)).hero, "Miner");
  pass("Progress survives reload and hash navigation");
  await page.route("https://api.squeekchain.com/**", (route) => route.abort());
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Kingdom", exact: true })
    .click();
  await page.getByRole("button", { name: "Refresh SqueekChain data" }).click();
  await page
    .getByText("SqueekChain signal unavailable", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Gather supplies" }).click();
  assert.ok((await saved(page)).stats.gathers >= 2);
  pass("API outage keeps primary gameplay playable");
  await page.getByRole("button", { name: "Race", exact: true }).click();
  await page
    .getByRole("button", { name: "Wheel challenge", exact: true })
    .click();
  assert.ok(
    await page
      .getByRole("button", { name: "Start wheel challenge" })
      .isDisabled(),
  );
  pass("Outage disables live challenge without showing fake measurements");
  const axe = await new AxeBuilder({ page }).analyze();
  events.push({
    page: "race-outage",
    axe: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  // Backups must download, reject malformed imports, and restore a valid save.
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  const importInput = page.locator('input[type="file"]');
  const preserved = await saved(page);
  await importInput.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "not a compatible kingdom save" })
    .waitFor();
  assert.equal((await saved(page)).stats.races, preserved.stats.races);
  pass("Invalid save import shows an inline error and preserves progress");
  await importInput.setInputFiles({
    name: "kingdom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(preserved)),
  });
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal((await saved(page)).hero, preserved.hero);
  pass("Valid save import restores the kingdom");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export kingdom save" }).click();
  const download = await downloading;
  assert.equal(download.suggestedFilename(), "squeek-kingdom-save.json");
  pass("Export creates a downloadable JSON backup");
  // Keyboard-only modal journey and responsive reflow across every view.
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Kingdom", exact: true })
    .click();
  await page.getByRole("button", { name: "Build & upgrade" }).focus();
  await page.keyboard.press("Enter");
  assert.ok(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  assert.ok(
    await page
      .getByRole("button", { name: "Build & upgrade" })
      .evaluate((el) => el === document.activeElement),
  );
  pass("Keyboard building picker and focus return");
  for (const width of [320, 390, 740, 1000, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      "kingdom",
      "inventory",
      "adventures",
      "quests",
      "arena",
      "collection",
    ]) {
      await page.goto(url + "#" + route);
      await page.locator("main h1").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `overflow ${route} ${width}`,
      );
    }
  }
  pass("All six game screens reflow at 320, 390, 740, 1000 and 1440 pixels");
  await context.close();
  await writeFile(
    "test/scratch/interaction-results.json",
    JSON.stringify({ steps, errors, failures, events }, null, 2),
  );
  assert.equal(errors.length, 0);
  assert.equal(failures.length, 0);
  console.log(
    "RESULT",
    JSON.stringify({ passed: steps.length, errors, failures, events }),
  );
} finally {
  await browser.close();
  server.close();
}
