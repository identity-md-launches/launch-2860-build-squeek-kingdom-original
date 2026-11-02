import { useQuery } from "@tanstack/react-query";
export const API = "https://api.squeekchain.com/v1";
export type Measurement = {
  freshness: string;
  observedAt: string;
  staleAfterSeconds: number;
  counterEpoch: string;
  cumulativeWorkUnits: string;
  provenance: string;
  coreStatus: string;
  rpmMilli: number;
  speedMmPerSecond: number;
  distanceMm: number;
};
export type Pipeline = {
  schemaVersion: 1;
  installationId: string;
  generatedAt: string;
  measurement: Measurement | null;
  builder: {
    status: string;
    queued?: { openRoundWorkUnits: string; closedWorkUnits: string };
    anchor?: { settledThroughRound: string; transactionHash: string };
  };
};
export type Core = {
  schemaVersion: 1;
  installationId: string;
  status: "available";
  chain: { chainId: string; safeThroughBlock: string };
  identities: { core: string };
  configuration: { genesisTimestamp: string; roundDuration: string };
  core: {
    settledThroughRound: string;
    cumulativeWork: string;
    blockHeight: string;
  };
  source?: { transactionHash: string };
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object";
const decimal = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{1,20}$/.test(v) &&
  BigInt(v) <= 18446744073709551615n;
export class ApiError extends Error {
  constructor(
    message: string,
    public retryAfter = 30,
  ) {
    super(message);
  }
}
const notBefore = new Map<string, number>();
async function read(path: string, signal?: AbortSignal) {
  const wait = (notBefore.get(path) ?? 0) - Date.now();
  if (wait > 0)
    throw new ApiError(
      "The API asked us to wait before retrying. Your kingdom is still playable.",
      Math.ceil(wait / 1000),
    );
  const timeout = AbortSignal.timeout(10000);
  const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
  let response: Response;
  try {
    response = await fetch(API + path, {
      signal: combined,
      headers: { accept: "application/json" },
      credentials: "omit",
    });
  } catch {
    throw new ApiError(
      "SqueekChain is unreachable. Your kingdom is still playable.",
    );
  }
  if (!response.ok) {
    const seconds = Math.max(
      15,
      Number(response.headers.get("retry-after")) || 30,
    );
    if (response.status === 429 || response.status === 503)
      notBefore.set(path, Date.now() + seconds * 1000);
    throw new ApiError(
      `SqueekChain returned HTTP ${response.status}. Try again shortly.`,
      seconds,
    );
  }
  const data: unknown = await response.json();
  if (!record(data))
    throw new ApiError("The API returned an unreadable response.");
  if (data.schemaVersion !== 1)
    throw new ApiError(
      "The API schema has changed. Live challenges are paused.",
    );
  if (data.status === "unavailable")
    throw new ApiError(
      `Data unavailable: ${typeof data.reason === "string" ? data.reason : "service unavailable"}.`,
    );
  return data;
}
export async function readPipeline(signal?: AbortSignal): Promise<Pipeline> {
  const d = await read("/status", signal);
  if (
    typeof d.installationId !== "string" ||
    typeof d.generatedAt !== "string" ||
    !record(d.builder)
  )
    throw new ApiError("Incomplete pipeline response.");
  if (d.measurement !== null) {
    const m = d.measurement;
    if (
      !record(m) ||
      !decimal(m.cumulativeWorkUnits) ||
      typeof m.observedAt !== "string" ||
      !Number.isFinite(Date.parse(m.observedAt)) ||
      typeof m.staleAfterSeconds !== "number" ||
      typeof m.counterEpoch !== "string" ||
      typeof m.freshness !== "string" ||
      typeof m.provenance !== "string" ||
      !["rpmMilli", "speedMmPerSecond", "distanceMm"].every(
        (k) =>
          typeof m[k] === "number" &&
          Number.isFinite(m[k]) &&
          (m[k] as number) >= 0,
      )
    )
      throw new ApiError("Incomplete measurement. Live challenges are paused.");
  }
  if (d.builder.status === "available") {
    const q = d.builder.queued;
    if (
      !record(q) ||
      !decimal(q.openRoundWorkUnits) ||
      !decimal(q.closedWorkUnits)
    )
      throw new ApiError("Incomplete provisional activity.");
  }
  return d as unknown as Pipeline;
}
export async function readCore(signal?: AbortSignal): Promise<Core> {
  const d = await read("/core", signal);
  if (
    d.status !== "available" ||
    !record(d.chain) ||
    d.chain.chainId !== "11155111" ||
    !decimal(d.chain.safeThroughBlock) ||
    !record(d.identities) ||
    typeof d.identities.core !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(d.identities.core) ||
    !record(d.configuration) ||
    !decimal(d.configuration.genesisTimestamp) ||
    d.configuration.roundDuration !== "600" ||
    !record(d.core) ||
    !decimal(d.core.settledThroughRound) ||
    !decimal(d.core.cumulativeWork) ||
    !decimal(d.core.blockHeight) ||
    typeof d.installationId !== "string"
  )
    throw new ApiError(
      "Unsupported chain or round configuration. Live challenges are paused.",
    );
  return d as unknown as Core;
}
export function currentRound(
  core: Core,
  now = Date.now(),
): { id: string; remaining: number } {
  const seconds = BigInt(Math.floor(now / 1000));
  const genesis = BigInt(core.configuration.genesisTimestamp);
  const duration = 600n;
  if (seconds < genesis)
    return { id: "0", remaining: Number(genesis - seconds) };
  return {
    id: ((seconds - genesis) / duration + 1n).toString(),
    remaining: Number(duration - ((seconds - genesis) % duration)),
  };
}
export function freshMeasurement(p: Pipeline | undefined, now = Date.now()) {
  const m = p?.measurement;
  return (
    !!m &&
    m.provenance === "hardware" &&
    ["IDLE", "ACTIVE"].includes(m.coreStatus) &&
    m.freshness === "online" &&
    now - Date.parse(m.observedAt) <= m.staleAfterSeconds * 1000 &&
    now - Date.parse(m.observedAt) > -10000
  );
}
export function useSqueekChain(racing = false) {
  const pipeline = useQuery({
    queryKey: ["pipeline"],
    queryFn: ({ signal }) => readPipeline(signal),
    refetchInterval: racing ? 2000 : 15000,
    retry: false,
    staleTime: 1000,
  });
  const core = useQuery({
    queryKey: ["core"],
    queryFn: ({ signal }) => readCore(signal),
    refetchInterval: 30000,
    retry: false,
    staleTime: 5000,
  });
  const ready =
    !pipeline.isError &&
    !core.isError &&
    freshMeasurement(pipeline.data) &&
    !!core.data &&
    core.data.installationId === pipeline.data?.installationId &&
    BigInt(currentRound(core.data).id) >
      BigInt(core.data.core.settledThroughRound);
  return { pipeline, core, ready };
}
