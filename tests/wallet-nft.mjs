import assert from "node:assert/strict";
import { browserType, launchOptions, AxeBuilder } from "./tools.mjs";
import { serve } from "./serve.mjs";
import { readFile, writeFile } from "node:fs/promises";
const deployment = JSON.parse(
  await readFile("src/integration/deployment.json"),
);
await (
  await import("node:fs/promises")
).mkdir("test/scratch", { recursive: true });
const { server, url } = await serve();
const browser = await browserType.launch(launchOptions);
const results = [];
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    ({ address }) => {
      let connected = false;
      let chain = "0xaa36a7";
      const listeners = {};
      window.walletRequests = [];
      const provider = {
        request: async ({ method, params }) => {
          window.walletRequests.push(method);
          if (method === "eth_accounts") return connected ? [address] : [];
          if (method === "eth_requestAccounts") {
            connected = true;
            return [address];
          }
          if (method === "eth_chainId") return chain;
          if (method === "wallet_switchEthereumChain") {
            chain = params[0].chainId;
            (listeners.chainChanged || []).forEach((fn) => fn(chain));
            return null;
          }
          if (method === "wallet_requestPermissions")
            return [{ parentCapability: "eth_accounts" }];
          if (method === "wallet_getPermissions")
            return connected ? [{ parentCapability: "eth_accounts" }] : [];
          if (method === "wallet_revokePermissions") {
            connected = false;
            return null;
          }
          throw Object.assign(
            new Error("Unsupported validation method " + method),
            { code: 4200 },
          );
        },
        on: (event, callback) => {
          (listeners[event] ??= []).push(callback);
        },
        removeListener: (event, callback) => {
          listeners[event] = (listeners[event] || []).filter(
            (fn) => fn !== callback,
          );
        },
      };
      window.forceValidationChain = (value) => {
        chain = value;
        (listeners.chainChanged || []).forEach((fn) => fn(chain));
      };
      const announce = () =>
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: {
                uuid: "db942cff-d29b-4556-b5db-df7adb7eaf58",
                name: "Validation wallet",
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" fill="green"/></svg>',
                rdns: "test.squeek.validation",
              },
              provider,
            },
          }),
        );
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
    },
    { address: deployment.operational.economicRecipient.address },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page.getByRole("button", { name: "Validation wallet" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.match(await page.locator(".wallet-control").innerText(), /0x828C/i);
  results.push("EIP-6963 discovered wallet connects through the unified sheet");
  await page.evaluate(() => window.forceValidationChain("0x1"));
  await page.getByRole("button", { name: "Switch to Sepolia" }).click();
  await page
    .getByRole("button", { name: "Switch to Ethereum Sepolia" })
    .click();
  await page.getByText("Network: Ethereum Sepolia").waitFor();
  await page.keyboard.press("Escape");
  results.push("Wrong-chain state and explicit Sepolia switch");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "NFT collection" })
    .click();
  await page.getByRole("button", { name: "Check owned Squeeks" }).click();
  await page
    .getByText("100 Squeeks held in this wallet", { exact: true })
    .waitFor({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Use as hero portrait" })
    .first()
    .waitFor({ timeout: 60000 });
  const count = await page.locator(".nft-item").count();
  assert.ok(count > 0);
  results.push(
    `Real published NFT contract balance, transfer discovery, ownerOf, tokenURI and ${count} onchain portraits`,
  );
  await page.screenshot({
    path: "test/scratch/collection.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Use as hero portrait" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Portrait equipped" })
    .waitFor({ timeout: 30000 });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Kingdom", exact: true })
    .click();
  assert.equal(await page.locator(".portrait img").count(), 1);
  results.push(
    "Ownership rechecked before applying an optional cosmetic portrait",
  );
  await page.locator(".wallet-control").click();
  await page.getByRole("button", { name: "Disconnect wallet" }).click();
  await page.getByRole("button", { name: "Connect wallet" }).waitFor();
  await page.locator(".portrait img").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".portrait img").count(), 0);
  results.push("Disconnect clears wallet and NFT portrait");
  const methods = await page.evaluate(() => window.walletRequests);
  assert.ok(!methods.some((m) => /sign|sendTransaction|sendCalls/i.test(m)));
  results.push("No signing, fund handling or transaction requests");
  await context.close();
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const mobile = await phone.newPage();
  await mobile.goto(url);
  await mobile.getByRole("button", { name: "Connect wallet" }).click();
  for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"]) {
    const link = mobile.getByRole("link", {
      name: "Open in " + name,
      exact: true,
    });
    assert.ok(await link.isVisible());
    assert.ok((await link.getAttribute("href")).includes("http"));
  }
  assert.ok(
    await mobile
      .getByRole("button", { name: "Coinbase Smart Wallet" })
      .isVisible(),
  );
  await mobile.screenshot({
    path: "test/scratch/mobile-wallet.png",
    fullPage: true,
  });
  results.push(
    "Phone sheet lists four wallet-browser links and Coinbase Smart Wallet, without a QR relay",
  );
  await phone.close();
  console.log(JSON.stringify({ results, methods, errors }, null, 2));
  await writeFile(
    "test/scratch/wallet-nft-results.json",
    JSON.stringify({ results, methods, errors }, null, 2),
  );
  assert.equal(errors.length, 0);
} finally {
  await browser.close();
  server.close();
}
