import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { Wallet, LogOut, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Dialog } from "./Dialog";
export const OPEN_IN = [
  {
    id: "metaMask",
    name: "MetaMask",
    href: (u: string) =>
      `https://link.metamask.io/dapp/${u.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (u: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(u)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    href: (u: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(u)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (u: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(new URL(u).origin)}`,
  },
];
export function WalletControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending, variables } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !(window as Window & { ethereum?: unknown }).ethereum &&
    !connectors.some((c) => c.type === "injected" && c.id !== "injected");
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = connectors.filter(
    (c) =>
      !(c.id === "injected" && named) && (!mobile || c.type !== "injected"),
  );
  const label = (c: Connector) =>
    c.id === "injected"
      ? "Browser wallet"
      : c.id === "coinbaseWalletSDK"
        ? mobile
          ? "Coinbase Smart Wallet"
          : "Coinbase Wallet"
        : c.name;
  async function connect(c: Connector) {
    setError("");
    try {
      await connectAsync({ connector: c, chainId: 11155111 });
      setOpen(false);
    } catch {
      setError("Connection was not completed. Choose a wallet to try again.");
    }
  }
  async function switchNetwork() {
    setError("");
    try {
      await switchChainAsync({ chainId: 11155111 });
    } catch {
      setError(
        "Network switch was not completed. Switch to Ethereum Sepolia in your wallet and try again.",
      );
    }
  }
  return (
    <>
      <button
        className="wallet-control"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Wallet size={17} />
        <span>
          {isConnected && address
            ? chainId !== 11155111
              ? "Switch to Sepolia"
              : `${address.slice(0, 6)}…${address.slice(-4)}`
            : "Connect wallet"}
        </span>
      </button>
      {open && (
        <Dialog
          title={isConnected ? "Wallet connected" : "Connect your wallet"}
          onClose={() => setOpen(false)}
        >
          <p className="muted">
            Optional, always. Your kingdom is playable as a guest. Wallet access
            is read-only.
          </p>
          {isConnected && address ? (
            <>
              <p className="address">{address}</p>
              <p>
                Network:{" "}
                {chainId === 11155111 ? "Ethereum Sepolia" : `Chain ${chainId}`}
              </p>
              {chainId !== 11155111 && (
                <button
                  className="primary full"
                  disabled={switching}
                  onClick={switchNetwork}
                >
                  {switching ? "Switching…" : "Switch to Ethereum Sepolia"}
                </button>
              )}
              <button
                className="wallet-row"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                <LogOut size={22} />
                Disconnect wallet
              </button>
            </>
          ) : (
            <div className="wallet-list">
              {mobile &&
                OPEN_IN.map((w) => (
                  <a
                    className="wallet-row"
                    key={w.id}
                    href={w.href(location.href)}
                  >
                    <img
                      src={`./wallets/${w.id}.svg`}
                      alt=""
                      width={28}
                      height={28}
                    />
                    <span>Open in {w.name}</span>
                    <ArrowUpRight size={18} />
                  </a>
                ))}
              {listed.map((c) => (
                <button
                  className="wallet-row"
                  disabled={isPending}
                  key={c.uid}
                  onClick={() => void connect(c)}
                >
                  {c.icon ? (
                    <img src={c.icon} alt="" width={28} height={28} />
                  ) : c.id === "coinbaseWalletSDK" ? (
                    <img
                      src="./wallets/coinbase.svg"
                      alt=""
                      width={28}
                      height={28}
                    />
                  ) : (
                    <Wallet size={28} />
                  )}
                  <span>{label(c)}</span>
                  {isPending && variables?.connector === c && (
                    <LoaderCircle className="spin" size={18} />
                  )}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="error-note">
              {error}
            </p>
          )}
          <p className="fine-print">
            Never share a private key or recovery phrase. Connecting does not
            sign a message or send a transaction.
          </p>
        </Dialog>
      )}
    </>
  );
}
