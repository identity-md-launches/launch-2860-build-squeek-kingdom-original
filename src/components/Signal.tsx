import { RefreshCw, Activity, ArrowUpRight, Radio } from "lucide-react";
import {
  currentRound,
  freshMeasurement,
  type useSqueekChain,
} from "../integration/api";
export function Signal({
  feed,
  now,
  onDetails,
}: {
  feed: ReturnType<typeof useSqueekChain>;
  now: number;
  onDetails: () => void;
}) {
  const p = feed.pipeline.data,
    c = feed.core.data;
  const fresh = !feed.pipeline.isError && freshMeasurement(p, now);
  const round = c ? currentRound(c, now) : null;
  const loading = feed.pipeline.isPending || feed.core.isPending;
  return (
    <section className="signal-section" aria-labelledby="signal-heading">
      <div className="signal-title">
        <div className="signal-symbol">
          <Activity size={22} />
        </div>
        <div>
          <h3 id="signal-heading">A very real hamster.</h3>
          <span>
            {loading
              ? "Checking SqueekChain…"
              : fresh
                ? "WHEELY9000 · Hardware measurement"
                : "SqueekChain signal unavailable"}
          </span>
        </div>
        <button
          className="icon-button"
          aria-label="Refresh SqueekChain data"
          disabled={feed.pipeline.isFetching || feed.core.isFetching}
          onClick={() => {
            void feed.pipeline.refetch();
            void feed.core.refetch();
          }}
        >
          <RefreshCw
            size={16}
            className={feed.pipeline.isFetching ? "spin" : ""}
          />
        </button>
      </div>
      <div className="signal-values">
        <div>
          <span>
            <i className={fresh ? "status-dot online" : "status-dot"} />{" "}
            {fresh ? "Live measurement" : "Last measurement"}
          </span>
          <strong>
            {p?.measurement
              ? `${(p.measurement.rpmMilli / 1000).toFixed(1)} RPM`
              : "Unavailable"}
          </strong>
        </div>
        <div>
          <span>Provisional activity</span>
          <strong>
            {!feed.pipeline.isError && p?.builder.status === "available"
              ? `${p.builder.queued?.openRoundWorkUnits} work`
              : "Unavailable"}
          </strong>
        </div>
        <div>
          <span>Settled on Sepolia</span>
          <strong>
            {!feed.core.isError && c
              ? `Round ${c.core.settledThroughRound}`
              : "Unavailable"}
          </strong>
        </div>
      </div>
      <div className="signal-bottom">
        <span>
          {round
            ? `600s rounds · ${Math.floor(round.remaining / 60)}:${String(round.remaining % 60).padStart(2, "0")} left in round ${round.id}`
            : "Your kingdom keeps growing while the signal is away."}
        </span>
        <button className="text-button" onClick={onDetails}>
          About the signal
          <ArrowUpRight size={14} />
        </button>
      </div>
    </section>
  );
}
export function SignalDetails({
  feed,
}: {
  feed: ReturnType<typeof useSqueekChain>;
}) {
  const p = feed.pipeline.data,
    c = feed.core.data;
  return (
    <div className="signal-details">
      <p>
        Real hamster activity reaches the game through the official, public
        SqueekChain API. No wallet is needed.
      </p>
      <div className="detail-row">
        <Radio size={21} />
        <div>
          <h3>Live measurements</h3>
          <p>
            Device observations from the WHEELY9000. Only fresh,
            hardware-sourced readings enable wheel challenges.{" "}
            {p?.measurement
              ? `Last observed: ${new Date(p.measurement.observedAt).toLocaleString()}. Provenance: ${p.measurement.provenance}.`
              : ""}
          </p>
        </div>
      </div>
      <div className="detail-row">
        <Activity size={21} />
        <div>
          <h3>Provisional activity</h3>
          <p>
            Work in open or queued rounds is optimistic. It has not settled on
            Ethereum and cannot trigger the settled-round crystal bonus.
          </p>
        </div>
      </div>
      <div className="detail-row">
        <RefreshCw size={21} />
        <div>
          <h3>Settled rounds</h3>
          <p>
            Each round lasts 600 seconds from the API’s reported genesis. The
            confirmed frontier comes from /v1/core, indexed 12 Ethereum blocks
            behind the tip.{" "}
            {c ? `Read at Sepolia block ${c.chain.safeThroughBlock}.` : ""}
          </p>
        </div>
      </div>
      {c && <p className="address">API core: {c.identities.core}</p>}
      <p>
        Wheel challenges compare your game pace with real observed wheel
        passages during a 20-second sprint. A winning challenge can register 10
        local game crystals for its 600-second round, paid once the same
        deployment reports settlement. All resources and XP exist only in your
        browser.
      </p>
      {feed.pipeline.isError && (
        <p className="error-note">{feed.pipeline.error.message}</p>
      )}
      {feed.core.isError && (
        <p className="error-note">{feed.core.error.message}</p>
      )}
      <a
        className="external-link"
        href="https://docs.squeekchain.com/developers/api/"
        target="_blank"
        rel="noreferrer"
      >
        Read the official API documentation
        <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
