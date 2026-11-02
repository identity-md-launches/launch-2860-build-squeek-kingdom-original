import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import {
  Castle,
  Compass,
  Flag,
  Backpack,
  ScrollText,
  Sparkles,
  Volume2,
  VolumeX,
  CircleHelp,
  ChevronRight,
  ArrowRight,
  Hammer,
  Axe,
  Check,
  Trophy,
  Leaf,
  Pause,
  Play,
  Shield,
  Heart,
  Footprints,
  FlaskConical,
  Package,
  Download,
  Save,
  X,
  ExternalLink,
} from "lucide-react";
import {
  act,
  newGame,
  parseSave,
  RESOURCES,
  BUILDINGS,
  HEROES,
  QUESTS,
  ACHIEVEMENTS,
  RECIPES,
  costFor,
  canAfford,
  production,
  level,
  type Action,
  type GameState,
  type Building,
  type Item,
  type Resources,
  type Hero,
} from "./game/engine";
import { Hamster, BuildingArt, ResourceIcon } from "./components/Pixel";
import { KingdomMap } from "./components/KingdomMap";
import { Dialog } from "./components/Dialog";
import { WalletControl } from "./components/Wallet";
import { Signal, SignalDetails } from "./components/Signal";
import { Race } from "./components/Race";
import { Collection } from "./components/Collection";
import { useSqueekChain } from "./integration/api";
import type { Nft } from "./integration/nft";
const STORAGE = "squeek-kingdom-save-v1";
type Page =
  "kingdom" | "adventures" | "arena" | "inventory" | "quests" | "collection";
type Modal = "hero" | "build" | "help" | "signal" | Building | null;
const NAV: { id: Page; label: string; Icon: typeof Castle }[] = [
  { id: "kingdom", label: "Kingdom", Icon: Castle },
  { id: "adventures", label: "Adventure", Icon: Compass },
  { id: "arena", label: "Race arena", Icon: Flag },
  { id: "inventory", label: "Inventory", Icon: Backpack },
  { id: "quests", label: "Quests", Icon: ScrollText },
  { id: "collection", label: "NFT collection", Icon: Sparkles },
];
function startingGame() {
  try {
    return parseSave(localStorage.getItem(STORAGE));
  } catch {
    return newGame();
  }
}
export default function App() {
  const [game, setGame] = useState<GameState>(startingGame),
    [now, setNow] = useState(Date.now()),
    [modal, setModal] = useState<Modal>(null),
    [page, setPage] = useState<Page>(() =>
      NAV.some((n) => n.id === location.hash.slice(1))
        ? (location.hash.slice(1) as Page)
        : "kingdom",
    );
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    ),
    [saved, setSaved] = useState(true),
    [sound, setSound] = useState(false),
    [paused, setPaused] = useState(false),
    [racing, setRacing] = useState(false),
    [skin, setSkin] = useState<Nft | null>(null),
    [importError, setImportError] = useState("");
  const { address } = useAccount();
  const feed = useSqueekChain(racing);
  const gameRef = useRef(game),
    soundRef = useRef(sound);
  gameRef.current = game;
  soundRef.current = sound;
  const audioRef = useRef<AudioContext | null>(null);
  const chirp = useCallback((negative = false) => {
    if (!soundRef.current) return;
    try {
      const audio = audioRef.current ?? new AudioContext();
      audioRef.current = audio;
      void audio.resume();
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(negative ? 180 : 560, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        negative ? 120 : 940,
        audio.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.2);
    } catch {
      /* Audio remains optional when the browser blocks it. */
    }
  }, []);
  const perform = useCallback(
    (action: Action) => {
      const result = act(gameRef.current, action);
      if (result.state !== gameRef.current) {
        gameRef.current = result.state;
        setGame(result.state);
      }
      if (result.message) {
        setNotice({ text: result.message, error: !!result.error });
        chirp(!!result.error);
      }
      return !result.error;
    },
    [chirp],
  );
  useEffect(() => {
    const id = setInterval(() => {
      const time = Date.now();
      setNow(time);
      perform({ type: "tick", now: time });
    }, 1000);
    return () => clearInterval(id);
  }, [perform]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(game));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [game]);
  useEffect(() => {
    const onHash = () => {
      if (racing) return;
      const value = location.hash.slice(1);
      setPage(NAV.some((n) => n.id === value) ? (value as Page) : "kingdom");
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, [racing]);
  useEffect(() => {
    setSkin(null);
  }, [address]);
  useEffect(() => {
    const c = feed.core.data;
    if (c && !feed.core.isError)
      perform({
        type: "settle",
        frontier: c.core.settledThroughRound,
        core: c.identities.core,
        installation: c.installationId,
      });
  }, [feed.core.data, feed.core.isError, perform]);
  useEffect(() => {
    if (!notice || notice.error) return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  const go = (id: Page) => {
    if (racing) {
      setNotice({
        text: "Finish your race before leaving the arena.",
        error: true,
      });
      return;
    }
    setPage(id);
    location.hash = id;
  };
  const rate = production(game),
    xp = game.xp % 100,
    cooldown = Math.max(0, Math.ceil((8000 - (now - game.gatheredAt)) / 1000));
  const availableQuests = QUESTS.filter((q) => !game.claimed.includes(q.id));
  function exportSave() {
    const blob = new Blob([JSON.stringify(game, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "squeek-kingdom-save.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({
      text: "Kingdom save exported. Keep this file to restore your progress.",
      error: false,
    });
  }
  function importSave(file: File | undefined) {
    if (!file) return;
    setImportError("");
    if (file.size > 100000) {
      setImportError("Choose a kingdom save under 100 KB.");
      return;
    }
    void file.text().then((raw) => {
      try {
        const s = JSON.parse(raw);
        if (s.version !== 1 || !s.resources || !s.buildings) throw Error();
        const next = parseSave(raw, Date.now(), true);
        gameRef.current = next;
        setGame(next);
        setNotice({
          text: "Your saved kingdom has been restored.",
          error: false,
        });
        setModal(null);
      } catch {
        setImportError(
          "This file is not a compatible kingdom save. Choose a Squeek Kingdom export.",
        );
      }
    });
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to game
      </a>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => go("kingdom")}
          aria-label="Squeek Kingdom home"
        >
          <span className="brand-mascot">
            <Hamster size={44} />
          </span>
          <span>
            SQUEEK <span>KINGDOM</span>
          </span>
        </button>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              aria-current={page === id ? "page" : undefined}
              disabled={racing && page !== id}
              onClick={() => go(id)}
            >
              <Icon size={17} />
              <span className="nav-label-desktop">{label}</span>
              <span className="nav-label-mobile">
                {id === "arena" ? "Race" : id === "collection" ? "NFTs" : label}
              </span>
            </button>
          ))}
        </nav>
        <div className="header-utilities">
          <button
            className="icon-button sound-toggle"
            aria-label={sound ? "Mute sound effects" : "Enable sound effects"}
            aria-pressed={sound}
            onClick={() => {
              setSound(!sound);
              soundRef.current = !sound;
              chirp();
            }}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            className="icon-button help-toggle"
            aria-label="How to play"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
          </button>
          <WalletControl />
        </div>
      </header>
      <div
        className="resource-bar"
        role="region"
        aria-label="Kingdom resources"
      >
        <div className="resources">
          {RESOURCES.map((r) => (
            <div className="resource" key={r}>
              <ResourceIcon id={r} size={28} />
              <div>
                <strong>
                  {Math.floor(game.resources[r]).toLocaleString()}
                </strong>
                <span>
                  {r === "crystals"
                    ? "Crystals"
                    : r[0].toUpperCase() + r.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="level-summary">
          <span className="level-badge">{level(game)}</span>
          <div>
            <strong>Kingdom level {level(game)}</strong>
            <div className="xp-track">
              <i style={{ width: `${xp}%` }} />
            </div>
          </div>
          <span>{xp}/100 XP</span>
        </div>
      </div>
      <main id="main-content" tabIndex={-1} className="main-shell">
        {page === "kingdom" ? (
          <>
            <div className="page-heading">
              <div>
                <h1>Your little kingdom.</h1>
                <p>Big dreams begin with tiny paws.</p>
              </div>
              <span className="season">
                <Leaf size={17} />
                Spring in Acorn Hollow
              </span>
            </div>
            <div className="kingdom-layout">
              <div className="world-column">
                <div className="command-bar">
                  <button
                    className="primary gather-button"
                    disabled={!!cooldown}
                    onClick={() => perform({ type: "gather", now: Date.now() })}
                  >
                    <Axe size={18} />
                    {cooldown ? `Gather in ${cooldown}s` : "Gather supplies"}
                    {!cooldown && <span>+ wood, stone, food</span>}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setModal("build")}
                  >
                    <Hammer size={18} />
                    Build & upgrade
                  </button>
                  <button
                    className="secondary explore-command"
                    onClick={() => go("adventures")}
                  >
                    <Compass size={18} />
                    Explore
                  </button>
                </div>
                <section
                  className="world-frame"
                  aria-label="Interactive kingdom"
                >
                  <div className="world-topbar">
                    <div>
                      <span className="world-dot" />
                      <strong>Acorn Hollow</strong>
                    </div>
                    <div className="world-controls">
                      <span>Select a building to grow</span>
                      <button
                        className="icon-button"
                        aria-label={
                          paused
                            ? "Play world animations"
                            : "Pause world animations"
                        }
                        aria-pressed={paused}
                        onClick={() => setPaused(!paused)}
                      >
                        {paused ? <Play size={16} /> : <Pause size={16} />}
                      </button>
                    </div>
                  </div>
                  <KingdomMap game={game} onSelect={setModal} paused={paused} />
                  <div className="world-bottom">
                    <span>
                      <span className="status-dot online" />
                      {saved
                        ? "Kingdom saved on this device"
                        : "Storage unavailable · Export your save"}
                    </span>
                    <span>Single-player · Guest friendly</span>
                  </div>
                </section>

                <div className="discovery-row">
                  <button
                    className="discovery adventure-discovery"
                    onClick={() => go("adventures")}
                  >
                    <div className="discovery-copy">
                      <span className="discovery-icon">
                        <Compass size={18} />
                      </span>
                      <h2>The wild is calling.</h2>
                      <p>Find a little courage. Bring back treasure.</p>
                      <span className="discovery-link">
                        Explore Mosswood
                        <ArrowRight size={16} />
                      </span>
                    </div>
                    <div className="discovery-art">
                      <Hamster hero="Explorer" size={90} />
                      <span className="pixel-tree" />
                    </div>
                  </button>
                  <button
                    className="discovery arena-discovery"
                    onClick={() => go("arena")}
                  >
                    <div className="discovery-copy">
                      <span className="discovery-icon">
                        <Flag size={18} />
                      </span>
                      <h2>Ready, set, squeek.</h2>
                      <p>A little friendly competition awaits.</p>
                      <span className="discovery-link">
                        Enter the arena
                        <ArrowRight size={16} />
                      </span>
                    </div>
                    <div className="discovery-art">
                      <BuildingArt id="arena" size={130} />
                    </div>
                  </button>
                </div>
              </div>
              <aside className="kingdom-sidebar">
                <section className="hero-summary">
                  <div className="hero-summary-top">
                    <div className="portrait">
                      {skin ? (
                        <img src={skin.image} alt={skin.name} />
                      ) : (
                        <Hamster hero={game.hero} size={76} />
                      )}
                    </div>
                    <div>
                      <h2>Pip the {game.hero}</h2>
                      <p>Level {level(game)} adventurer</p>
                      <span className="hero-perk">
                        {HEROES.find((h) => h.name === game.hero)?.description}
                      </span>
                    </div>
                  </div>
                  <div className="xp-label">
                    <span>Next level</span>
                    <span>{xp} / 100 XP</span>
                  </div>
                  <div className="xp-track">
                    <i style={{ width: `${xp}%` }} />
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setModal("hero")}
                  >
                    Change hero
                    <ChevronRight size={15} />
                  </button>
                </section>
                <section className="quest-preview">
                  <div className="panel-heading">
                    <h2>Kingdom quests</h2>
                    <ScrollText size={19} />
                  </div>
                  <p>A few small steps to something great.</p>
                  <div className="quest-preview-list">
                    {availableQuests.slice(0, 3).map((q) => (
                      <div className="quest-mini" key={q.id}>
                        <span
                          className={`quest-check ${q.progress(game) >= q.target ? "ready" : ""}`}
                        >
                          {q.progress(game) >= q.target ? (
                            <Check size={14} />
                          ) : (
                            <span />
                          )}
                        </span>
                        <div>
                          <h3>{q.title}</h3>
                          <p>{q.description}</p>
                          <span className="quest-reward">
                            +{q.xp} XP ·{" "}
                            {Object.entries(q.reward)
                              .map(([r, n]) => `${n} ${r}`)
                              .join(", ")}
                          </span>
                          {q.progress(game) >= q.target && (
                            <button
                              className="claim-inline"
                              onClick={() =>
                                perform({ type: "claim", id: q.id })
                              }
                            >
                              Claim reward
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!availableQuests.length && (
                      <p>Every quest complete. Your next achievement awaits!</p>
                    )}
                  </div>
                  <button className="text-button" onClick={() => go("quests")}>
                    View all quests
                    <span>
                      {game.claimed.length}/{QUESTS.length}
                      <ChevronRight size={15} />
                    </span>
                  </button>
                </section>
                <div className="gentle-note">
                  <span className="small-leaf">
                    <Leaf size={20} />
                  </span>
                  <p>
                    Your kingdom, your pace.
                    <br />
                    No wallet needed to make a little magic.
                  </p>
                </div>
              </aside>
            </div>
            <Signal
              feed={feed}
              now={now}
              onDetails={() => setModal("signal")}
            />
          </>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <button
                  className="breadcrumb text-button"
                  disabled={racing}
                  onClick={() => go("kingdom")}
                >
                  Kingdom
                  <ChevronRight size={14} />
                </button>
                <h1>{NAV.find((n) => n.id === page)?.label}</h1>
              </div>
              <span className="season">
                <Leaf size={17} />
                Acorn Hollow
              </span>
            </div>
            <div className="game-page">
              {page === "arena" && (
                <Race
                  game={game}
                  perform={perform}
                  feed={feed}
                  onRacing={setRacing}
                />
              )}
              {page === "collection" && (
                <Collection skin={skin} onSkin={setSkin} />
              )}
              {page === "inventory" && (
                <>
                  <div className="section-intro">
                    <div>
                      <h2>Good things, made by paws.</h2>
                      <p>
                        Turn your kingdom’s resources into useful little
                        inventions.
                      </p>
                    </div>
                    <Backpack size={28} />
                  </div>
                  <div className="inventory-layout">
                    <section>
                      <h3>Crafting bench</h3>
                      {!game.buildings.workshop && (
                        <p className="notice-inline">
                          Build a workshop to unlock crafting.
                          <button
                            className="text-button"
                            onClick={() => setModal("workshop")}
                          >
                            Build workshop
                            <ArrowRight size={14} />
                          </button>
                        </p>
                      )}
                      <div className="recipe-grid">
                        {(Object.keys(RECIPES) as Item[]).map((id) => {
                          const recipe = RECIPES[id];
                          return (
                            <article className="recipe" key={id}>
                              <ResourceIcon id={id} size={42} />
                              <div>
                                <h3>{recipe.name}</h3>
                                <p>{recipe.description}</p>
                                <Cost cost={recipe.cost} />
                                <button
                                  className="secondary"
                                  disabled={
                                    !game.buildings[recipe.requires] ||
                                    !canAfford(game, recipe.cost)
                                  }
                                  onClick={() => perform({ type: "craft", id })}
                                >
                                  {!game.buildings[recipe.requires]
                                    ? `Requires ${BUILDINGS[recipe.requires].name}`
                                    : `Craft ${recipe.quantity}`}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                    <section className="bag-section">
                      <h3>Your backpack</h3>
                      <p>Items stay with your saved kingdom.</p>
                      {(Object.keys(RECIPES) as Item[]).map((id) => (
                        <div className="bag-item" key={id}>
                          <ResourceIcon id={id} size={30} />
                          <div>
                            <strong>{RECIPES[id].name}</strong>
                            <span>
                              {game.inventory[id] < 0
                                ? "Equipped"
                                : `${game.inventory[id]} in bag`}
                            </span>
                          </div>
                          <button
                            className="text-button"
                            disabled={game.inventory[id] < 1 || id === "gears"}
                            onClick={() => perform({ type: "use", id })}
                          >
                            {id === "gears" ? "Use in arena" : "Use"}
                          </button>
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              )}
              {page === "adventures" && (
                <>
                  <div className="section-intro">
                    <div>
                      <h2>Brave the world beyond.</h2>
                      <p>
                        Three stages. One tiny hero. A backpack full of
                        possibilities.
                      </p>
                    </div>
                    <Compass size={28} />
                  </div>
                  {game.mission ? (
                    <MissionView game={game} perform={perform} />
                  ) : (
                    <>
                      <div className="mission-grid">
                        <article className="mission-card forest-mission">
                          <div className="mission-art">
                            <span className="pixel-tree" />
                            <Hamster hero={game.hero} size={110} />
                            <span className="pixel-tree small" />
                          </div>
                          <div className="mission-details">
                            <span className="mission-type">
                              <Footprints size={15} />
                              Exploration · 3 stages
                            </span>
                            <h3>Mosswood trail</h3>
                            <p>
                              Follow the fireflies, forage for berries, and find
                              a crystal cache hidden beyond the treeline.
                            </p>
                            <span className="mission-reward">
                              35 stone · 30 gold · 12+ crystals · 60 XP
                            </span>
                            <button
                              className="primary"
                              disabled={game.resources.food < 8}
                              onClick={() =>
                                perform({ type: "mission", kind: "explore" })
                              }
                            >
                              Explore Mosswood
                              <span>
                                8 food
                                <ArrowRight size={16} />
                              </span>
                            </button>
                          </div>
                        </article>
                        <article className="mission-card survival-mission">
                          <div className="mission-art">
                            <BuildingArt id="castle" size={155} />
                            <Hamster hero="Warrior" size={80} />
                          </div>
                          <div className="mission-details">
                            <span className="mission-type">
                              <Shield size={15} />
                              Survival · 3 waves
                            </span>
                            <h3>Defend at dusk</h3>
                            <p>
                              The beetles are marching. Build barricades, scout
                              the woodland, or lead a brave little charge.
                            </p>
                            <span className="mission-reward">
                              35 stone · 30 gold · 12 crystals · 60 XP
                            </span>
                            <button
                              className="secondary"
                              disabled={game.resources.food < 8}
                              onClick={() =>
                                perform({ type: "mission", kind: "survive" })
                              }
                            >
                              Defend the kingdom
                              <span>
                                8 food
                                <ArrowRight size={16} />
                              </span>
                            </button>
                          </div>
                        </article>
                      </div>
                      <p className="fine-print">
                        Missions are turn-based local adventures. You keep each
                        stage’s finds even if you retreat. Craft armor and
                        potions to help you survive.
                      </p>
                    </>
                  )}
                </>
              )}
              {page === "quests" && (
                <>
                  <div className="section-intro">
                    <div>
                      <h2>Every little step counts.</h2>
                      <p>
                        Make your kingdom stronger and collect a reward along
                        the way.
                      </p>
                    </div>
                    <ScrollText size={28} />
                  </div>
                  <div className="quests-list">
                    {QUESTS.map((q) => {
                      const claimed = game.claimed.includes(q.id),
                        ready = q.progress(game) >= q.target;
                      return (
                        <article
                          className={`quest-row ${claimed ? "claimed" : ""}`}
                          key={q.id}
                        >
                          <span className="quest-symbol">
                            {claimed ? (
                              <Check size={22} />
                            ) : (
                              <ScrollText size={22} />
                            )}
                          </span>
                          <div>
                            <h3>{q.title}</h3>
                            <p>{q.description}</p>
                            <Cost cost={q.reward} />
                            <span className="fine-print">+{q.xp} XP</span>
                          </div>
                          <button
                            className={
                              ready && !claimed ? "primary" : "secondary"
                            }
                            disabled={claimed || !ready}
                            onClick={() => perform({ type: "claim", id: q.id })}
                          >
                            {claimed
                              ? "Collected"
                              : ready
                                ? "Claim reward"
                                : `${Math.min(q.progress(game), q.target)}/${q.target} complete`}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  <div className="achievements-heading">
                    <Trophy size={23} />
                    <h2>A shelf for small victories</h2>
                    <span>
                      {ACHIEVEMENTS.filter((a) => a.test(game)).length}/
                      {ACHIEVEMENTS.length} earned
                    </span>
                  </div>
                  <div className="achievements-grid">
                    {ACHIEVEMENTS.map((a) => (
                      <article
                        className={`achievement ${a.test(game) ? "earned" : ""}`}
                        key={a.title}
                      >
                        <Trophy size={24} />
                        <h3>{a.title}</h3>
                        <p>{a.text}</p>
                        <span>
                          {a.test(game)
                            ? "Achievement earned"
                            : "Keep adventuring"}
                        </span>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
            {page === "arena" && (
              <Signal
                feed={feed}
                now={now}
                onDetails={() => setModal("signal")}
              />
            )}
          </>
        )}
        <footer>
          <span>
            SQUEEK KINGDOM<span className="footer-divider">·</span>A small
            world. A grand adventure.
          </span>
          <div>
            <button className="text-button" onClick={() => setModal("help")}>
              How to play
            </button>
            <span className="save-indicator">
              <Save size={13} />
              {saved ? "Saved locally" : "Save unavailable"}
            </span>
            <button
              className="text-button"
              aria-label="Export kingdom save"
              onClick={exportSave}
            >
              <Download size={14} />
            </button>
          </div>
        </footer>
      </main>
      <div className="notification" role="status" aria-live="polite">
        {notice && (
          <>
            <span className={notice.error ? "notice-error" : "notice-success"}>
              {notice.error ? <CircleHelp size={20} /> : <Check size={20} />}
            </span>
            <span>{notice.text}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <X size={17} />
            </button>
          </>
        )}
      </div>
      {modal && (
        <Dialog
          title={
            modal === "hero"
              ? "Choose your tiny champion"
              : modal === "build"
                ? "Build a little greatness"
                : modal === "help"
                  ? "Welcome to Squeek Kingdom"
                  : modal === "signal"
                    ? "The hamster behind the signal"
                    : BUILDINGS[modal].name
          }
          onClose={() => setModal(null)}
          wide={modal === "hero" || modal === "build"}
        >
          {modal === "hero" ? (
            <>
              <p className="muted">
                One kingdom, four ways to adventure. You can change your hero
                anytime.
              </p>
              <div className="hero-grid">
                {HEROES.map((h) => (
                  <button
                    key={h.name}
                    className={`hero-choice ${game.hero === h.name ? "selected" : ""}`}
                    aria-pressed={game.hero === h.name}
                    onClick={() => {
                      perform({ type: "hero", hero: h.name });
                      setModal(null);
                    }}
                  >
                    <span
                      className="hero-choice-art"
                      style={{ background: `${h.color}22` }}
                    >
                      <Hamster hero={h.name} size={96} />
                    </span>
                    <strong>{h.name}</strong>
                    <span>{h.title}</span>
                    <small>{h.description}</small>
                    {game.hero === h.name && (
                      <span className="selected-label">
                        <Check size={14} />
                        Your hero
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : modal === "build" ? (
            <>
              <p className="muted">
                Build on an empty plot or upgrade a favorite. Your castle sets
                the level cap.
              </p>
              <div className="build-grid">
                {(Object.keys(BUILDINGS) as Building[]).map((id) => (
                  <button
                    className="build-choice"
                    key={id}
                    onClick={() => setModal(id)}
                  >
                    <BuildingArt id={id} size={90} />
                    <div>
                      <h3>{BUILDINGS[id].name}</h3>
                      <span>
                        {game.buildings[id]
                          ? `Level ${game.buildings[id]} · Upgrade`
                          : "Empty plot · Build"}
                      </span>
                      <Cost cost={costFor(game, id)} />
                    </div>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            </>
          ) : modal === "help" ? (
            <div className="help-content">
              <Hamster size={90} />
              <p className="identity-line">
                Build your empire. Race with the hamster. Survive the rounds.
              </p>
              <ol>
                <li>
                  <strong>Choose a hero.</strong> Explorer gathers more, Miner
                  produces more, Engineer builds for less, and Warrior takes
                  less damage.
                </li>
                <li>
                  <strong>Gather and build.</strong> Gather every 8 seconds.
                  Your castle, farm and other buildings produce resources every
                  15 seconds, including up to 4 hours while you are away.
                </li>
                <li>
                  <strong>Make something useful.</strong> Build a workshop,
                  craft items, and claim quest rewards to earn XP. Each 100 XP
                  grants a level.
                </li>
                <li>
                  <strong>Explore and survive.</strong> Take three turns in
                  Mosswood or defend against beetles. Choices spend resources
                  and affect health.
                </li>
                <li>
                  <strong>Run a little race.</strong> Use three boosts in a
                  20-second sprint. Live wheel challenges use fresh official
                  measurements and register a local crystal bonus after the
                  600-second round settles.
                </li>
              </ol>
              <p>
                Game resources are fictional, local to this device, and have no
                monetary value. There is no multiplayer, trading, betting or
                transaction flow. Wallets and NFT portraits are optional.
              </p>
              <div className="save-tools">
                <h3>Keep your kingdom</h3>
                <p>
                  Progress saves in this browser. Export a backup before
                  changing devices or clearing site storage.
                </p>
                <button className="secondary" onClick={exportSave}>
                  <Download size={16} />
                  Export save
                </button>
                <label className="secondary file-label">
                  Import save
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      importSave(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {importError && (
                  <p className="error-note" role="alert">
                    {importError}
                  </p>
                )}
              </div>
              <a
                className="external-link"
                href="https://docs.squeekchain.com"
                target="_blank"
                rel="noreferrer"
              >
                Official SqueekChain documentation
                <ExternalLink size={14} />
              </a>
            </div>
          ) : modal === "signal" ? (
            <SignalDetails feed={feed} />
          ) : (
            <BuildingPanel
              id={modal}
              game={game}
              perform={perform}
              onNavigate={go}
              onClose={() => setModal(null)}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
function Cost({ cost }: { cost: Partial<Resources> }) {
  return (
    <span className="cost">
      {Object.entries(cost).map(([r, n]) => (
        <span key={r}>
          <ResourceIcon id={r as keyof Resources} size={16} />
          <span>
            {n}
            <span className="sr-only"> {r}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
function BuildingPanel({
  id,
  game,
  perform,
  onNavigate,
  onClose,
}: {
  id: Building;
  game: GameState;
  perform: (a: Action) => boolean;
  onNavigate: (p: Page) => void;
  onClose: () => void;
}) {
  const b = BUILDINGS[id],
    current = game.buildings[id],
    cost = costFor(game, id);
  const capped = current >= b.max,
    castleLimit = id !== "castle" && current >= game.buildings.castle,
    requires = b.requires && !game.buildings[b.requires];
  return (
    <div className="building-panel">
      <div className="building-showcase">
        <BuildingArt id={id} size={160} />
        <span>
          {current ? `Level ${current} of ${b.max}` : "A little possibility"}
        </span>
      </div>
      <p>{b.description}</p>
      <div className="building-state">
        <strong>
          {capped
            ? "Fully upgraded"
            : current
              ? `Upgrade to level ${current + 1}`
              : "Build on this plot"}
        </strong>
        {!capped && <Cost cost={cost} />}
      </div>
      {castleLimit && (
        <p className="notice-inline">
          Upgrade Acorn Castle to level {current + 1} first.
        </p>
      )}
      {requires && (
        <p className="notice-inline">
          Build the {BUILDINGS[b.requires!].name} first.
        </p>
      )}
      {!canAfford(game, cost) && !capped && (
        <p className="fine-print">
          Gather supplies or let your kingdom produce more resources.
        </p>
      )}
      <button
        className="primary full"
        disabled={capped || castleLimit || !!requires || !canAfford(game, cost)}
        onClick={() => {
          if (perform({ type: "build", id })) onClose();
        }}
      >
        <Hammer size={17} />
        {capped
          ? "Fully upgraded"
          : current
            ? `Upgrade ${b.name}`
            : `Build ${b.name}`}
      </button>
      {current > 0 &&
        (id === "workshop" || id === "laboratory" || id === "arena") && (
          <button
            className="secondary full"
            onClick={() => {
              onClose();
              onNavigate(id === "arena" ? "arena" : "inventory");
            }}
          >
            Open {id === "arena" ? "race arena" : "crafting bench"}
            <ArrowRight size={16} />
          </button>
        )}
      <p className="fine-print">
        Building levels improve production or arena pace. The castle sets the
        upgrade cap. All costs use local game resources.
      </p>
    </div>
  );
}
function MissionView({
  game,
  perform,
}: {
  game: GameState;
  perform: (a: Action) => boolean;
}) {
  const m = game.mission!;
  return (
    <div className="active-mission">
      <div className="mission-status">
        <Hamster hero={game.hero} size={90} />
        <div>
          <h3>{m.kind === "explore" ? "Mosswood trail" : "Defend at dusk"}</h3>
          <p>
            {m.kind === "explore" ? "Stage" : "Wave"} {m.turn + 1} of 3
          </p>
          <div className="health-label">
            <Heart size={16} />
            {m.hp} / 100 health
          </div>
          <div className="health-track">
            <i style={{ width: `${m.hp}%` }} />
          </div>
        </div>
      </div>
      <div className="mission-log">
        {m.log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <h3>
        {m.kind === "explore"
          ? [
              "A stream blocks the trail.",
              "The canopy grows dark.",
              "A crystal glade is just ahead.",
            ][m.turn]
          : [
              "The beetles reach the gate.",
              "A second wave circles the farm.",
              "The beetle captain advances.",
            ][m.turn]}
      </h3>
      <p>
        Choose a move. Each choice clears one stage and changes your health and
        supplies.
      </p>
      <div className="mission-options">
        <button
          className="secondary"
          disabled={game.resources.wood < 8}
          onClick={() => perform({ type: "choice", choice: 0 })}
        >
          <Shield size={22} />
          <strong>
            {m.kind === "explore"
              ? "Build a safe crossing"
              : "Build a barricade"}
          </strong>
          <span>8 wood · Low damage · +8 stone</span>
        </button>
        <button
          className="secondary"
          onClick={() => perform({ type: "choice", choice: 1 })}
        >
          <Axe size={22} />
          <strong>
            {m.kind === "explore" ? "Follow the fireflies" : "Lead the charge"}
          </strong>
          <span>No cost · High damage · Gold + crystals</span>
        </button>
        <button
          className="secondary"
          disabled={game.resources.food < 4}
          onClick={() => perform({ type: "choice", choice: 2 })}
        >
          <Footprints size={22} />
          <strong>
            {m.kind === "explore"
              ? "Forage the clearing"
              : "Scout a hidden path"}
          </strong>
          <span>4 food · Medium damage · Wood + food</span>
        </button>
      </div>
      <div className="mission-items">
        <button
          className="secondary"
          disabled={game.inventory.potion < 1}
          onClick={() => perform({ type: "use", id: "potion" })}
        >
          <FlaskConical size={16} />
          Heal 35 health ({game.inventory.potion})
        </button>
        <button
          className="secondary"
          disabled={game.inventory.armor < 1 || m.armored}
          onClick={() => perform({ type: "use", id: "armor" })}
        >
          <Shield size={16} />
          {m.armored
            ? "Armor equipped"
            : `Equip armor (${game.inventory.armor})`}
        </button>
        <button
          className="text-button"
          onClick={() => perform({ type: "retreat" })}
        >
          Return to kingdom
        </button>
      </div>
    </div>
  );
}
