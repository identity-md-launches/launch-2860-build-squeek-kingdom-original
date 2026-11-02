import { browserType, launchOptions, AxeBuilder } from "./tools.mjs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { serve } from "./serve.mjs";
await (
  await import("node:fs/promises")
).mkdir("test/scratch", { recursive: true });
const { server, url } = await serve();
const b = await browserType.launch(launchOptions);
const observations = [];
const errors = [];
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", async (r) => {
    if (r.url() === "https://api.squeekchain.com/v1/status" && r.ok()) {
      try {
        const d = await r.json();
        observations.push({
          generatedAt: d.generatedAt,
          measurement: d.measurement
            ? {
                observedAt: d.measurement.observedAt,
                cumulativeWorkUnits: d.measurement.cumulativeWorkUnits,
                rpmMilli: d.measurement.rpmMilli,
                provenance: d.measurement.provenance,
                freshness: d.measurement.freshness,
              }
            : null,
        });
      } catch {}
    }
  });
  await p.goto(url + "#arena");
  await p.getByRole("button", { name: "Wheel challenge", exact: true }).click();
  await p.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Start wheel challenge"),
      )?.disabled,
    {},
    { timeout: 25000 },
  );
  await p.getByRole("button", { name: "Start wheel challenge" }).click();
  for (let i = 0; i < 3; i++)
    await p.getByRole("button", { name: "Boost pace" }).click();
  await p
    .getByText(/^Compared with \d+ real wheel passages/)
    .waitFor({ timeout: 35000 });
  await p.screenshot({ path: "test/scratch/live-race.png", fullPage: true });
  const summary = await p.locator(".race-result").innerText();
  const save = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("squeek-kingdom-save-v1")),
  );
  assert.equal(save.stats.races, 1);
  assert.ok(observations.length >= 3);
  assert.equal(errors.length, 0);
  console.log(
    JSON.stringify(
      { summary, pendingRound: save.pendingRound, observations, errors },
      null,
      2,
    ),
  );
  await writeFile(
    "test/scratch/live-race-results.json",
    JSON.stringify(
      { summary, pendingRound: save.pendingRound, observations, errors },
      null,
      2,
    ),
  );
  await ctx.close();
} finally {
  await b.close();
  server.close();
}
