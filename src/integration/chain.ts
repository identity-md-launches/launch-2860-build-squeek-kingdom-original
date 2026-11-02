import { createConfig, createStorage, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { createPublicClient, fallback } from "viem";
import { sepolia } from "viem/chains";
import published from "./deployment.json";
import officialAbi from "./SqueekNFT.json";
import type { Abi, Address } from "viem";
export const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
// Storage can be denied in private contexts or embedded browsers. Keep guest play available.
const walletStorage = createStorage({
  storage: {
    getItem(key: string) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* Memory-only session. */
      }
    },
    removeItem(key: string) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* Memory-only session. */
      }
    },
  },
});
export const config = createConfig({
  storage: walletStorage,
  chains: [sepolia],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "SQUEEK KINGDOM",
      preference: { options: "all" },
    }),
  ],
  transports: { [sepolia.id]: http(RPC_URL) },
});
export const chainClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http(RPC_URL, { timeout: 12000, retryCount: 1 }),
    http("https://sepolia.drpc.org", { timeout: 12000, retryCount: 1 }),
  ]),
});
export const NFT_ADDRESS = published.contracts.SqueekNFT.address as Address;
export const NFT_ABI = officialAbi as Abi;
export const DEPLOYMENT = published;
