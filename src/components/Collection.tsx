import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import {
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Search,
  Sparkles,
} from "lucide-react";
import { NFT_ADDRESS } from "../integration/chain";
import {
  beginCollection,
  scanCollection,
  loadToken,
  recheckNft,
  discoverCollection,
  type Nft,
  type NftSession,
} from "../integration/nft";
import { Hamster } from "./Pixel";
export function Collection({
  onSkin,
  skin,
}: {
  onSkin: (skin: Nft | null) => void;
  skin: Nft | null;
}) {
  const { address, isConnected, chainId } = useAccount();
  const [session, setSession] = useState<NftSession | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [token, setToken] = useState(""),
    [ownedIds, setOwnedIds] = useState<string[]>([]);
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    setSession(null);
    setOwnedIds([]);
    setError("");
    setLoading(false);
    return () => {
      request.current++;
    };
  }, [address]);
  async function refresh() {
    if (!address) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const value = await beginCollection(address);
      if (id === request.current) {
        setSession(value);
        setOwnedIds([]);
        if (value.balance > 0n) {
          try {
            const found = await discoverCollection(value, address);
            if (id === request.current) {
              setSession(found);
              setOwnedIds(found.ownedIds);
            }
          } catch {
            if (id === request.current)
              setError(
                "Automatic discovery could not finish. Use token scanning or look up a token ID below.",
              );
          }
        }
      }
    } catch (e) {
      if (id === request.current)
        setError(
          e instanceof Error ? e.message : "Collection unavailable. Try again.",
        );
    } finally {
      if (id === request.current) setLoading(false);
    }
  }
  async function scan() {
    if (!address || !session) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const value = await scanCollection(session, address);
      if (id === request.current) setSession(value);
    } catch {
      if (id === request.current)
        setError(
          "The Sepolia read could not finish. Retry this scan; progress is retained.",
        );
    } finally {
      if (id === request.current) setLoading(false);
    }
  }
  async function lookup() {
    if (!address || !session) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const nft = await loadToken(token, address, session.block);
      if (id !== request.current) return;
      setSession((s) =>
        s
          ? { ...s, tokens: [...s.tokens.filter((n) => n.id !== nft.id), nft] }
          : s,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Token lookup failed. Check the token ID and retry.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadMore() {
    if (!address || !session) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const unloaded = ownedIds
        .filter((id) => !session.tokens.some((n) => n.id === id))
        .slice(0, 8);
      const tokens = await Promise.all(
        unloaded.map((id) => loadToken(id, address, session.block)),
      );
      if (id === request.current)
        setSession((s) => (s ? { ...s, tokens: [...s.tokens, ...tokens] } : s));
    } catch {
      setError(
        "More portraits could not load. Retry when the Sepolia endpoint is available.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function apply(nft: Nft) {
    if (!address) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const verified = await recheckNft(nft.id, address);
      if (id === request.current) onSkin(verified);
    } catch {
      if (id !== request.current) return;
      onSkin(null);
      setError(
        "Ownership could not be confirmed. Refresh the collection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="collection-content">
      <div className="section-intro">
        <div>
          <h2>A face for your adventure.</h2>
          <p>Bring a Squeek you own into the kingdom as your hero portrait.</p>
        </div>
        <Sparkles size={28} />
      </div>
      <div className="collection-source">
        <ShieldCheck size={24} />
        <div>
          <strong>Official Squeek collection · Sepolia</strong>
          <a
            href={`https://eth-sepolia.blockscout.com/address/${NFT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            {NFT_ADDRESS}
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
      <p className="fine-print">
        Ownership and metadata are read directly from the contract in the
        published deployment record. This game’s portrait customization is
        cosmetic only; it is not an official NFT benefit. NFTs are optional.
      </p>
      {!isConnected ? (
        <div className="empty-state">
          <Hamster size={100} />
          <h3>Your next adventure needs no NFT.</h3>
          <p>
            Connect a wallet in the header to check your owned Squeeks. You can
            keep exploring as a guest.
          </p>
        </div>
      ) : chainId !== 11155111 ? (
        <p className="notice-inline">
          Open your wallet control in the header and switch to Ethereum Sepolia
          to check your collection.
        </p>
      ) : (
        <>
          <button
            className="secondary"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            {loading
              ? "Reading Sepolia…"
              : session
                ? "Refresh ownership"
                : "Check owned Squeeks"}
          </button>
          {session && (
            <>
              <p className="collection-summary">
                <strong>
                  {session.balance.toString()} Squeeks held in this wallet
                </strong>
                <span>Checked at Sepolia block {session.block.toString()}</span>
              </p>
              {session.balance === 0n ? (
                <div className="empty-state compact">
                  <Hamster hero="Engineer" size={76} />
                  <h3>No Squeeks held in this wallet.</h3>
                  <p>
                    Staked NFTs are not wallet-held and do not unlock portraits
                    here. Your kingdom is ready to play.
                  </p>
                </div>
              ) : (
                <>
                  <p>
                    {ownedIds.length
                      ? `${ownedIds.length} token IDs verified from onchain transfers. Portraits load eight at a time.`
                      : "If automatic discovery is unavailable, scan token IDs or look up a Squeek you own."}
                  </p>
                  <div className="scan-row">
                    {ownedIds.length > session.tokens.length && (
                      <button
                        className="secondary"
                        disabled={loading}
                        onClick={() => void loadMore()}
                      >
                        Load more portraits
                      </button>
                    )}
                    {!ownedIds.length && (
                      <button
                        className="secondary"
                        disabled={
                          loading ||
                          session.next > session.max ||
                          BigInt(session.tokens.length) >= session.balance
                        }
                        onClick={() => void scan()}
                      >
                        {session.next > session.max
                          ? "Scan complete"
                          : `Scan next ${Math.min(200, session.max - session.next + 1)} tokens`}
                      </button>
                    )}
                    <span>
                      {ownedIds.length
                        ? `${ownedIds.length} owned token IDs verified`
                        : `${Math.min(session.next - 1, session.max)} / ${session.max} token IDs scanned`}
                    </span>
                  </div>
                  <form
                    className="lookup-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void lookup();
                    }}
                  >
                    <label htmlFor="token-id">Known token ID</label>
                    <div>
                      <input
                        id="token-id"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]+"
                        required
                        placeholder="Your Squeek token ID"
                      />
                      <button
                        className="secondary"
                        disabled={loading}
                        type="submit"
                      >
                        <Search size={16} />
                        Look up
                      </button>
                    </div>
                  </form>
                </>
              )}
              <div className="nft-grid">
                {session.tokens.map((n) => (
                  <article className="nft-item" key={n.id}>
                    <img src={n.image} alt={n.name} className="nft-art" />
                    <h3>{n.name}</h3>
                    <p className="fine-print">
                      Onchain metadata · Token {n.id}
                    </p>
                    <dl className="traits">
                      {n.traits.map((t, i) => (
                        <div key={i}>
                          <dt>{t.trait_type}</dt>
                          <dd>{t.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      className={skin?.id === n.id ? "secondary" : "primary"}
                      disabled={loading || skin?.id === n.id}
                      onClick={() => void apply(n)}
                    >
                      {skin?.id === n.id
                        ? "Portrait equipped"
                        : "Use as hero portrait"}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error} Try again using the ownership check.
        </p>
      )}
      {skin && (
        <button className="text-button" onClick={() => onSkin(null)}>
          Restore original hamster portrait
        </button>
      )}
      <p className="fine-print">
        The measurement API currently uses a different deployment from the
        published NFT record. Its account index is deliberately not used as
        proof of ownership.
      </p>
    </div>
  );
}
