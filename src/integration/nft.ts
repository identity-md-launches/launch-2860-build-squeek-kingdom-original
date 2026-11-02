import { chainClient, NFT_ABI, NFT_ADDRESS, DEPLOYMENT } from "./chain";
import { isAddressEqual, type Address } from "viem";
export type Nft = {
  id: string;
  name: string;
  image: string;
  description: string;
  traits: { trait_type: string; value: string | number }[];
  block: string;
};
export type NftSession = {
  block: bigint;
  balance: bigint;
  max: number;
  next: number;
  tokens: Nft[];
};
const read = (
  functionName: string,
  args: readonly unknown[] = [],
  blockNumber?: bigint,
) =>
  chainClient.readContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName,
    args,
    blockNumber,
  });
export async function beginCollection(address: Address): Promise<NftSession> {
  const chain = await chainClient.getChainId();
  if (chain !== 11155111)
    throw new Error("The read endpoint is not on Sepolia.");
  const latest = await chainClient.getBlockNumber();
  const block = latest > 12n ? latest - 12n : latest;
  const [code, name, mining, core, balance, max] = await Promise.all([
    chainClient.getBytecode({ address: NFT_ADDRESS, blockNumber: block }),
    read("name", [], block),
    read("mining", [], block),
    read("sqkCore", [], block),
    read("balanceOf", [address], block),
    read("MAX_SUPPLY", [], block),
  ]);
  if (
    !code ||
    name !== "Squeek" ||
    !isAddressEqual(
      mining as Address,
      DEPLOYMENT.contracts.SqueekMining.address as Address,
    ) ||
    !isAddressEqual(
      core as Address,
      DEPLOYMENT.contracts.SqueekCore.address as Address,
    )
  )
    throw new Error(
      "The published NFT contract bindings could not be verified. Cosmetics remain locked.",
    );
  if (
    typeof balance !== "bigint" ||
    (typeof max !== "number" && typeof max !== "bigint") ||
    Number(max) > 20000
  )
    throw new Error("Unsupported collection response.");
  return { block, balance, max: Number(max), next: 1, tokens: [] };
}
export async function scanCollection(
  session: NftSession,
  address: Address,
): Promise<NftSession> {
  const end = Math.min(session.next + 199, session.max);
  const ids = Array.from({ length: end - session.next + 1 }, (_, i) =>
    BigInt(session.next + i),
  );
  const owners = await chainClient.multicall({
    contracts: ids.map((id) => ({
      address: NFT_ADDRESS,
      abi: NFT_ABI,
      functionName: "ownerOf",
      args: [id],
    })),
    blockNumber: session.block,
    allowFailure: true,
    batchSize: 16000,
  });
  const tokens = [...session.tokens];
  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    if (
      owner.status === "success" &&
      typeof owner.result === "string" &&
      isAddressEqual(owner.result as Address, address)
    )
      tokens.push(await loadToken(ids[i].toString(), address, session.block));
  }
  return { ...session, next: end + 1, tokens };
}
export async function loadToken(
  id: string,
  address: Address,
  block?: bigint,
): Promise<Nft> {
  if (!/^\d+$/.test(id)) throw new Error("Enter a numeric Squeek token ID.");
  const at = block ?? (await chainClient.getBlockNumber()) - 12n;
  const owner = await read("ownerOf", [BigInt(id)], at);
  if (typeof owner !== "string" || !isAddressEqual(owner as Address, address))
    throw new Error(
      "This Squeek is not held by the connected wallet at the checked block.",
    );
  const uri = await read("tokenURI", [BigInt(id)], at);
  if (
    typeof uri !== "string" ||
    !uri.startsWith("data:application/json;base64,")
  )
    throw new Error("The contract returned unsupported metadata.");
  const metadata: unknown = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(uri.split(",")[1]), (c) => c.charCodeAt(0)),
    ),
  );
  if (!metadata || typeof metadata !== "object")
    throw new Error("Invalid NFT metadata.");
  const m = metadata as Record<string, unknown>;
  if (
    typeof m.image !== "string" ||
    !m.image.startsWith("data:image/svg+xml;base64,") ||
    m.image.length > 1000000
  )
    throw new Error("The contract returned an unsupported image.");
  return {
    id,
    name: typeof m.name === "string" ? m.name : `Squeek #${id}`,
    image: m.image,
    description: typeof m.description === "string" ? m.description : "",
    traits: Array.isArray(m.attributes)
      ? m.attributes.filter(
          (a): a is Nft["traits"][number] =>
            !!a &&
            typeof a.trait_type === "string" &&
            ["string", "number"].includes(typeof a.value),
        )
      : [],
    block: at.toString(),
  };
}
export async function recheckNft(id: string, address: Address) {
  return loadToken(id, address);
}

/** Enumerate incoming transfers, then prove current ownership at the confirmed snapshot. */
export async function discoverCollection(
  session: NftSession,
  address: Address,
): Promise<NftSession & { ownedIds: string[] }> {
  const candidates = new Set<string>();
  for (
    let from = BigInt(DEPLOYMENT.deploymentBlock);
    from <= session.block;
    from += 50000n
  ) {
    const to = from + 49999n > session.block ? session.block : from + 49999n;
    const logs = await chainClient.getContractEvents({
      address: NFT_ADDRESS,
      abi: NFT_ABI,
      eventName: "Transfer",
      args: { to: address },
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      const args = log.args as { tokenId?: bigint };
      if (args.tokenId !== undefined) candidates.add(args.tokenId.toString());
    }
  }
  const ids = [...candidates];
  if (!ids.length && session.balance > 0n)
    throw new Error(
      "Transfer history is incomplete. Use token scanning or a known token ID.",
    );
  const owners = await chainClient.multicall({
    contracts: ids.map((id) => ({
      address: NFT_ADDRESS,
      abi: NFT_ABI,
      functionName: "ownerOf",
      args: [BigInt(id)],
    })),
    blockNumber: session.block,
    allowFailure: true,
    batchSize: 16000,
  });
  const ownedIds = ids.filter(
    (_, i) =>
      owners[i].status === "success" &&
      typeof owners[i].result === "string" &&
      isAddressEqual(owners[i].result as Address, address),
  );
  if (BigInt(ownedIds.length) !== session.balance)
    throw new Error(
      "Transfer history could not account for every owned Squeek. Use token scanning or a known token ID.",
    );
  const tokens = await Promise.all(
    ownedIds.slice(0, 8).map((id) => loadToken(id, address, session.block)),
  );
  return { ...session, next: session.max + 1, tokens, ownedIds };
}
