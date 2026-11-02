import { pathToFileURL } from "node:url";
import path from "node:path";
const root = process.env.SQUEEK_CHECKS_DIR;
const locate = (name, file) =>
  root ? pathToFileURL(path.join(root, "node_modules", name, file)).href : name;
export const { chromium, webkit } = await import(
  locate("playwright", "index.mjs")
);
export const { default: AxeBuilder } = await import(
  locate("@axe-core/playwright", "dist/index.mjs")
);

export const browserType =
  process.env.SQUEEK_BROWSER === "webkit" ? webkit : chromium;
export const launchOptions = process.env.SQUEEK_BROWSER_EXECUTABLE
  ? { executablePath: process.env.SQUEEK_BROWSER_EXECUTABLE }
  : {};
