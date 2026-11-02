import { browserType, launchOptions, AxeBuilder } from "./tools.mjs";
import { serve } from "./serve.mjs";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
await (
  await import("node:fs/promises")
).mkdir("test/scratch", { recursive: true });
const { server, url } = await serve();
const b = await browserType.launch(launchOptions);
const results = [];
try {
  const context = await b.newContext();
  await context.route("https://api.squeekchain.com/**", (r) => r.abort());
  const p = await context.newPage();
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 844 });
    for (const route of [
      "kingdom",
      "adventures",
      "inventory",
      "quests",
      "arena",
      "collection",
    ]) {
      await p.goto(url + "#" + route);
      const report = await new AxeBuilder({ page: p }).analyze();
      results.push({
        width,
        route,
        violations: report.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
    }
  }
  await p.goto(url);
  await p.keyboard.press("Tab");
  assert.equal(
    await p
      .locator(".skip-link")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await p.screenshot({ path: "test/scratch/keyboard-focus.png" });
  await p.keyboard.press("Enter");
  assert.equal(
    await p.locator("main").evaluate((el) => el === document.activeElement),
    true,
  );
  results.push({
    check: "Visible skip link and keyboard focus into main",
    passed: true,
  });
  await p.goto(url + "#inventory");
  await p.getByRole("heading", { name: "Inventory", exact: true }).waitFor();
  await p.locator(".skip-link").focus();
  await p.keyboard.press("Enter");
  assert.equal(await p.locator("main h1").innerText(), "Inventory");
  assert.equal(await p.evaluate(() => location.hash), "#inventory");
  results.push({
    check: "Skip link preserves the active game screen",
    passed: true,
  });
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(url);
  await p.waitForTimeout(300);
  const before = await p
    .locator(".kingdom-scene canvas")
    .evaluate((el) => el.toDataURL());
  await p.waitForTimeout(400);
  const after = await p
    .locator(".kingdom-scene canvas")
    .evaluate((el) => el.toDataURL());
  assert.equal(before, after);
  results.push({
    check: "Reduced motion keeps the world canvas still",
    passed: true,
  });
  const blocked = await b.newContext({ viewport: { width: 390, height: 844 } });
  await blocked.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    }),
  );
  const q = await blocked.newPage();
  await q.goto(url);
  await q.getByRole("button", { name: "Gather supplies" }).click();
  await q
    .getByText("Storage unavailable · Export your save", { exact: true })
    .waitFor();
  assert.ok(
    await q.getByRole("heading", { name: "Your little kingdom." }).isVisible(),
  );
  results.push({
    check:
      "Blocked localStorage keeps gathering playable and exposes backup guidance",
    passed: true,
  });
  await blocked.close();
  await writeFile(
    "test/scratch/accessibility-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await b.close();
  server.close();
}
