import { CARDS, CARD_META } from "./cards-data.js";
import { initializeInteractiveMotion, refreshInteractiveMotion } from "./ui-motion.js";

const DECK_SIZE = 8;
const VARIABLE_ELIXIR_ESTIMATE = 4;
const COLLECTION_API_BASE = "/api";
const PLAYER_TAG_STORAGE_KEY = "deckforge_player_tag";
const MIN_LEVEL_STORAGE_KEY = "deckforge_min_level";
const PLAYSTYLE_STORAGE_KEY = "deckforge_playstyle";
const PINNED_DECK_STORAGE_KEY = "deckforge_pinned_deck";
const HISTORY_STORAGE_KEY = "deckforge_history";
const STORAGE_API_BASE = "/api/storage";
const MAX_HISTORY_ITEMS = 30;
const MAX_CARD_LEVEL = 16;
const DECK_EXPLORER_FAVORITES_KEY = "deckforge_explorer_favorites";
const DECK_EXPLORER_API = "/api/decks/explorer";
const CARD_ICONS_API = "/api/cards/icons";
const STATUS_API = "/api/status";
const CHATBOT_PING_API = "/api/status/chatbot-ping";
const COACH_CHAT_API = "/api/chat/coach";
const CHAT_SESSION_STORAGE_KEY = "deckforge_chat_session_id";
const STATUS_REFRESH_INTERVAL_MS = 30000;
const APP_BUILD_LABEL = "local-dev";

const ROLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "base", label: "Base" },
  { id: "evolution", label: "Evolution" },
  { id: "hero", label: "Hero" },
  { id: "champion", label: "Champion" },
  { id: "win_condition", label: "Win Condition" },
  { id: "spell", label: "Spell" },
  { id: "air_defense", label: "Air Defense" },
  { id: "building", label: "Building" },
  { id: "cycle", label: "Cycle" }
];

const WIN_CONDITION_SLUGS = new Set([
  "balloon",
  "battle-ram",
  "giant",
  "goblin-barrel",
  "goblin-drill",
  "goblin-giant",
  "graveyard",
  "hog-rider",
  "lava-hound",
  "miner",
  "mortar",
  "ram-rider",
  "royal-giant",
  "royal-hogs",
  "skeleton-barrel",
  "wall-breakers",
  "x-bow",
  "elixir-golem",
  "golem",
  "mega-knight",
  "rune-giant"
]);

const AIR_DEFENSE_SLUGS = new Set([
  "archer-queen",
  "archers",
  "baby-dragon",
  "bats",
  "dart-goblin",
  "electro-dragon",
  "electro-wizard",
  "executioner",
  "firecracker",
  "flying-machine",
  "hunter",
  "ice-wizard",
  "inferno-dragon",
  "inferno-tower",
  "magic-archer",
  "mega-minion",
  "minions",
  "minion-horde",
  "mother-witch",
  "musketeer",
  "phoenix",
  "princess",
  "skeleton-dragons",
  "tesla",
  "wizard",
  "zappies",
  "electro-spirit"
]);

const TANK_SLUGS = new Set([
  "electro-giant",
  "giant",
  "goblin-giant",
  "golem",
  "ice-golem",
  "knight",
  "lava-hound",
  "mega-knight",
  "monk",
  "pekka",
  "rune-giant",
  "royal-giant",
  "skeleton-king"
]);

const CYCLE_SLUGS = new Set([
  "bats",
  "electro-spirit",
  "fire-spirit",
  "goblins",
  "ice-spirit",
  "skeletons",
  "spear-goblins",
  "zap",
  "giant-snowball",
  "the-log",
  "barbarian-barrel",
  "rage"
]);

const BIG_SPELL_SLUGS = new Set(["fireball", "poison", "rocket", "lightning"]);

const SWARM_CLEAR_SLUGS = new Set([
  "arrows",
  "barbarian-barrel",
  "baby-dragon",
  "bomber",
  "bowler",
  "electro-dragon",
  "executioner",
  "fire-spirit",
  "firecracker",
  "fireball",
  "giant-snowball",
  "poison",
  "royal-delivery",
  "the-log",
  "tornado",
  "valkyrie",
  "void",
  "wizard",
  "zap"
]);

const RESET_SLUGS = new Set(["electro-spirit", "electro-dragon", "electro-wizard", "zap", "zappies"]);

const SPLASH_SLUGS = new Set([
  "baby-dragon",
  "bomber",
  "bowler",
  "dark-prince",
  "executioner",
  "firecracker",
  "valkyrie",
  "witch",
  "wizard"
]);

const VARIANT_ORDER = {
  base: 0,
  evolution: 1,
  hero: 2
};

const PRETTY_VARIANT = {
  base: "Base",
  evolution: "Evolution",
  hero: "Hero"
};

const DECK_TEMPLATES = [
  {
    name: "Hog EQ Cycle",
    tags: ["cycle", "control"],
    slugs: ["hog-rider", "earthquake", "the-log", "firecracker", "cannon", "skeletons", "ice-spirit", "knight"],
    note: "Fast cycle, strong into buildings and medium-weight decks."
  },
  {
    name: "Royal Giant Control",
    tags: ["control", "anti-air"],
    slugs: ["royal-giant", "fisherman", "hunter", "fireball", "the-log", "skeletons", "electro-spirit", "goblin-cage"],
    note: "Reliable ladder deck with strong defense and easy pressure windows."
  },
  {
    name: "Lava Balloon",
    tags: ["beatdown", "air"],
    slugs: ["lava-hound", "balloon", "miner", "tombstone", "arrows", "fireball", "mega-minion", "skeleton-dragons"],
    note: "Best when opponents are light on anti-air and building control."
  },
  {
    name: "P.E.K.K.A Bridge Spam",
    tags: ["control", "counterpush"],
    slugs: ["pekka", "battle-ram", "bandit", "magic-archer", "electro-wizard", "poison", "zap", "royal-ghost"],
    note: "Great into heavy tanks and punishes overcommitments quickly."
  },
  {
    name: "X-Bow Cycle",
    tags: ["control", "siege", "cycle"],
    slugs: ["x-bow", "tesla", "archers", "knight", "skeletons", "ice-spirit", "fireball", "the-log"],
    note: "High-skill siege option that rewards tight defense and rotation."
  },
  {
    name: "Giant Graveyard",
    tags: ["beatdown", "graveyard"],
    slugs: ["giant", "graveyard", "baby-dragon", "bowler", "barbarian-barrel", "tornado", "skeleton-army", "night-witch"],
    note: "Stable beatdown pressure with strong splash support for graveyard pushes."
  }
];

const elements = {
  actionAggroBtn: document.getElementById("actionAggroBtn"),
  actionAnalyzeBtn: document.getElementById("actionAnalyzeBtn"),
  actionPushBtn: document.getElementById("actionPushBtn"),
  actionSafeBtn: document.getElementById("actionSafeBtn"),
  actionUpgradeBtn: document.getElementById("actionUpgradeBtn"),
  avgElixir: document.getElementById("avgElixir"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  chatLog: document.getElementById("chatLog"),
  clearCollectionBtn: document.getElementById("clearCollectionBtn"),
  clearDeckBtn: document.getElementById("clearDeckBtn"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  coachAnalyzeBtn: document.getElementById("coachAnalyzeBtn"),
  coachCardsBtn: document.getElementById("coachCardsBtn"),
  comparisonOutput: document.getElementById("comparisonOutput"),
  compareDeckA: document.getElementById("compareDeckA"),
  compareDeckB: document.getElementById("compareDeckB"),
  compareDeckBtn: document.getElementById("compareDeckBtn"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
  coverageList: document.getElementById("coverageList"),
  datasetSummary: document.getElementById("datasetSummary"),
  deckSize: document.getElementById("deckSize"),
  deckSlots: document.getElementById("deckSlots"),
  filterBar: document.getElementById("filterBar"),
  generateShareCardBtn: document.getElementById("generateShareCardBtn"),
  historyList: document.getElementById("historyList"),
  loadCollectionBtn: document.getElementById("loadCollectionBtn"),
  loadProfileBtn: document.getElementById("loadProfileBtn"),
  minLevelInput: document.getElementById("minLevelInput"),
  ownedCardsCount: document.getElementById("ownedCardsCount"),
  ownedCardsGrid: document.getElementById("ownedCardsGrid"),
  ownedCardsSearchInput: document.getElementById("ownedCardsSearchInput"),
  ownedOnlyToggle: document.getElementById("ownedOnlyToggle"),
  ownedSummary: document.getElementById("ownedSummary"),
  pinCurrentDeckBtn: document.getElementById("pinCurrentDeckBtn"),
  pinnedDeckOutput: document.getElementById("pinnedDeckOutput"),
  playerProfileContent: document.getElementById("playerProfileContent"),
  playerTagInput: document.getElementById("playerTagInput"),
  playstyleSelect: document.getElementById("playstyleSelect"),
  randomDeckBtn: document.getElementById("randomDeckBtn"),
  savedProfilesSelect: document.getElementById("savedProfilesSelect"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  searchInput: document.getElementById("searchInput"),
  shareCardOutput: document.getElementById("shareCardOutput"),
  statusMessage: document.getElementById("statusMessage"),
  suggestionList: document.getElementById("suggestionList"),
  catalogCount: document.getElementById("catalogCount"),
  catalogGrid: document.getElementById("catalogGrid"),
  catalogInsights: document.getElementById("catalogInsights"),
  catalogInsightsStatus: document.getElementById("catalogInsightsStatus"),
  catalogQuickFilters: document.getElementById("catalogQuickFilters"),
  collectionAvgLevel: document.getElementById("collectionAvgLevel"),
  collectionLowLevelList: document.getElementById("collectionLowLevelList"),
  collectionProgressEvo: document.getElementById("collectionProgressEvo"),
  collectionProgressHero: document.getElementById("collectionProgressHero"),
  collectionProgressOwned: document.getElementById("collectionProgressOwned"),
  insightSafeDeckBtn: document.getElementById("insightSafeDeckBtn"),
  insightUpgradeBtn: document.getElementById("insightUpgradeBtn"),
  deckDetailContent: document.getElementById("deckDetailContent"),
  deckDetailModal: document.getElementById("deckDetailModal"),
  deckExplorerArchetypeSelect: document.getElementById("deckExplorerArchetypeSelect"),
  deckExplorerFavoritesToggle: document.getElementById("deckExplorerFavoritesToggle"),
  deckExplorerGrid: document.getElementById("deckExplorerGrid"),
  deckExplorerMeta: document.getElementById("deckExplorerMeta"),
  deckExplorerSearchInput: document.getElementById("deckExplorerSearchInput"),
  deckExplorerSourceSelect: document.getElementById("deckExplorerSourceSelect"),
  deckExplorerTagSelect: document.getElementById("deckExplorerTagSelect"),
  deckModalCloseBtn: document.getElementById("deckModalCloseBtn"),
  refreshDeckExplorerBtn: document.getElementById("refreshDeckExplorerBtn"),
  refreshStatusBtn: document.getElementById("refreshStatusBtn"),
  statusActivityList: document.getElementById("statusActivityList"),
  statusApiState: document.getElementById("statusApiState"),
  statusApiTime: document.getElementById("statusApiTime"),
  statusBuildLabel: document.getElementById("statusBuildLabel"),
  statusChatState: document.getElementById("statusChatState"),
  statusChatTime: document.getElementById("statusChatTime"),
  statusDeckState: document.getElementById("statusDeckState"),
  statusDeckTime: document.getElementById("statusDeckTime"),
  syncDeckDbBtn: document.getElementById("syncDeckDbBtn")
};

const state = {
  activeFilter: "all",
  collectionLoaded: false,
  coachRecommendations: [],
  compareSelectionA: "current",
  compareSelectionB: "rec-1",
  deck: [],
  evolutionLevels: new Map(),
  historyEntries: [],
  lastAnalysisText: "",
  lastDeckBuildText: "",
  lastUpgradeText: "",
  loadedPlayerName: "",
  loadedPlayerTag: "",
  minOwnedLevel: 1,
  ownedCards: [],
  ownedCardsSearch: "",
  ownedLevels: new Map(),
  ownedOnly: false,
  pinnedDeck: null,
  playerProfile: null,
  playstylePreference: "no_preference",
  savedProfiles: [],
  search: "",
  catalogQuickFilter: "all",
  catalogArtBySlug: new Map(),
  statusTimer: null,
  statusPollTimer: null,
  statusSnapshot: null,
  deckExplorer: {
    decks: [],
    sections: { topPlayerDecks: [], popularDecks: [], metaDecks: [] },
    meta: null,
    search: "",
    archetype: "all",
    sourceType: "all",
    tag: "all",
    favoritesOnly: false
  },
  deckExplorerFavorites: new Set(),
  chatContext: {
    lastIntent: "none",
    lastMessageAt: "",
    lastTrophyHint: 0,
    sessionId: "",
  }
};

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeCssUrl(value) {
  return String(value || "")
    .trim()
    .replace(/["'()\\\n\r]/g, "");
}

function catalogArtKey(slug, variant = "base") {
  return `${String(slug || "").trim()}::${String(variant || "base").trim()}`;
}

function inferRoles(card) {
  const roles = new Set();

  if (card.type === "Spell") {
    roles.add("spell");
  }
  if (card.type === "Building") {
    roles.add("building");
    roles.add("defense");
  }

  if (WIN_CONDITION_SLUGS.has(card.slug)) {
    roles.add("win_condition");
  }
  if (AIR_DEFENSE_SLUGS.has(card.slug)) {
    roles.add("air_defense");
  }
  if (TANK_SLUGS.has(card.slug)) {
    roles.add("tank");
  }
  if (CYCLE_SLUGS.has(card.slug) || (!card.variable_elixir && card.elixir <= 2)) {
    roles.add("cycle");
  }
  if (BIG_SPELL_SLUGS.has(card.slug)) {
    roles.add("big_spell");
    roles.add("spell");
  }
  if (SWARM_CLEAR_SLUGS.has(card.slug)) {
    roles.add("swarm_clear");
  }
  if (RESET_SLUGS.has(card.slug)) {
    roles.add("reset");
  }
  if (SPLASH_SLUGS.has(card.slug)) {
    roles.add("splash");
  }

  if (card.rarity === "Champion") {
    roles.add("champion");
  }
  if (card.variant === "evolution") {
    roles.add("evolution");
  }
  if (card.variant === "hero") {
    roles.add("hero");
  }

  if (roles.size === 0) {
    roles.add("support");
  }

  return [...roles];
}

const ENRICHED_CARDS = CARDS.map((card) => {
  const roles = inferRoles(card);
  const searchBlob = [
    card.name,
    card.slug,
    card.type,
    card.rarity,
    card.variant,
    ...roles
  ]
    .join(" ")
    .toLowerCase();

  return {
    ...card,
    roles,
    searchBlob
  };
}).sort((a, b) => {
  if (a.name !== b.name) {
    return a.name.localeCompare(b.name);
  }
  return (VARIANT_ORDER[a.variant] ?? 99) - (VARIANT_ORDER[b.variant] ?? 99);
});

const BASE_CARDS = ENRICHED_CARDS.filter((card) => card.variant === "base");
const HERO_VARIANT_SLUGS = new Set(ENRICHED_CARDS.filter((card) => card.variant === "hero").map((card) => card.slug));
const EVO_VARIANT_SLUGS = new Set(ENRICHED_CARDS.filter((card) => card.variant === "evolution").map((card) => card.slug));
const HERO_VARIANT_BY_SLUG = new Map(ENRICHED_CARDS.filter((card) => card.variant === "hero").map((card) => [card.slug, card]));
const EVO_VARIANT_BY_SLUG = new Map(ENRICHED_CARDS.filter((card) => card.variant === "evolution").map((card) => [card.slug, card]));
const BASE_RARITY_BY_SLUG = new Map(BASE_CARDS.map((card) => [card.slug, card.rarity]));
const BASE_CARD_BY_SLUG = new Map(BASE_CARDS.map((card) => [card.slug, card]));
const cardById = new Map(ENRICHED_CARDS.map((card) => [card.id, card]));
const baseNameToSlug = new Map();

for (const card of BASE_CARDS) {
  baseNameToSlug.set(normalizeName(card.name), card.slug);
}

const API_NAME_ALIASES = {
  snowball: "giant-snowball"
};

function getCard(id) {
  return cardById.get(id);
}

function deckCards() {
  return state.deck.map(getCard).filter(Boolean);
}

function deckSlugSet() {
  return new Set(deckCards().map((card) => card.slug));
}

function roleLabel(role) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rarityClassName(rarity) {
  const key = String(rarity || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `rarity-${key || "unknown"}`;
}

function formatElixir(card) {
  return card.variable_elixir ? "Var" : String(card.elixir);
}

function numericElixir(card) {
  return card.variable_elixir ? VARIABLE_ELIXIR_ESTIMATE : card.elixir;
}

function compareCardsByElixirDesc(a, b) {
  const elixirDiff = numericElixir(b) - numericElixir(a);
  if (elixirDiff !== 0) {
    return elixirDiff;
  }

  const nameDiff = String(a.name || "").localeCompare(String(b.name || ""));
  if (nameDiff !== 0) {
    return nameDiff;
  }

  const variantA = VARIANT_ORDER[a.variant] ?? 99;
  const variantB = VARIANT_ORDER[b.variant] ?? 99;
  return variantA - variantB;
}

function catalogCardArtBySlug() {
  const map = new Map(state.catalogArtBySlug || []);

  for (const entry of state.ownedCards) {
    const slug = String(entry?.slug || "").trim() || apiNameToSlug(entry?.name || "");
    const iconUrl = String(entry?.iconUrl || "").trim();
    if (!slug || !iconUrl) {
      continue;
    }
    // Prefer icon URLs from live collection payload when available.
    map.set(catalogArtKey(slug, "base"), iconUrl);
  }

  return map;
}

function cardLevel(card) {
  if (!state.collectionLoaded) {
    return 0;
  }
  return state.ownedLevels.get(card.slug) ?? 0;
}

function cardEvolutionLevel(card) {
  if (!state.collectionLoaded || card.variant !== "evolution") {
    return 0;
  }
  return state.evolutionLevels.get(card.slug) ?? 0;
}

function cardOwned(card) {
  if (!state.collectionLoaded) {
    return true;
  }
  if (card.variant === "evolution") {
    return cardEvolutionLevel(card) > 0;
  }
  return state.ownedLevels.has(card.slug);
}

function cardMeetsLevel(card) {
  if (!state.collectionLoaded) {
    return true;
  }
  return cardLevel(card) >= state.minOwnedLevel;
}

function cardUsable(card) {
  return cardOwned(card) && cardMeetsLevel(card);
}

function setStatus(message, tone = "info") {
  if (state.statusTimer) {
    clearTimeout(state.statusTimer);
    state.statusTimer = null;
  }

  elements.statusMessage.textContent = message;

  if (tone === "bad") {
    elements.statusMessage.style.color = "var(--bad)";
  } else if (tone === "warn") {
    elements.statusMessage.style.color = "var(--warn)";
  } else {
    elements.statusMessage.style.color = "var(--accent-2)";
  }

  if (message) {
    state.statusTimer = setTimeout(() => {
      elements.statusMessage.textContent = "";
    }, 2800);
  }
}


function coercePlaystyle(value) {
  const normalized = String(value || "no_preference").trim().toLowerCase();
  const allowed = new Set(["aggressive", "control", "beatdown", "cycle", "bait", "no_preference"]);
  return allowed.has(normalized) ? normalized : "no_preference";
}

function isoNow() {
  return new Date().toISOString();
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function currentCleanTag() {
  const tag = state.loadedPlayerTag || elements.playerTagInput?.value || "";
  try {
    return sanitizePlayerTag(tag);
  } catch (_error) {
    return "";
  }
}

function isCompleteDeck(cards) {
  return Array.isArray(cards) && cards.length === DECK_SIZE;
}

function buildDeckSnapshotFromCards(cards, name = "Deck", source = "manual") {
  return {
    name,
    source,
    cardIds: cards.map((card) => card.id),
    createdAt: isoNow()
  };
}

function cardsFromSnapshot(snapshot) {
  const ids = Array.isArray(snapshot?.cardIds) ? snapshot.cardIds : [];
  return ids.map(getCard).filter(Boolean);
}

function formatPlaystyleLabel(playstyle) {
  const label = coercePlaystyle(playstyle).replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function persistPlaystyleLocal() {
  localStorage.setItem(PLAYSTYLE_STORAGE_KEY, state.playstylePreference);
}

function persistPinnedDeckLocal() {
  if (!state.pinnedDeck) {
    localStorage.removeItem(PINNED_DECK_STORAGE_KEY);
    return;
  }
  localStorage.setItem(PINNED_DECK_STORAGE_KEY, JSON.stringify(state.pinnedDeck));
}

function persistHistoryLocal() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.historyEntries.slice(0, MAX_HISTORY_ITEMS)));
}

function loadLocalCoachState() {
  state.playstylePreference = coercePlaystyle(localStorage.getItem(PLAYSTYLE_STORAGE_KEY) || "no_preference");
  if (elements.playstyleSelect) {
    elements.playstyleSelect.value = state.playstylePreference;
  }

  const rawPinned = localStorage.getItem(PINNED_DECK_STORAGE_KEY);
  const pinned = rawPinned ? safeJsonParse(rawPinned, null) : null;
  if (pinned && Array.isArray(pinned.cardIds) && pinned.cardIds.length) {
    state.pinnedDeck = pinned;
  }

  const rawHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
  const history = rawHistory ? safeJsonParse(rawHistory, []) : [];
  if (Array.isArray(history)) {
    state.historyEntries = history.slice(0, MAX_HISTORY_ITEMS);
  }

  const storedSessionId = String(localStorage.getItem(CHAT_SESSION_STORAGE_KEY) || "").trim();
  if (storedSessionId) {
    state.chatContext.sessionId = storedSessionId;
  }
}

function formatHistoryTime(isoString) {
  const date = new Date(isoString || "");
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function addHistoryEntry(type, title, detail = "") {
  const entry = {
    type: String(type || "note"),
    title: String(title || ""),
    detail: String(detail || ""),
    createdAt: isoNow()
  };

  state.historyEntries = [entry, ...state.historyEntries].slice(0, MAX_HISTORY_ITEMS);
  persistHistoryLocal();
  renderHistory();
  void pushHistoryRemote(entry);
}

function renderHistory() {
  if (!elements.historyList) {
    return;
  }

  if (!state.historyEntries.length) {
    elements.historyList.innerHTML = '<p class="meta">No history yet.</p>';
    return;
  }

  elements.historyList.innerHTML = state.historyEntries
    .map((entry) => `
      <article class="history-item">
        <h5>${escapeHtml(entry.title || "Untitled")}</h5>
        <p>${escapeHtml(entry.detail || "")}</p>
        <p class="history-time">${escapeHtml(formatHistoryTime(entry.createdAt))}</p>
      </article>
    `)
    .join("");
}

async function storageApiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${STORAGE_API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Storage API error ${response.status}`);
    }

    return payload || {};
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshSavedProfilesList() {
  if (!elements.savedProfilesSelect) {
    return;
  }

  try {
    const payload = await storageApiRequest("/profiles", { method: "GET" });
    const profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
    state.savedProfiles = profiles;

    const current = elements.savedProfilesSelect.value;
    const options = ['<option value="">Saved profiles...</option>'];

    for (const item of profiles) {
      const label = `${item.name || "Unknown"} (${item.tag || ""})`;
      options.push(`<option value="${escapeHtml(String(item.tag || "").replace("#", ""))}">${escapeHtml(label)}</option>`);
    }

    elements.savedProfilesSelect.innerHTML = options.join("");

    if (current) {
      elements.savedProfilesSelect.value = current;
    }
  } catch (_error) {
    // Silent fallback; local-first still works.
  }
}

function rebuildOwnershipFromCards(cards) {
  const levels = new Map();
  const evolutionLevels = new Map();

  for (const card of cards) {
    const slug = apiNameToSlug(card?.name);
    const level = Number(card?.level ?? 0);
    const evolutionLevel = Number(card?.evolutionLevel ?? 0);

    if (!slug) {
      continue;
    }

    if (Number.isFinite(level) && level > 0) {
      levels.set(slug, Math.max(level, levels.get(slug) ?? 0));
    }

    if (Number.isFinite(evolutionLevel) && evolutionLevel > 0) {
      evolutionLevels.set(slug, Math.max(evolutionLevel, evolutionLevels.get(slug) ?? 0));
    }
  }

  return { levels, evolutionLevels };
}

function applySavedProfileRecord(record) {
  const profile = record?.playerProfile;
  const cards = Array.isArray(record?.cards) ? record.cards : [];

  if (!profile || !cards.length) {
    throw new Error("Saved profile is incomplete.");
  }

  const rebuilt = rebuildOwnershipFromCards(cards);
  if (!rebuilt.levels.size) {
    throw new Error("Saved cards could not be mapped to this dataset.");
  }

  state.playerProfile = profile;
  state.collectionLoaded = true;
  state.ownedCards = buildOwnedCardDisplayEntries(cards);
  state.ownedLevels = rebuilt.levels;
  state.evolutionLevels = rebuilt.evolutionLevels;
  state.ownedOnly = true;
  state.loadedPlayerName = String(profile?.name || "").trim();
  state.loadedPlayerTag = String(profile?.tag || record?.playerTag || "").trim();
  state.ownedCardsSearch = "";

  if (elements.playerTagInput && state.loadedPlayerTag) {
    elements.playerTagInput.value = state.loadedPlayerTag;
  }

  if (elements.ownedOnlyToggle) {
    elements.ownedOnlyToggle.checked = true;
  }

  if (elements.ownedCardsSearchInput) {
    elements.ownedCardsSearchInput.value = "";
  }

  state.playstylePreference = coercePlaystyle(record?.preferredPlaystyle || state.playstylePreference);
  if (elements.playstyleSelect) {
    elements.playstyleSelect.value = state.playstylePreference;
  }
  persistPlaystyleLocal();

  if (record?.favoriteDeck && Array.isArray(record.favoriteDeck.cardIds)) {
    state.pinnedDeck = record.favoriteDeck;
    persistPinnedDeckLocal();
  }

  if (Array.isArray(record?.history)) {
    state.historyEntries = record.history.slice(0, MAX_HISTORY_ITEMS);
    persistHistoryLocal();
  }

  pruneDeckForCollection();
  renderAll();
  renderPinnedDeck();
  renderHistory();
  setStatus("Saved profile loaded.", "info");
}

async function saveCurrentProfile() {
  if (!state.collectionLoaded || !state.playerProfile) {
    setStatus("Load a collection before saving a profile.", "warn");
    return;
  }

  const cleanTag = currentCleanTag();
  if (!cleanTag) {
    setStatus("Player tag is missing.", "warn");
    return;
  }

  const payload = {
    playerProfile: state.playerProfile,
    cards: state.ownedCards,
    favoriteDeck: state.pinnedDeck,
    preferredPlaystyle: state.playstylePreference,
    recentAnalysis: state.lastAnalysisText || null,
    history: state.historyEntries.slice(0, MAX_HISTORY_ITEMS)
  };

  try {
    await storageApiRequest(`/profile/${encodeURIComponent(cleanTag)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStatus("Profile saved locally.", "info");
    addHistoryEntry("profile", "Profile saved", `${state.playerProfile.name || "Player"} (${state.loadedPlayerTag})`);
    await refreshSavedProfilesList();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save profile.";
    setStatus(`Profile save failed: ${msg}`, "bad");
  }
}

async function loadSavedProfileByTag(cleanTag) {
  try {
    const payload = await storageApiRequest(`/profile/${encodeURIComponent(cleanTag)}`, { method: "GET" });
    applySavedProfileRecord(payload?.profile || null);
    addHistoryEntry("profile", "Profile loaded", `Loaded #${cleanTag}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load saved profile.";
    setStatus(`Load failed: ${msg}`, "bad");
  }
}

async function pushHistoryRemote(entry) {
  const cleanTag = currentCleanTag();
  if (!cleanTag) {
    return;
  }

  try {
    await storageApiRequest(`/history/${encodeURIComponent(cleanTag)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry })
    });
  } catch (_error) {
    // Silent; local history remains available.
  }
}

async function clearRemoteHistory() {
  const cleanTag = currentCleanTag();
  if (!cleanTag) {
    return;
  }

  try {
    await storageApiRequest(`/history/${encodeURIComponent(cleanTag)}`, {
      method: "DELETE"
    });
  } catch (_error) {
    // Silent fallback.
  }
}

async function pinDeckRemote(favoriteDeck) {
  const cleanTag = currentCleanTag();
  if (!cleanTag) {
    return;
  }

  try {
    await storageApiRequest(`/pin/${encodeURIComponent(cleanTag)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favoriteDeck })
    });
  } catch (_error) {
    // Silent fallback.
  }
}

function computeDeckScoreBreakdown(cards = deckCards()) {
  const metrics = calculateMetrics(cards);
  const spellCount = metrics.spells;
  const winConditions = metrics.winConditions;

  let synergy = 40;
  synergy += winConditions >= 1 && winConditions <= 2 ? 20 : -18;
  synergy += spellCount >= 1 && spellCount <= 2 ? 12 : -10;
  synergy += metrics.avgElixir >= 2.8 && metrics.avgElixir <= 4.4 ? 10 : -8;
  synergy += metrics.cycleCards >= 2 ? 8 : 0;

  let defense = 40;
  defense += metrics.airDefense >= 2 ? 18 : metrics.airDefense === 1 ? 5 : -15;
  defense += metrics.buildings >= 1 ? 12 : -2;
  defense += countDeckRole(cards, "splash") >= 1 ? 8 : 0;
  defense += countDeckRole(cards, "reset") >= 1 ? 7 : 0;

  let antiAir = 30 + metrics.airDefense * 16;

  let spellBalance = 35;
  spellBalance += spellCount >= 1 && spellCount <= 2 ? 20 : spellCount === 0 ? -25 : -10;
  spellBalance += countDeckRole(cards, "big_spell") >= 1 ? 10 : -2;
  spellBalance += countDeckRole(cards, "swarm_clear") >= 1 ? 10 : -5;

  let cycleSmoothness = 45;
  cycleSmoothness += metrics.avgElixir <= 4.4 ? 12 : -10;
  cycleSmoothness += metrics.cycleCards >= 2 ? 16 : metrics.cycleCards === 1 ? 5 : -8;

  let ladderPracticality = 45;
  if (state.collectionLoaded && metrics.size) {
    ladderPracticality += Math.max(-15, (metrics.avgLevel - 12) * 4);
    ladderPracticality += metrics.minLevel >= state.minOwnedLevel ? 8 : -8;
  }
  ladderPracticality += winConditions >= 1 ? 8 : -12;
  ladderPracticality += metrics.airDefense >= 2 ? 6 : -6;

  const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

  const breakdown = {
    synergy: clampScore(synergy),
    defense: clampScore(defense),
    antiAir: clampScore(antiAir),
    spellBalance: clampScore(spellBalance),
    cycleSmoothness: clampScore(cycleSmoothness),
    ladderPracticality: clampScore(ladderPracticality)
  };

  const overall = Math.round(
    breakdown.synergy * 0.26 +
      breakdown.defense * 0.2 +
      breakdown.antiAir * 0.14 +
      breakdown.spellBalance * 0.14 +
      breakdown.cycleSmoothness * 0.12 +
      breakdown.ladderPracticality * 0.14
  );

  breakdown.overall = clampScore(overall);
  return breakdown;
}

function scoreLabel(overall, metrics) {
  if (overall >= 82 && metrics.winConditions >= 1 && metrics.airDefense >= 2) {
    return "Meta-safe";
  }
  if (overall >= 72 && metrics.winConditions >= 1) {
    return "Ladder-safe";
  }
  if (overall >= 62) {
    return "Strong but flawed";
  }
  if (overall >= 50) {
    return "Off-meta but playable";
  }
  return "Risky";
}

function levelWarnings(cards, metrics) {
  if (!state.collectionLoaded || !cards.length) {
    return [];
  }

  const warnings = [];
  const avg = metrics.avgLevel;

  const underleveledSpells = cards.filter((card) => (card.type === "Spell" || card.roles.includes("spell")) && cardLevel(card) <= avg - 1.5);
  if (underleveledSpells.length) {
    warnings.push(`Your ${underleveledSpells[0].name} is underleveled compared to the rest of the deck.`);
  }

  if (metrics.minLevel <= avg - 1.5) {
    warnings.push("Your levels are carrying parts of this deck more than the structure.");
  }

  const winCard = cards.find((card) => card.roles.includes("win_condition"));
  if (winCard && cardLevel(winCard) >= 15) {
    const lowSupports = cards.filter((card) => !card.roles.includes("win_condition") && cardLevel(card) <= cardLevel(winCard) - 2);
    if (lowSupports.length) {
      warnings.push(`This shell is clean, but ${lowSupports[0].name} is a low-level support bottleneck.`);
    }
  }

  if (!warnings.length) {
    warnings.push("No major card-level warning right now.");
  }

  return warnings;
}

function riskyMatchups(cards, metrics) {
  const risky = [];
  if (metrics.avgElixir > 4.5) {
    risky.push("Fast cycle decks that force awkward rotations.");
  }
  if (countDeckRole(cards, "reset") === 0) {
    risky.push("Inferno defense when your spell cycle is late.");
  }
  if (metrics.buildings === 0) {
    risky.push("Hog/Ram pressure if you miss timing on stop troops.");
  }
  return risky.length ? risky : ["Execution-heavy mirror matchups where one overcommit decides game flow."];
}

function mistakesToAvoid(cards, metrics) {
  const mistakes = [];
  if (metrics.avgElixir > 4.4) {
    mistakes.push("Do not overcommit in single elixir.");
  }
  if (metrics.winConditions > 1) {
    mistakes.push("Do not split pressure blindly; pick one lane plan.");
  }
  if (metrics.airDefense < 2) {
    mistakes.push("Do not use your best anti-air card for early cycle unless forced.");
  }
  mistakes.push("Track opponent spell cycle before stacking support troops.");
  return mistakes.slice(0, 4);
}

function compareScoreRow(label, leftValue, rightValue) {
  const delta = rightValue - leftValue;
  const sign = delta > 0 ? "+" : "";
  return `${label}: ${leftValue} -> ${rightValue} (${sign}${delta})`;
}

function availableDeckSources() {
  const sources = [];

  const current = deckCards();
  if (isCompleteDeck(current)) {
    sources.push({ id: "current", label: "Current Deck", cards: current });
  }

  if (state.pinnedDeck && Array.isArray(state.pinnedDeck.cardIds)) {
    const pinnedCards = cardsFromSnapshot(state.pinnedDeck);
    if (isCompleteDeck(pinnedCards)) {
      sources.push({ id: "pinned", label: `Pinned: ${state.pinnedDeck.name || "Deck"}`, cards: pinnedCards });
    }
  }

  state.coachRecommendations.forEach((rec, index) => {
    if (isCompleteDeck(rec.cards)) {
      sources.push({ id: `rec-${index + 1}`, label: `Recommendation ${index + 1}: ${rec.name}`, cards: rec.cards });
    }
  });

  return sources;
}

function renderComparisonSelectors() {
  if (!elements.compareDeckA || !elements.compareDeckB) {
    return;
  }

  const sources = availableDeckSources();
  if (!sources.length) {
    elements.compareDeckA.innerHTML = '<option value="">No deck available</option>';
    elements.compareDeckB.innerHTML = '<option value="">No deck available</option>';
    return;
  }

  const options = sources
    .map((source) => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.label)}</option>`)
    .join("");

  elements.compareDeckA.innerHTML = options;
  elements.compareDeckB.innerHTML = options;

  const hasA = sources.some((source) => source.id === state.compareSelectionA);
  const hasB = sources.some((source) => source.id === state.compareSelectionB);

  elements.compareDeckA.value = hasA ? state.compareSelectionA : sources[0].id;
  elements.compareDeckB.value = hasB ? state.compareSelectionB : sources[Math.min(1, sources.length - 1)].id;
}

function deckSourceById(id) {
  return availableDeckSources().find((source) => source.id === id) || null;
}

function compareSelectedDecks() {
  const leftId = elements.compareDeckA?.value || "";
  const rightId = elements.compareDeckB?.value || "";
  state.compareSelectionA = leftId;
  state.compareSelectionB = rightId;

  const left = deckSourceById(leftId);
  const right = deckSourceById(rightId);

  if (!left || !right) {
    if (elements.comparisonOutput) {
      elements.comparisonOutput.textContent = "Choose two valid decks first.";
    }
    return;
  }

  const leftMetrics = calculateMetrics(left.cards);
  const rightMetrics = calculateMetrics(right.cards);
  const leftScore = computeDeckScoreBreakdown(left.cards);
  const rightScore = computeDeckScoreBreakdown(right.cards);

  const lines = [];
  lines.push(`Comparing: ${left.label} vs ${right.label}`);
  lines.push("");
  lines.push(compareScoreRow("Overall", leftScore.overall, rightScore.overall));
  lines.push(compareScoreRow("Synergy", leftScore.synergy, rightScore.synergy));
  lines.push(compareScoreRow("Defense", leftScore.defense, rightScore.defense));
  lines.push(compareScoreRow("Anti-Air", leftScore.antiAir, rightScore.antiAir));
  lines.push(compareScoreRow("Spell Balance", leftScore.spellBalance, rightScore.spellBalance));
  lines.push(compareScoreRow("Cycle", leftScore.cycleSmoothness, rightScore.cycleSmoothness));
  lines.push(compareScoreRow("Ladder Practicality", leftScore.ladderPracticality, rightScore.ladderPracticality));
  lines.push("");

  const saferDeck = rightScore.defense + rightScore.ladderPracticality >= leftScore.defense + leftScore.ladderPracticality ? right.label : left.label;
  const aggressiveDeck = rightMetrics.avgElixir >= leftMetrics.avgElixir ? right.label : left.label;

  lines.push(`What improved: ${rightScore.overall >= leftScore.overall ? right.label : left.label} is structurally cleaner.`);
  lines.push(`What got weaker: ${rightScore.antiAir < leftScore.antiAir ? right.label : left.label} has thinner anti-air coverage.`);
  lines.push(`Safer choice: ${saferDeck}.`);
  lines.push(`More aggressive choice: ${aggressiveDeck}.`);
  lines.push(`Recommendation: ${rightScore.overall > leftScore.overall ? right.label : left.label} gives a better ladder floor right now.`);

  if (elements.comparisonOutput) {
    elements.comparisonOutput.textContent = lines.join("\n");
  }

  addHistoryEntry("compare", "Deck comparison", `${left.label} vs ${right.label}`);
}

function buildUpgradeBuckets(cards) {
  const details = cards
    .map((card) => {
      let importance = 1;
      if (card.roles.includes("win_condition")) importance += 4;
      if (card.type === "Spell" || card.roles.includes("spell")) importance += 3;
      if (card.roles.includes("air_defense")) importance += 2;
      if (card.roles.includes("building")) importance += 1.5;

      const level = state.collectionLoaded ? cardLevel(card) : 11;
      return { card, level, importance };
    })
    .sort((a, b) => b.importance - a.importance || a.level - b.level || a.card.name.localeCompare(b.card.name));

  const must = [];
  const soon = [];
  const later = [];

  for (const entry of details) {
    const label = `${entry.card.name} (L${entry.level})`;

    if (entry.importance >= 4 && entry.level <= 14) {
      must.push(label);
    } else if (entry.importance >= 2.5 && entry.level <= 15) {
      soon.push(label);
    } else {
      later.push(label);
    }
  }

  return {
    must: must.slice(0, 4),
    soon: soon.slice(0, 5),
    later: later.slice(0, 6)
  };
}

function upgradeBucketsText(buckets) {
  return [
    "Must Upgrade Now",
    ...(buckets.must.length ? buckets.must.map((item, idx) => `${idx + 1}. ${item}`) : ["1. None critical right now"]),
    "",
    "Good Soon",
    ...(buckets.soon.length ? buckets.soon.map((item, idx) => `${idx + 1}. ${item}`) : ["1. No medium-priority upgrades"]),
    "",
    "Don't Waste Gold Yet",
    ...(buckets.later.length ? buckets.later.map((item, idx) => `${idx + 1}. ${item}`) : ["1. None"]) 
  ].join("\n");
}

function updateCoachResultsMeta(text) {
  if (elements.coachResultsMeta) {
    elements.coachResultsMeta.textContent = text;
  }
}

function setAnalysisOutput(text) {
  state.lastAnalysisText = String(text || "");
  if (elements.analysisOutput) {
    elements.analysisOutput.textContent = state.lastAnalysisText || "Run analysis or upgrade path to see details.";
  }
}

function renderPinnedDeck() {
  if (!elements.pinnedDeckOutput) {
    return;
  }

  if (!state.pinnedDeck || !Array.isArray(state.pinnedDeck.cardIds)) {
    elements.pinnedDeckOutput.textContent = "No pinned deck yet.";
    return;
  }

  const cards = cardsFromSnapshot(state.pinnedDeck);
  if (!cards.length) {
    elements.pinnedDeckOutput.textContent = "Pinned deck references cards not in current dataset.";
    return;
  }

  const metrics = calculateMetrics(cards);
  const score = computeDeckScoreBreakdown(cards);
  const label = scoreLabel(score.overall, metrics);

  const lines = [];
  lines.push(`${state.pinnedDeck.name || "Pinned Deck"} • ${label}`);
  lines.push(`Average Elixir: ${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)} • Score: ${score.overall}`);
  lines.push("");
  lines.push(cards.map((card) => cardCoachLabel(card)).join(", "));

  elements.pinnedDeckOutput.textContent = lines.join("\n");
}

function buildShareSummary(deckName, cards) {
  const metrics = calculateMetrics(cards);
  const score = computeDeckScoreBreakdown(cards);
  const label = scoreLabel(score.overall, metrics);
  const winPair = identifyWinConditionPair(cards);

  const lines = [];
  lines.push(`${deckName} • ${label}`);
  lines.push(`Avg Elixir: ${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)} • Score: ${score.overall}`);
  lines.push(`Win Condition: ${winPair.main ? winPair.main.name : "None"}`);
  lines.push(cards.map((card, index) => `${index + 1}. ${cardCoachLabel(card)}`).join("\n"));

  return lines.join("\n");
}

function preferredDeckForShare() {
  const current = deckCards();
  if (isCompleteDeck(current)) {
    return { name: "Current Deck", cards: current };
  }

  if (state.pinnedDeck) {
    const cards = cardsFromSnapshot(state.pinnedDeck);
    if (isCompleteDeck(cards)) {
      return { name: state.pinnedDeck.name || "Pinned Deck", cards };
    }
  }

  const rec = state.coachRecommendations.find((item) => isCompleteDeck(item.cards));
  if (rec) {
    return { name: rec.name, cards: rec.cards };
  }

  return null;
}

async function copyShareSummary() {
  const target = preferredDeckForShare();
  if (!target) {
    setStatus("No full deck available to share.", "warn");
    return;
  }

  const text = buildShareSummary(target.name, target.cards);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error("Clipboard API unavailable");
    }
    setStatus("Share summary copied.", "info");
    addHistoryEntry("share", "Copied share summary", target.name);
  } catch (_error) {
    setStatus("Copy failed for share summary.", "bad");
  }
}

function generateShareCard() {
  if (!elements.shareCardOutput) {
    return;
  }

  const target = preferredDeckForShare();
  if (!target) {
    elements.shareCardOutput.textContent = "No complete deck to generate share card.";
    return;
  }

  const summary = buildShareSummary(target.name, target.cards);
  elements.shareCardOutput.textContent = summary;
  addHistoryEntry("share", "Generated share card", target.name);
}

function renderCoachDeckCards(options = state.coachRecommendations) {
  if (!elements.coachDeckCards) {
    renderComparisonSelectors();
    return;
  }

  if (!Array.isArray(options) || !options.length) {
    elements.coachDeckCards.innerHTML = '<p class="meta">Run a one-tap mode or ask the coach to build decks.</p>';
    updateCoachResultsMeta("No recommendations yet");
    renderComparisonSelectors();
    refreshInteractiveMotion();
    return;
  }

  updateCoachResultsMeta(`${options.length} recommendation(s) ready`);

  elements.coachDeckCards.innerHTML = options
    .map((option, index) => {
      const cards = option.cards || [];
      if (!cards.length) {
        return `
          <article class="coach-deck-card">
            <div class="coach-deck-head">
              <div>
                <h4>${escapeHtml(option.name || `Deck ${index + 1}`)}</h4>
                <p class="coach-deck-sub">No legal deck data</p>
              </div>
            </div>
          </article>
        `;
      }

      const metrics = calculateMetrics(cards);
      const score = computeDeckScoreBreakdown(cards);
      const verdict = scoreLabel(score.overall, metrics);
      const labelClass = verdict.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const archetype = inferArchetype(cards, metrics, option.tags || []);
      const winPair = identifyWinConditionPair(cards);
      const matchups = matchupOverview(cards, metrics);
      const risky = riskyMatchups(cards, metrics);
      const plans = gamePlanNotes(archetype, metrics);
      const buckets = buildUpgradeBuckets(cards);
      const warnings = levelWarnings(cards, metrics);

      const summaryDeck = cards.map((card) => cardCoachLabel(card)).join(", ");

      return `
        <article class="coach-deck-card">
          <div class="coach-deck-head">
            <div>
              <h4>${escapeHtml(option.name || `Deck ${index + 1}`)}</h4>
              <p class="coach-deck-sub">${escapeHtml(archetype)} • Avg ${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)} • Main ${escapeHtml(winPair.main ? winPair.main.name : "None")}</p>
            </div>
            <span class="label-pill ${escapeHtml(labelClass)}">${escapeHtml(verdict)}</span>
          </div>

          <div class="score-chip-row">
            <span class="score-chip">Overall ${score.overall}</span>
            <span class="score-chip">Synergy ${score.synergy}</span>
            <span class="score-chip">Defense ${score.defense}</span>
            <span class="score-chip">Anti-Air ${score.antiAir}</span>
            <span class="score-chip">Spell ${score.spellBalance}</span>
            <span class="score-chip">Cycle ${score.cycleSmoothness}</span>
            <span class="score-chip">Practical ${score.ladderPracticality}</span>
          </div>

          <p class="deck-line"><strong>Deck:</strong> ${escapeHtml(summaryDeck)}</p>

          <div class="coach-mini-grid">
            <article class="coach-mini-card">
              <h5>Matchups</h5>
              <ul>
                <li><strong>Good:</strong> ${escapeHtml(matchups.good.join("; "))}</li>
                <li><strong>Bad:</strong> ${escapeHtml(matchups.bad.join("; "))}</li>
                <li><strong>Risky:</strong> ${escapeHtml(risky.join("; "))}</li>
              </ul>
            </article>

            <article class="coach-mini-card">
              <h5>How To Play</h5>
              <ul>
                <li><strong>Opening:</strong> ${escapeHtml(openingPlaySuggestions(cards))}</li>
                <li><strong>Early:</strong> ${escapeHtml(plans.early)}</li>
                <li><strong>Mid:</strong> ${escapeHtml(plans.mid)}</li>
                <li><strong>Double:</strong> ${escapeHtml(plans.double)}</li>
              </ul>
            </article>

            <article class="coach-mini-card">
              <h5>Upgrade Advice</h5>
              <ul>
                <li><strong>Must:</strong> ${escapeHtml(buckets.must.join(", ") || "None")}</li>
                <li><strong>Soon:</strong> ${escapeHtml(buckets.soon.join(", ") || "None")}</li>
                <li><strong>Wait:</strong> ${escapeHtml(buckets.later.join(", ") || "None")}</li>
              </ul>
            </article>

            <article class="coach-mini-card">
              <h5>Level Warnings</h5>
              <ul>
                ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
              </ul>
            </article>
          </div>

          <div class="coach-actions">
            <button class="btn subtle" data-load-reco="${index + 1}" type="button">Load This Deck</button>
            <button class="btn ghost" data-pin-reco="${index + 1}" type="button">Pin</button>
            <button class="btn ghost" data-compare-a="rec-${index + 1}" type="button">Set Compare A</button>
            <button class="btn ghost" data-compare-b="rec-${index + 1}" type="button">Set Compare B</button>
            <button class="btn ghost" data-share-reco="${index + 1}" type="button">Copy Deck Summary</button>
          </div>
        </article>
      `;
    })
    .join("");

  renderComparisonSelectors();
  refreshInteractiveMotion();
}

function setPinnedDeckFromCards(cards, name, source = "manual") {
  if (!isCompleteDeck(cards)) {
    setStatus("A pinned deck must have 8 cards.", "warn");
    return;
  }

  state.pinnedDeck = buildDeckSnapshotFromCards(cards, name, source);
  persistPinnedDeckLocal();
  renderPinnedDeck();
  setStatus("Deck pinned.", "info");
  addHistoryEntry("pin", "Pinned deck", name);
  void pinDeckRemote(state.pinnedDeck);
}

async function runOneTapMode(mode) {
  if (mode === "analyze") {
    const result = explainCurrentDeck();
    setAnalysisOutput(result);
    addHistoryEntry("analysis", "Analyzed current deck", "Quick verdict generated.");
    return;
  }

  if (mode === "upgrade") {
    const result = formatUpgradeAdviceResponse();
    state.lastUpgradeText = result;
    setAnalysisOutput(result);
    pushChatMessage("bot", result);
    setStatus("Best upgrade path generated. Check Deck Coach Chat for full highest-to-lowest order.", "info");
    addHistoryEntry("upgrade", "Upgrade path generated", "Ranked from highest to lowest priority.");
    return;
  }

  let query = "best deck";
  if (mode === "safe") {
    query = "safest deck control";
  } else if (mode === "aggressive") {
    query = "most aggressive deck beatdown";
  } else if (mode === "push") {
    query = "best deck for pushing ladder";
  }

  const response = formatDeckBuildResponse(query);
  state.lastDeckBuildText = response;
  setAnalysisOutput(response);
  renderCoachDeckCards(state.coachRecommendations);
  renderCollectionInsights();

  const main = state.coachRecommendations[0];
  if (main?.cards?.length) {
    addHistoryEntry("recommend", `${mode} deck recommendation`, `${main.name}`);
  }
}

function syncPlaystyleFromUI() {
  if (!elements.playstyleSelect) {
    return;
  }
  state.playstylePreference = coercePlaystyle(elements.playstyleSelect.value);
  elements.playstyleSelect.value = state.playstylePreference;
  persistPlaystyleLocal();
}

function renderFilters() {
  elements.filterBar.innerHTML = "";

  for (const filter of ROLE_FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-pill${state.activeFilter === filter.id ? " active" : ""}`;
    button.dataset.filter = filter.id;
    button.textContent = filter.label;
    elements.filterBar.appendChild(button);
  }
}

function matchesFilter(card) {
  if (state.activeFilter === "all") {
    return true;
  }

  if (state.activeFilter === "base" || state.activeFilter === "evolution" || state.activeFilter === "hero") {
    return card.variant === state.activeFilter;
  }

  if (state.activeFilter === "champion") {
    return card.rarity === "Champion" && card.variant === "base";
  }

  return card.roles.includes(state.activeFilter);
}

function averageOwnedCollectionLevel() {
  if (!state.collectionLoaded || !state.ownedLevels.size) {
    return 0;
  }

  let sum = 0;
  for (const level of state.ownedLevels.values()) {
    sum += Number(level || 0);
  }
  return sum / state.ownedLevels.size;
}

function preferredCardsForInsights() {
  const current = deckCards();
  if (isCompleteDeck(current)) {
    return {
      label: "Current deck",
      cards: current
    };
  }

  const main = state.coachRecommendations[0];
  if (main?.cards && isCompleteDeck(main.cards)) {
    return {
      label: main.name || "Best main deck",
      cards: main.cards
    };
  }

  return {
    label: "",
    cards: current
  };
}

function catalogCoreSlugSet() {
  const slugs = new Set(deckCards().map((card) => card.slug));
  const main = state.coachRecommendations[0];
  if (main?.cards?.length) {
    for (const card of main.cards) {
      slugs.add(card.slug);
    }
  }
  return slugs;
}

function catalogFilterLabel(mode) {
  const labels = {
    all: "All",
    underleveled: "Underleveled",
    deck_core: "Deck-Core",
    highest_level: "Highest Level",
    missing_evo: "Missing Evolutions"
  };
  return labels[mode] || "All";
}

function applyCatalogQuickFilter(cards) {
  const mode = state.catalogQuickFilter;

  if (mode === "all") {
    return [...cards].sort(compareCardsByElixirDesc);
  }

  if (mode === "highest_level") {
    return [...cards].sort((a, b) => cardLevel(b) - cardLevel(a) || compareCardsByElixirDesc(a, b));
  }

  if (mode === "underleveled") {
    if (!state.collectionLoaded) {
      return [];
    }

    const avg = averageOwnedCollectionLevel();
    const threshold = Math.max(1, Math.floor(avg - 1));

    return cards
      .filter((card) => cardOwned(card) && cardLevel(card) > 0 && cardLevel(card) <= threshold)
      .sort((a, b) => cardLevel(a) - cardLevel(b) || compareCardsByElixirDesc(a, b));
  }

  if (mode === "deck_core") {
    const coreSlugs = catalogCoreSlugSet();
    if (!coreSlugs.size) {
      return [];
    }

    return cards
      .filter((card) => coreSlugs.has(card.slug))
      .sort((a, b) => cardLevel(b) - cardLevel(a) || compareCardsByElixirDesc(a, b));
  }

  if (mode === "missing_evo") {
    if (!state.collectionLoaded) {
      return [];
    }

    return cards
      .filter((card) => {
        if (card.variant === "evolution") {
          return !cardOwned(card);
        }
        if (card.variant !== "base") {
          return false;
        }
        return EVO_VARIANT_SLUGS.has(card.slug) && (state.evolutionLevels.get(card.slug) ?? 0) <= 0;
      })
      .sort(compareCardsByElixirDesc);
  }

  return [...cards].sort(compareCardsByElixirDesc);
}

function visibleCards() {
  const query = state.search.trim().toLowerCase();

  const scoped = ENRICHED_CARDS.filter((card) => {
    if (!matchesFilter(card)) {
      return false;
    }

    if (state.collectionLoaded && state.ownedOnly && !cardUsable(card)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return card.searchBlob.includes(query);
  });

  return applyCatalogQuickFilter(scoped);
}

function renderCatalog() {
  const cards = visibleCards();
  const slugSet = deckSlugSet();
  const artBySlug = catalogCardArtBySlug();

  elements.catalogCount.textContent = `${cards.length} shown`;
  elements.catalogGrid.innerHTML = "";

  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    const quickLabel = catalogFilterLabel(state.catalogQuickFilter);
    empty.textContent = quickLabel === "All"
      ? "No cards match this search/filter."
      : `No cards match quick filter: ${quickLabel}.`;
    elements.catalogGrid.appendChild(empty);
    return;
  }

  for (const card of cards) {
    const inDeck = slugSet.has(card.slug);
    const deckFull = state.deck.length >= DECK_SIZE;
    const owned = cardOwned(card);
    const level = cardLevel(card);
    const evoLevel = cardEvolutionLevel(card);
    const meetsLevel = cardMeetsLevel(card);

    const disabled = inDeck || deckFull || !owned || !meetsLevel;

    let buttonText = "Add To Deck";
    if (inDeck) {
      buttonText = "In Deck";
    } else if (!owned) {
      buttonText = card.variant === "evolution" ? "Evo Locked" : "Not Owned";
    } else if (!meetsLevel) {
      buttonText = `Lvl < ${state.minOwnedLevel}`;
    } else if (deckFull) {
      buttonText = "Deck Full";
    }

    const article = document.createElement("article");
    const variantCardClass = card.variant === "evolution"
      ? "variant-card-evolution"
      : card.variant === "hero"
        ? "variant-card-hero"
        : "";
    article.className = `card-item ${rarityClassName(card.rarity)} motion-tilt ${variantCardClass}`.trim();
    const cardArtUrl = artBySlug.get(catalogArtKey(card.slug, card.variant)) || artBySlug.get(catalogArtKey(card.slug, "base")) || "";
    if (cardArtUrl) {
      article.classList.add("has-card-art");
      article.style.setProperty("--card-art-url", `url("${safeCssUrl(cardArtUrl)}")`);
    }
    const name = escapeHtml(card.name);
    const cardIcon = cardArtUrl
      ? `<span class="catalog-card-icon"><img src="${escapeHtml(cardArtUrl)}" alt="${name}" loading="lazy" /></span>`
      : "";
    const variantEffects = card.variant === "evolution"
      ? '<span class="variant-fx variant-fx-evolution" aria-hidden="true"></span><span class="variant-particles variant-particles-evolution" aria-hidden="true"></span>'
      : card.variant === "hero"
        ? '<span class="variant-fx variant-fx-hero" aria-hidden="true"></span><span class="variant-particles variant-particles-hero" aria-hidden="true"></span>'
        : "";

    const rolePills = card.roles
      .slice(0, 3)
      .map((role) => `<span class="role-tag">${roleLabel(role)}</span>`)
      .join("");

    const ownershipChips = [];
    if (state.collectionLoaded) {
      if (owned) {
        ownershipChips.push(`<span class="rarity-chip level">Lvl ${level}</span>`);
        if (card.variant === "evolution") {
          ownershipChips.push(`<span class="rarity-chip level">Evo ${evoLevel}</span>`);
        }
        if (!meetsLevel) {
          ownershipChips.push(`<span class="rarity-chip low-level">< L${state.minOwnedLevel}</span>`);
        }
      } else {
        ownershipChips.push(`<span class="rarity-chip unowned">${card.variant === "evolution" ? "Evo Locked" : "Not Owned"}</span>`);
      }
    }

    article.innerHTML = `
      ${variantEffects}
      <div class="card-title-row">
        <div class="card-title-head">
          ${cardIcon}
          <h4>${name}</h4>
        </div>
        <div class="card-chips">
          <span class="variant-chip ${card.variant}">${PRETTY_VARIANT[card.variant]}</span>
          <span class="rarity-chip">${card.rarity}</span>
          ${ownershipChips.join("")}
        </div>
      </div>
      <div class="card-meta">
        <span>${card.type}</span>
        <span class="elixir${card.variable_elixir ? " variable" : ""}">${formatElixir(card)}</span>
      </div>
      <div class="role-tags">${rolePills}</div>
      <button class="btn subtle" data-add-card="${card.id}" ${disabled ? "disabled" : ""}>${buttonText}</button>
    `;

    elements.catalogGrid.appendChild(article);
  }
}

function renderCatalogQuickFilters() {
  if (!elements.catalogQuickFilters) {
    return;
  }

  const chips = elements.catalogQuickFilters.querySelectorAll("button[data-catalog-quick]");
  chips.forEach((chip) => {
    const mode = chip.dataset.catalogQuick || "all";
    chip.classList.toggle("active", mode === state.catalogQuickFilter);
  });
}

function renderCollectionInsights() {
  if (!elements.catalogInsights) {
    return;
  }

  const owned = state.collectionLoaded ? state.ownedLevels.size : 0;
  const totalBase = Number(CARD_META.base_count || BASE_CARDS.length || 121);
  const evoCount = state.collectionLoaded ? state.evolutionLevels.size : 0;
  const heroCount = state.collectionLoaded
    ? [...HERO_VARIANT_SLUGS].filter((slug) => state.ownedLevels.has(slug)).length
    : 0;
  const avgOwned = averageOwnedCollectionLevel();

  if (elements.collectionProgressOwned) {
    elements.collectionProgressOwned.textContent = `${owned} / ${totalBase}`;
  }
  if (elements.collectionProgressEvo) {
    elements.collectionProgressEvo.textContent = `${evoCount}`;
  }
  if (elements.collectionProgressHero) {
    elements.collectionProgressHero.textContent = `${heroCount}`;
  }
  if (elements.collectionAvgLevel) {
    elements.collectionAvgLevel.textContent = state.collectionLoaded ? avgOwned.toFixed(1) : "0.0";
  }

  const visibleCount = visibleCards().length;
  if (elements.catalogInsightsStatus) {
    if (!state.collectionLoaded) {
      elements.catalogInsightsStatus.textContent = "Load your collection for deeper insights.";
    } else {
      elements.catalogInsightsStatus.textContent = `${visibleCount} cards visible • Quick mode: ${catalogFilterLabel(state.catalogQuickFilter)}`;
    }
  }

  if (elements.collectionLowLevelList) {
    const insightDeck = preferredCardsForInsights();
    if (!insightDeck.cards.length) {
      elements.collectionLowLevelList.innerHTML = '<li class="meta">Build or load a deck to see weak links.</li>';
    } else {
      const weakest = [...insightDeck.cards]
        .sort((a, b) => cardLevel(a) - cardLevel(b) || a.name.localeCompare(b.name))
        .slice(0, 3);

      elements.collectionLowLevelList.innerHTML = weakest
        .map((card) => {
          const level = cardLevel(card);
          const warning = state.collectionLoaded && avgOwned > 0 && level <= avgOwned - 1.5
            ? ' <span class="insight-warning">under target</span>'
            : "";
          return `<li><span>${escapeHtml(card.name)}</span><strong>L${level}</strong>${warning}</li>`;
        })
        .join("");
    }
  }

  renderCatalogQuickFilters();
}

function renderDeckSlots() {
  elements.deckSlots.innerHTML = "";

  for (let index = 0; index < DECK_SIZE; index += 1) {
    const cardId = state.deck[index];
    const card = getCard(cardId);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `deck-slot${card ? " filled" : ""} motion-tilt`;
    button.dataset.index = String(index);

    if (card) {
      let levelChip = "";
      if (state.collectionLoaded && cardOwned(card)) {
        levelChip = `<span class="rarity-chip level">Lvl ${cardLevel(card)}</span>`;
        if (card.variant === "evolution") {
          levelChip += `<span class="rarity-chip level">Evo ${cardEvolutionLevel(card)}</span>`;
        }
      }

      button.innerHTML = `
        <span class="slot-name">${card.name}</span>
        <div class="slot-chips">
          <span class="variant-chip ${card.variant}">${PRETTY_VARIANT[card.variant]}</span>
          <span class="rarity-chip">${card.rarity}</span>
          ${levelChip}
        </div>
        <span class="slot-hint">${formatElixir(card)} elixir - click to remove</span>
      `;
      button.title = `Remove ${card.name}`;
    } else {
      button.innerHTML = `
        <span class="slot-name">Empty Slot ${index + 1}</span>
        <span class="slot-hint">Click any card from the catalog</span>
      `;
      button.title = "Empty slot";
    }

    elements.deckSlots.appendChild(button);
  }
}

function calculateMetrics(cards = deckCards()) {
  const totals = {
    airDefense: 0,
    avgLevel: 0,
    buildings: 0,
    cycleCards: 0,
    elixir: 0,
    hasVariableElixir: false,
    levelSum: 0,
    maxLevel: 0,
    minLevel: Number.POSITIVE_INFINITY,
    size: cards.length,
    spells: 0,
    winConditions: 0
  };

  for (const card of cards) {
    totals.elixir += numericElixir(card);

    if (card.variable_elixir) {
      totals.hasVariableElixir = true;
    }

    if (card.roles.includes("win_condition")) {
      totals.winConditions += 1;
    }

    if (card.roles.includes("spell") || card.type === "Spell") {
      totals.spells += 1;
    }

    if (card.roles.includes("air_defense")) {
      totals.airDefense += 1;
    }

    if (card.roles.includes("building") || card.type === "Building") {
      totals.buildings += 1;
    }

    if (!card.variable_elixir && card.elixir <= 2) {
      totals.cycleCards += 1;
    } else if (card.roles.includes("cycle")) {
      totals.cycleCards += 1;
    }

    if (state.collectionLoaded) {
      const lvl = cardLevel(card);
      totals.levelSum += lvl;
      totals.maxLevel = Math.max(totals.maxLevel, lvl);
      totals.minLevel = Math.min(totals.minLevel, lvl);
    }
  }

  totals.avgLevel = totals.size && state.collectionLoaded ? totals.levelSum / totals.size : 0;

  return {
    ...totals,
    avgElixir: totals.size ? totals.elixir / totals.size : 0,
    minLevel: totals.minLevel === Number.POSITIVE_INFINITY ? 0 : totals.minLevel
  };
}

function renderStats(metrics) {
  elements.deckSize.textContent = `${metrics.size} / ${DECK_SIZE}`;
  elements.avgElixir.textContent = `${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)}`;
}

function coverageItem(title, note, stateClass) {
  return `
    <li class="coverage-item ${stateClass}">
      <span>${title}</span>
      <span class="coverage-note">${note}</span>
    </li>
  `;
}

function renderCoverage(metrics) {
  const items = [];

  if (metrics.winConditions >= 1) {
    items.push(coverageItem("Win Condition", `${metrics.winConditions} selected`, "good"));
  } else {
    items.push(coverageItem("Win Condition", "Add at least one", "bad"));
  }

  if (metrics.spells === 0) {
    items.push(coverageItem("Spell Count", "No spells selected", "bad"));
  } else if (metrics.spells <= 2) {
    items.push(coverageItem("Spell Count", `${metrics.spells} selected`, "good"));
  } else {
    items.push(coverageItem("Spell Count", `${metrics.spells} selected (heavy)`, "warn"));
  }

  if (metrics.airDefense >= 2) {
    items.push(coverageItem("Air Defense", `${metrics.airDefense} answers`, "good"));
  } else if (metrics.airDefense === 1) {
    items.push(coverageItem("Air Defense", "Only 1 answer", "warn"));
  } else {
    items.push(coverageItem("Air Defense", "No anti-air", "bad"));
  }

  if (metrics.cycleCards >= 2) {
    items.push(coverageItem("Cycle Speed", `${metrics.cycleCards} cheap cards`, "good"));
  } else {
    items.push(coverageItem("Cycle Speed", "Add 1-2 low-cost cards", "warn"));
  }

  if (metrics.buildings >= 1) {
    items.push(coverageItem("Defensive Building", `${metrics.buildings} selected`, "good"));
  } else {
    items.push(coverageItem("Defensive Building", "Optional but useful", "warn"));
  }

  if (metrics.size === 0) {
    items.push(coverageItem("Elixir Curve", "Start adding cards", "warn"));
  } else if (metrics.avgElixir >= 2.8 && metrics.avgElixir <= 4.3) {
    items.push(coverageItem("Elixir Curve", `${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)} balanced`, "good"));
  } else if (metrics.avgElixir >= 2.5 && metrics.avgElixir <= 4.8) {
    items.push(coverageItem("Elixir Curve", `${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)} can work`, "warn"));
  } else {
    items.push(coverageItem("Elixir Curve", `${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)} is extreme`, "bad"));
  }

  if (state.collectionLoaded) {
    if (metrics.size === 0) {
      items.push(coverageItem("Deck Levels", `Minimum target is L${state.minOwnedLevel}`, "warn"));
    } else if (metrics.minLevel >= state.minOwnedLevel) {
      items.push(
        coverageItem(
          "Deck Levels",
          `Min L${metrics.minLevel} • Avg L${metrics.avgLevel.toFixed(1)}`,
          "good"
        )
      );
    } else {
      items.push(
        coverageItem(
          "Deck Levels",
          `Min L${metrics.minLevel} below target L${state.minOwnedLevel}`,
          "bad"
        )
      );
    }
  }

  elements.coverageList.innerHTML = items.join("");
}

function scoreCandidate(card, metrics) {
  let score = 0;

  const needs = [];
  if (metrics.winConditions === 0) needs.push("win_condition");
  if (metrics.spells === 0) needs.push("spell");
  if (metrics.airDefense < 2) needs.push("air_defense");
  if (metrics.buildings === 0) needs.push("building");
  if (metrics.avgElixir > 4.3) needs.push("cycle");
  if (metrics.avgElixir < 2.8 && metrics.size >= 5) needs.push("tank");

  if (needs.length === 0) {
    needs.push(metrics.spells < 2 ? "spell" : "support");
  }

  for (const need of needs) {
    if (card.roles.includes(need)) {
      score += 3;
    }
    if (need === "spell" && card.type === "Spell") {
      score += 1;
    }
  }

  if (metrics.avgElixir > 4.1 && !card.variable_elixir && card.elixir <= 2) {
    score += 1;
  }
  if (metrics.size >= 7 && !card.variable_elixir && card.elixir >= 7) {
    score -= 1;
  }
  if (metrics.winConditions === 0 && card.roles.includes("win_condition")) {
    score += 2;
  }

  if (state.collectionLoaded) {
    score += Math.min(cardLevel(card), MAX_CARD_LEVEL) / 20;
  }

  if (card.variant === "base") {
    score += 0.3;
  }

  return score;
}

function renderSuggestions(metrics) {
  const slugSet = deckSlugSet();

  const suggestions = ENRICHED_CARDS
    .filter((card) => !slugSet.has(card.slug))
    .filter((card) => cardUsable(card))
    .map((card) => ({ card, score: scoreCandidate(card, metrics) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        numericElixir(a.card) - numericElixir(b.card) ||
        (VARIANT_ORDER[a.card.variant] ?? 99) - (VARIANT_ORDER[b.card.variant] ?? 99) ||
        a.card.name.localeCompare(b.card.name)
    )
    .slice(0, 6)
    .map((entry) => entry.card);

  elements.suggestionList.innerHTML = "";

  if (!suggestions.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = state.collectionLoaded
      ? "No usable suggestions at your current level filter."
      : "Deck looks stable. Try swapping one card to iterate.";
    elements.suggestionList.appendChild(empty);
    return;
  }

  for (const card of suggestions) {
    const node = document.createElement("article");
    node.className = "suggestion-item motion-tilt";
    let levelChip = "";
    if (state.collectionLoaded) {
      levelChip = `<span class="rarity-chip level">Lvl ${cardLevel(card)}</span>`;
      if (card.variant === "evolution") {
        levelChip += `<span class="rarity-chip level">Evo ${cardEvolutionLevel(card)}</span>`;
      }
    }
    node.innerHTML = `
      <h4>${card.name}</h4>
      <div class="card-meta">
        <span>${card.type}</span>
        <span class="elixir${card.variable_elixir ? " variable" : ""}">${formatElixir(card)}</span>
      </div>
      <div class="card-chips">${levelChip}</div>
      <button class="btn subtle" data-add-card="${card.id}" ${state.deck.length >= DECK_SIZE ? "disabled" : ""}>Add</button>
    `;
    elements.suggestionList.appendChild(node);
  }
}

function updateOwnedSummary() {
  if (!state.collectionLoaded) {
    elements.ownedSummary.textContent = "Collection not loaded";
    elements.ownedOnlyToggle.checked = false;
    elements.ownedOnlyToggle.disabled = true;
    return;
  }

  const totalOwned = state.ownedLevels.size;
  const eligibleCount = [...state.ownedLevels.values()].filter((level) => level >= state.minOwnedLevel).length;
  const evoUnlocked = state.evolutionLevels.size;
  const playerLabel = state.loadedPlayerName
    ? `${state.loadedPlayerName}${state.loadedPlayerTag ? ` (${state.loadedPlayerTag})` : ""}`
    : state.loadedPlayerTag;
  const prefix = playerLabel ? `${playerLabel} • ` : "";

  elements.ownedSummary.textContent = `${prefix}Owned ${totalOwned}/${CARD_META.base_count} • >=L${state.minOwnedLevel}: ${eligibleCount} • Evo unlocked: ${evoUnlocked}`;
  elements.ownedOnlyToggle.disabled = false;
}

function renderPlayerProfile() {
  if (!elements.playerProfileContent) {
    return;
  }

  if (!state.collectionLoaded || !state.playerProfile) {
    elements.playerProfileContent.innerHTML = '<p class="meta">No profile loaded</p>';
    return;
  }

  const profile = state.playerProfile;
  const arenaName = profile.arena || "Unknown Arena";

  elements.playerProfileContent.innerHTML = `
    <article class="profile-stat motion-tilt">
      <span class="profile-label">Player</span>
      <strong>${escapeHtml(profile.name || "Unknown")}</strong>
    </article>
    <article class="profile-stat motion-tilt">
      <span class="profile-label">Tag</span>
      <strong>${escapeHtml(profile.tag || "")}</strong>
    </article>
    <article class="profile-stat motion-tilt">
      <span class="profile-label">Trophies</span>
      <strong>${Number(profile.trophies ?? 0)}</strong>
    </article>
    <article class="profile-stat motion-tilt">
      <span class="profile-label">Best Trophies</span>
      <strong>${Number(profile.bestTrophies ?? 0)}</strong>
    </article>
    <article class="profile-stat profile-wide motion-tilt">
      <span class="profile-label">Arena</span>
      <strong>${escapeHtml(arenaName)}</strong>
    </article>
  `;
}

function filteredOwnedCards() {
  const query = state.ownedCardsSearch.trim().toLowerCase();
  if (!query) {
    return state.ownedCards;
  }

  return state.ownedCards.filter((card) => String(card?.name || "").toLowerCase().includes(query));
}

function buildOwnedCardDisplayEntries(baseCards = []) {
  const entries = [];

  for (const card of baseCards) {
    const level = Number(card?.level ?? 0);
    if (!Number.isFinite(level) || level <= 0) {
      continue;
    }

    const baseName = String(card?.name || "").trim();
    const slug = apiNameToSlug(baseName);
    const baseRarity = slug ? BASE_RARITY_BY_SLUG.get(slug) || "Unknown" : "Unknown";
    const baseMeta = slug ? BASE_CARD_BY_SLUG.get(slug) || null : null;
    const elixir = baseMeta ? numericElixir(baseMeta) : 0;

    entries.push({
      ...card,
      name: baseName,
      slug: slug || "",
      rarity: baseRarity,
      variant: "base",
      hasEvoVariant: Boolean(slug && EVO_VARIANT_SLUGS.has(slug)),
      hasHeroVariant: Boolean(slug && HERO_VARIANT_SLUGS.has(slug)),
      elixir
    });
  }

  return entries.sort((a, b) => Number(b.elixir ?? 0) - Number(a.elixir ?? 0) || Number(b.level ?? 0) - Number(a.level ?? 0) || a.name.localeCompare(b.name));
}

function renderOwnedCards() {
  if (!elements.ownedCardsGrid || !elements.ownedCardsCount) {
    return;
  }

  elements.ownedCardsGrid.classList.remove("is-loading-grid");

  if (!state.collectionLoaded || !state.ownedCards.length) {
    elements.ownedCardsCount.textContent = "0 cards";
    elements.ownedCardsGrid.innerHTML = '<p class="meta">Load a player tag to view owned cards.</p>';
    return;
  }

  const cards = filteredOwnedCards();
  elements.ownedCardsCount.textContent = `${cards.length}/${state.ownedCards.length} cards`;

  if (!cards.length) {
    elements.ownedCardsGrid.innerHTML = '<p class="meta">No owned cards match this search.</p>';
    return;
  }

  const artBySlug = catalogCardArtBySlug();

  elements.ownedCardsGrid.innerHTML = cards
    .map((card) => {
      const name = escapeHtml(card?.name || "Unknown");
      const iconUrl = String(card?.iconUrl || "").trim();
      const level = Number(card?.level ?? 0);
      const maxLevel = Number(card?.maxLevel ?? 0);
      const count = Number(card?.count ?? 0);
      const evolutionLevel = Number(card?.evolutionLevel ?? 0);
      const rarity = escapeHtml(card?.rarity || "Unknown");
      const rarityClass = rarityClassName(card?.rarity);
      const hasEvoVariant = Boolean(card?.hasEvoVariant);
      const hasHeroVariant = Boolean(card?.hasHeroVariant);
      const slug = String(card?.slug || "").trim() || apiNameToSlug(card?.name || "");
      const preferredVariant = hasHeroVariant ? "hero" : hasEvoVariant ? "evolution" : "base";
      const cardArtUrl = slug
        ? artBySlug.get(catalogArtKey(slug, preferredVariant)) || artBySlug.get(catalogArtKey(slug, "base")) || iconUrl
        : iconUrl;
      const variantCardClass = preferredVariant === "evolution"
        ? "variant-card-evolution"
        : preferredVariant === "hero"
          ? "variant-card-hero"
          : "";
      const hasCardArt = Boolean(cardArtUrl);
      const safeArtCss = hasCardArt ? safeCssUrl(cardArtUrl) : "";
      const variantEffects = preferredVariant === "evolution"
        ? '<span class="variant-fx variant-fx-evolution" aria-hidden="true"></span><span class="variant-particles variant-particles-evolution" aria-hidden="true"></span>'
        : preferredVariant === "hero"
          ? '<span class="variant-fx variant-fx-hero" aria-hidden="true"></span><span class="variant-particles variant-particles-hero" aria-hidden="true"></span>'
          : "";
      const articleClasses = `owned-card-item ${rarityClass} motion-tilt ${variantCardClass} ${hasCardArt ? "has-card-art" : ""}`.trim();

      const icon = hasCardArt
        ? `<img src="${escapeHtml(cardArtUrl)}" alt="${name}" loading="lazy" />`
        : `<div class="owned-card-fallback">${name.charAt(0)}</div>`;

      return `
        <article class="${articleClasses}" ${hasCardArt ? `style="--card-art-url: url('${safeArtCss}');"` : ""}>
          ${variantEffects}
          <div class="owned-card-top">
            <div class="owned-card-icon">${icon}</div>
            <h4 title="${name}">${name}</h4>
          </div>
          <div class="owned-card-chips">
            ${hasEvoVariant ? `<span class="variant-chip evolution">Evolution</span>` : ""}
            ${hasHeroVariant ? `<span class="variant-chip hero">Hero</span>` : ""}
            <span class="rarity-chip">${rarity}</span>
            <span class="rarity-chip level">Lvl ${level}</span>
            ${maxLevel > 0 ? `<span class="rarity-chip">Max ${maxLevel}</span>` : ""}
            ${count > 0 ? `<span class="rarity-chip">x${count}</span>` : ""}
            ${evolutionLevel > 0 ? `<span class="rarity-chip level">Evo ${evolutionLevel}</span>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAll() {
  const metrics = calculateMetrics();
  updateOwnedSummary();
  renderPlayerProfile();
  renderOwnedCards();
  renderFilters();
  renderCatalog();
  renderCollectionInsights();
  renderDeckSlots();
  renderStats(metrics);
  renderCoverage(metrics);
  renderSuggestions(metrics);
  renderCoachDeckCards(state.coachRecommendations);
  renderComparisonSelectors();
  renderPinnedDeck();
  renderHistory();
  refreshInteractiveMotion();
}

function addCard(cardId) {
  const card = getCard(cardId);
  if (!card) {
    return;
  }

  if (deckSlugSet().has(card.slug)) {
    setStatus(`A version of ${card.base_name || card.name} is already in your deck.`, "warn");
    return;
  }

  if (!cardOwned(card)) {
    setStatus(`You do not own ${card.base_name || card.name}.`, "bad");
    return;
  }

  if (!cardMeetsLevel(card)) {
    setStatus(`${card.base_name || card.name} is below your level filter (L${state.minOwnedLevel}).`, "warn");
    return;
  }

  if (state.deck.length >= DECK_SIZE) {
    setStatus("Deck is full. Remove a card first.", "bad");
    return;
  }

  state.deck.push(card.id);
  renderAll();
}

function removeCardAt(index) {
  if (index < 0 || index >= state.deck.length) {
    return;
  }

  const removed = getCard(state.deck[index]);
  state.deck.splice(index, 1);
  renderAll();

  if (removed) {
    setStatus(`${removed.name} removed.`);
  }
}

function randomPick(list) {
  if (!list.length) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function candidatePoolForRandom() {
  let pool = ENRICHED_CARDS;

  if (state.activeFilter === "evolution") {
    pool = pool.filter((card) => card.variant === "evolution");
  } else if (state.activeFilter === "hero") {
    pool = pool.filter((card) => card.variant === "hero");
  } else {
    pool = pool.filter((card) => card.variant === "base");
  }

  if (state.collectionLoaded) {
    pool = pool.filter((card) => cardUsable(card));
  }

  return pool;
}

function generateRandomDeck() {
  const pool = candidatePoolForRandom();

  if (pool.length < DECK_SIZE) {
    return [];
  }

  const winConditions = pool.filter((card) => card.roles.includes("win_condition"));
  const spells = pool.filter((card) => card.roles.includes("spell") || card.type === "Spell");
  const antiAir = pool.filter((card) => card.roles.includes("air_defense"));

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const picked = [];
    const pickedSlugs = new Set();

    for (const seeded of [randomPick(winConditions), randomPick(spells), randomPick(antiAir)]) {
      if (!seeded || pickedSlugs.has(seeded.slug)) {
        continue;
      }
      picked.push(seeded);
      pickedSlugs.add(seeded.slug);
    }

    while (picked.length < DECK_SIZE) {
      const candidate = randomPick(pool);
      if (!candidate || pickedSlugs.has(candidate.slug)) {
        continue;
      }
      picked.push(candidate);
      pickedSlugs.add(candidate.slug);
    }

    const metrics = calculateMetrics(picked);

    if (
      metrics.winConditions >= 1 &&
      metrics.spells >= 1 &&
      metrics.airDefense >= 2 &&
      metrics.avgElixir >= 2.6 &&
      metrics.avgElixir <= 4.8
    ) {
      return picked.map((card) => card.id);
    }
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const fallback = [];
  const used = new Set();

  for (const card of shuffled) {
    if (!used.has(card.slug)) {
      fallback.push(card.id);
      used.add(card.slug);
    }
    if (fallback.length === DECK_SIZE) {
      break;
    }
  }

  return fallback;
}

function sanitizePlayerTag(rawTag) {
  return String(rawTag || "")
    .replace(/^#/, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function apiNameToSlug(name) {
  const normalized = normalizeName(name);

  if (baseNameToSlug.has(normalized)) {
    return baseNameToSlug.get(normalized);
  }

  if (API_NAME_ALIASES[normalized]) {
    return API_NAME_ALIASES[normalized];
  }

  return null;
}

function setCollectionLoading(loading) {
  elements.loadCollectionBtn.disabled = loading;
  elements.clearCollectionBtn.disabled = loading;
  elements.loadCollectionBtn.textContent = loading ? "Fetching..." : "Fetch My Cards";
  document.body.classList.toggle("collection-loading", Boolean(loading));
  if (elements.ownedCardsGrid) {
    elements.ownedCardsGrid.classList.toggle("is-loading-grid", Boolean(loading));
  }

  if (loading) {
    if (elements.playerProfileContent) {
      elements.playerProfileContent.innerHTML = `
        <article class="profile-stat skeleton-card"><span class="skeleton-line"></span><span class="skeleton-line short"></span></article>
        <article class="profile-stat skeleton-card"><span class="skeleton-line"></span><span class="skeleton-line short"></span></article>
        <article class="profile-stat skeleton-card"><span class="skeleton-line"></span><span class="skeleton-line short"></span></article>
        <article class="profile-stat skeleton-card"><span class="skeleton-line"></span><span class="skeleton-line short"></span></article>
      `;
    }

    if (elements.ownedCardsGrid) {
      const skeletonCards = new Array(8)
        .fill(0)
        .map(
          () => '<article class="owned-card-item skeleton-card"><span class="skeleton-line"></span><span class="skeleton-line"></span><span class="skeleton-line short"></span></article>'
        )
        .join("");
      elements.ownedCardsGrid.innerHTML = skeletonCards;
      elements.ownedCardsCount.textContent = "Loading...";
    }
  }
}

function applyMinLevelFromInput() {
  const next = Number(elements.minLevelInput.value || 1);
  const level = Number.isFinite(next) ? Math.max(1, Math.min(MAX_CARD_LEVEL, Math.floor(next))) : 1;
  state.minOwnedLevel = level;
  elements.minLevelInput.value = String(level);
  localStorage.setItem(MIN_LEVEL_STORAGE_KEY, String(level));
}

function pruneDeckForCollection() {
  if (!state.collectionLoaded) {
    return;
  }

  const before = state.deck.length;
  state.deck = state.deck.filter((cardId) => {
    const card = getCard(cardId);
    return card ? cardUsable(card) : false;
  });

  const removed = before - state.deck.length;
  if (removed > 0) {
    setStatus(`${removed} card(s) were removed from deck due to ownership/level filter.`, "warn");
  }
}

async function loadCollectionFromApi() {
  const cleanTag = sanitizePlayerTag(elements.playerTagInput.value);

  if (!cleanTag) {
    setStatus("Enter your player tag first (example: #ABCD123).", "warn");
    return;
  }

  applyMinLevelFromInput();
  setCollectionLoading(true);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${COLLECTION_API_BASE}/player/${encodeURIComponent(cleanTag)}`, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      const reason = payload?.error || payload?.message || `API error ${response.status}`;
      throw new Error(reason);
    }

    const profile = payload?.player;
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];

    if (!profile || !cards.length) {
      throw new Error("No player cards were returned.");
    }

    const levels = new Map();
    const evolutionLevels = new Map();

    for (const apiCard of cards) {
      const slug = apiNameToSlug(apiCard?.name);
      const level = Number(apiCard?.level ?? 0);
      const evolutionLevel = Number(apiCard?.evolutionLevel ?? 0);

      if (slug && Number.isFinite(evolutionLevel) && evolutionLevel > 0) {
        const currentEvo = evolutionLevels.get(slug) ?? 0;
        evolutionLevels.set(slug, Math.max(currentEvo, evolutionLevel));
      }

      if (!slug || !Number.isFinite(level) || level <= 0) {
        continue;
      }

      const current = levels.get(slug) ?? 0;
      levels.set(slug, Math.max(current, level));
    }

    if (!levels.size) {
      throw new Error("Could not map card names from API response.");
    }

    state.ownedLevels = levels;
    state.evolutionLevels = evolutionLevels;
    state.collectionLoaded = true;
    state.playerProfile = profile;
    state.ownedCards = buildOwnedCardDisplayEntries(cards);
    state.ownedCardsSearch = "";
    if (elements.ownedCardsSearchInput) {
      elements.ownedCardsSearchInput.value = "";
    }

    state.loadedPlayerName = String(profile?.name || "").trim();
    state.loadedPlayerTag = String(profile?.tag || `#${cleanTag}`).trim();
    state.ownedOnly = true;
    elements.ownedOnlyToggle.checked = true;

    localStorage.setItem(PLAYER_TAG_STORAGE_KEY, `#${cleanTag}`);

    pruneDeckForCollection();
    renderAll();

    const eligibleCount = [...state.ownedLevels.values()].filter((level) => level >= state.minOwnedLevel).length;
    const playerSuffix = state.loadedPlayerName
      ? ` for ${state.loadedPlayerName}${state.loadedPlayerTag ? ` (${state.loadedPlayerTag})` : ""}`
      : "";

    setStatus(
      `Loaded ${state.ownedLevels.size} owned cards${playerSuffix}. ${eligibleCount} meet level ${state.minOwnedLevel}+; evo unlocked: ${state.evolutionLevels.size}.`,
      "info"
    );

    void refreshSavedProfilesList();
    void refreshStatusTracker();
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "Request timed out while contacting your server route."
      : error instanceof Error
        ? error.message
        : "Failed to load collection.";

    setStatus(`Collection load failed: ${message}`, "bad");
  } finally {
    clearTimeout(timeoutId);
    setCollectionLoading(false);
    renderAll();
  }
}

function clearCollection() {
  state.collectionLoaded = false;
  state.evolutionLevels = new Map();
  state.loadedPlayerName = "";
  state.loadedPlayerTag = "";
  state.ownedLevels = new Map();
  state.ownedOnly = false;
  state.ownedCards = [];
  state.ownedCardsSearch = "";
  state.playerProfile = null;
  elements.ownedOnlyToggle.checked = false;
  if (elements.ownedCardsSearchInput) {
    elements.ownedCardsSearchInput.value = "";
  }
  renderAll();
  setStatus("Collection filters cleared.");
}


function preferredVariantCardForSlug(slug) {
  const candidates = ENRICHED_CARDS
    .filter((card) => card.slug === slug)
    .filter((card) => cardUsable(card))
    .sort((a, b) => {
      const pref = { evolution: 0, base: 1, hero: 2 };
      const byVariant = (pref[a.variant] ?? 99) - (pref[b.variant] ?? 99);
      if (byVariant !== 0) {
        return byVariant;
      }
      if (state.collectionLoaded) {
        return cardLevel(b) - cardLevel(a);
      }
      return 0;
    });

  return candidates[0] || null;
}

function buildDeckFromTemplate(template) {
  const cards = [];
  const missing = [];

  for (const slug of template.slugs) {
    const match = preferredVariantCardForSlug(slug);
    if (match) {
      cards.push(match);
    } else {
      missing.push(slug);
    }
  }

  return { cards, missing };
}

function evaluateTemplate(template) {
  const built = buildDeckFromTemplate(template);
  const levels = built.cards.map((card) => cardLevel(card)).filter((v) => v > 0);
  const avgLevel = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  const score = built.cards.length * 10 + avgLevel;

  return {
    ...template,
    cards: built.cards,
    missing: built.missing,
    avgLevel,
    score,
    ready: built.cards.length === DECK_SIZE
  };
}

function getTemplateRecommendations(query = "") {
  const q = query.toLowerCase();

  let templates = [...DECK_TEMPLATES];
  if (q.includes("lava") || q.includes("air")) {
    templates = templates.filter((t) => t.tags.includes("anti-air") || t.tags.includes("control"));
  } else if (q.includes("beatdown") || q.includes("golem") || q.includes("giant")) {
    templates = templates.filter((t) => t.tags.includes("control") || t.tags.includes("counterpush"));
  } else if (q.includes("cycle")) {
    templates = templates.filter((t) => t.tags.includes("cycle"));
  } else if (q.includes("bait")) {
    templates = templates.filter((t) => t.tags.includes("control") || t.tags.includes("graveyard"));
  }

  const evaluated = templates.map(evaluateTemplate).sort((a, b) => b.score - a.score);
  return evaluated.slice(0, 3);
}

function analyzeBestDeck(cards, trophies) {
  // Deck logic stub for future expansion.
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeTrophies = Number(trophies ?? 0);

  return {
    trophies: safeTrophies,
    candidateCount: safeCards.length,
    recommendedDeck: [],
    notes: [
      "TODO: score card synergy.",
      "TODO: enforce elixir curve and win-condition rules.",
      "TODO: weight recommendations by trophy range meta."
    ]
  };
}

function pushChatMessage(role, text) {
  if (!elements.chatLog) {
    return;
  }

  const row = document.createElement("div");
  row.className = `chat-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  elements.chatLog.appendChild(row);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function coachDeckSignature(cards = []) {
  return cards
    .map((card) => card.slug)
    .filter(Boolean)
    .sort()
    .join("|");
}

function countDeckRole(cards, role) {
  return cards.filter((card) => card.roles.includes(role)).length;
}

function cardCoachLabel(card) {
  const tags = [];
  if (card.variant === "evolution") {
    tags.push("Evo");
  } else if (card.variant === "hero") {
    tags.push("Hero");
  }

  let suffix = "";
  if (state.collectionLoaded) {
    const level = cardLevel(card);
    const evoLevel = cardEvolutionLevel(card);
    suffix = ` L${level}`;
    if (card.variant === "evolution" && evoLevel > 0) {
      suffix += ` Evo${evoLevel}`;
    }
  }

  if (tags.length) {
    return `${card.name} [${tags.join("/")}]${suffix ? ` (${suffix.trim()})` : ""}`;
  }
  return `${card.name}${suffix ? ` (${suffix.trim()})` : ""}`;
}

function coachRoleSummary(card) {
  if (card.roles.includes("win_condition")) {
    return "tower pressure and main damage plan";
  }
  if (card.roles.includes("big_spell")) {
    return "big spell control and tower chip";
  }
  if (card.type === "Spell" || card.roles.includes("spell")) {
    return "small spell utility and swarm clear";
  }
  if (card.roles.includes("building")) {
    return "defensive anchor and kiting";
  }
  if (card.roles.includes("air_defense")) {
    return "primary anti-air coverage";
  }
  if (card.roles.includes("tank")) {
    return "frontline tank and counterpush body";
  }
  if (card.roles.includes("cycle")) {
    return "cheap cycle and rotation control";
  }
  if (card.roles.includes("splash")) {
    return "splash defense versus swarms";
  }
  return "flex support role";
}

function identifyWinConditionPair(cards) {
  const winCards = cards
    .filter((card) => card.roles.includes("win_condition"))
    .sort((a, b) => cardLevel(b) - cardLevel(a) || numericElixir(b) - numericElixir(a) || a.name.localeCompare(b.name));

  return {
    main: winCards[0] || null,
    secondary: winCards[1] || null
  };
}

function inferArchetype(cards, metrics, optionTags = []) {
  const tags = new Set(optionTags);
  const slugs = new Set(cards.map((card) => card.slug));

  if (tags.has("siege") || slugs.has("x-bow") || slugs.has("mortar")) {
    return "Siege";
  }
  if (tags.has("graveyard") || slugs.has("graveyard")) {
    return "Graveyard Control";
  }
  if (tags.has("beatdown") || (metrics.avgElixir >= 4.2 && countDeckRole(cards, "tank") >= 2)) {
    return "Beatdown";
  }
  if (tags.has("cycle") || (metrics.avgElixir <= 3.4 && metrics.cycleCards >= 3)) {
    return "Cycle Control";
  }
  if (tags.has("counterpush")) {
    return "Counterpush";
  }
  return "Midrange Control";
}

function deckLadderVerdict(metrics) {
  if (metrics.winConditions === 0 || metrics.spells === 0 || metrics.airDefense === 0) {
    return "Bad structure";
  }
  if (metrics.winConditions > 2 || metrics.avgElixir > 4.9) {
    return "Messy";
  }
  if (metrics.airDefense < 2 || metrics.spells === 1 || metrics.avgElixir > 4.6) {
    return "Risky";
  }
  if (metrics.winConditions === 1 && metrics.spells >= 1 && metrics.airDefense >= 2 && metrics.avgElixir >= 2.8 && metrics.avgElixir <= 4.3) {
    return "Good ladder option";
  }
  return "Playable";
}

function deckBiggestProblem(metrics) {
  if (metrics.winConditions === 0) {
    return "There is no reliable win condition, so the deck has no clear way to finish towers.";
  }
  if (metrics.airDefense < 2) {
    return "Your anti-air is too thin, so air decks get too much value.";
  }
  if (metrics.spells === 0) {
    return "No spell support makes swarm control and reset situations unreliable.";
  }
  if (metrics.winConditions > 2) {
    return "The deck is trying to run too many win conditions at once and loses structure.";
  }
  if (metrics.avgElixir > 4.6) {
    return "The elixir curve is too heavy for consistent ladder defense.";
  }
  if (metrics.spells > 3) {
    return "Spell count is too high and your troop support gets too thin.";
  }
  return "The core structure is playable, but support roles are still a little awkward.";
}

function deckBestFix(metrics) {
  if (metrics.winConditions === 0) {
    return "Add one clear win condition immediately and rebuild support around it.";
  }
  if (metrics.airDefense < 2) {
    return "Add one stable anti-air card and cut your weakest ground-only support card.";
  }
  if (metrics.spells === 0) {
    return "Add at least one reliable spell so you can control swarms and tempo.";
  }
  if (metrics.winConditions > 2) {
    return "Cut down to one main win condition plus one optional secondary pressure card.";
  }
  if (metrics.avgElixir > 4.6) {
    return "Replace one heavy card with a cheap cycle/support option to stabilize rotation.";
  }
  return "Refine one support slot for better matchup coverage instead of changing your core win condition.";
}

function matchupOverview(cards, metrics) {
  const good = [];
  const bad = [];
  const swarmClearCount = countDeckRole(cards, "swarm_clear");
  const resetCount = countDeckRole(cards, "reset");

  if (metrics.airDefense >= 3) {
    good.push("Lava/Balloon and most air-heavy ladders");
  } else {
    bad.push("Air-heavy decks with stacked flyers");
  }

  if (swarmClearCount >= 2 || metrics.spells >= 2) {
    good.push("Bait and swarm pressure decks");
  } else {
    bad.push("Bait decks when your spell is out of cycle");
  }

  if (metrics.buildings >= 1) {
    good.push("Hog and bridge pressure when you play patient defense");
  } else {
    bad.push("Fast Hog/Ram pressure without a defensive building");
  }

  if (resetCount === 0) {
    bad.push("Inferno-heavy defense and reset-demanding fights");
  } else {
    good.push("Inferno units and reset matchups");
  }

  if (metrics.avgElixir > 4.5) {
    bad.push("Fast cycle decks that can out-rotate your answers");
  }

  if (!good.length) {
    good.push("Midrange decks when you defend cleanly and counterpush");
  }
  if (!bad.length) {
    bad.push("None hard-lost on paper, but execution still decides close games");
  }

  return { good, bad };
}

function trophyRangeGuidance(trophies) {
  const value = Number(trophies ?? 0);

  if (!Number.isFinite(value) || value <= 0) {
    return "Trophy range unknown, so this is tuned for general ladder consistency.";
  }
  if (value < 5000) {
    return `At ${value} trophies, this structure is straightforward and punishes overcommits well.`;
  }
  if (value < 7500) {
    return `At ${value} trophies, this is ladder-safe if you avoid forcing bad pushes in single elixir.`;
  }
  return `At ${value} trophies, this can still work, but stronger players will punish late-cycle mistakes quickly.`;
}

function openingPlaySuggestions(cards) {
  const openers = cards
    .filter((card) => !card.roles.includes("win_condition"))
    .filter((card) => !card.variable_elixir && card.elixir <= 3)
    .slice(0, 3)
    .map((card) => card.name);

  if (openers.length) {
    return openers.join(", ");
  }

  const fallback = cards
    .filter((card) => !card.roles.includes("win_condition"))
    .slice(0, 2)
    .map((card) => card.name);

  return fallback.length ? fallback.join(", ") : "passive cycle and react first";
}

function gamePlanNotes(archetype, metrics) {
  const early = metrics.avgElixir > 4.3
    ? "Play calm in single elixir. Scout counters before committing your win condition."
    : "Use cheap cycle and light pressure to learn their counters first.";

  let mid = "Defend efficiently, then convert defense into controlled counterpushes.";
  let double = "In double elixir, stack support carefully and pressure when their spell is out of cycle.";

  if (archetype.includes("Siege")) {
    mid = "Protect your siege setup with spell + cheap defense, do not force blind placements.";
    double = "In double, win by out-cycling their hard counters and defending first.";
  } else if (archetype.includes("Beatdown")) {
    mid = "Start building pushes from the back only when your key defenders are in hand.";
    double = "Double elixir is your power window. Stack support and spell predict swarms.";
  } else if (archetype.includes("Cycle")) {
    mid = "Chip, defend cleanly, and keep your win condition rotating faster than their counters.";
    double = "In double, pressure both lanes only if your defensive cycle stays intact.";
  }

  return { early, mid, double };
}

function rankDeckUpgradePriorities(cards) {
  if (!state.collectionLoaded) {
    return [];
  }

  const weighted = cards.map((card) => {
    let importance = 1;
    if (card.roles.includes("win_condition")) importance += 4;
    if (card.type === "Spell" || card.roles.includes("spell")) importance += 3;
    if (card.roles.includes("air_defense")) importance += 2;
    if (card.roles.includes("building")) importance += 1.5;
    if (card.roles.includes("cycle")) importance += 1;

    const level = Math.max(0, Math.min(MAX_CARD_LEVEL, cardLevel(card)));
    const roomToGrow = Math.max(0, MAX_CARD_LEVEL - level);
    const belowTarget = Math.max(0, state.minOwnedLevel - level);
    const score = roomToGrow * 12 + importance * 8 + belowTarget * 25;

    return {
      card,
      level,
      score
    };
  });

  return weighted
    .sort((a, b) => b.score - a.score || a.level - b.level || a.card.name.localeCompare(b.card.name))
    .map((entry) => `${entry.card.name} (L${entry.level})`);
}

function formatDeckList(cards) {
  return cards.map((card) => cardCoachLabel(card)).join(", ");
}

function formatDeckBreakdown(title, option, trophies, contextNote = "") {
  const cards = option?.cards || [];
  if (!cards.length) {
    return `${title}\n- No legal 8-card deck available from current data.`;
  }

  const metrics = calculateMetrics(cards);
  const archetype = inferArchetype(cards, metrics, option.tags || []);
  const winPair = identifyWinConditionPair(cards);
  const matchups = matchupOverview(cards, metrics);
  const plans = gamePlanNotes(archetype, metrics);
  const upgrades = rankDeckUpgradePriorities(cards);
  const levelText = state.collectionLoaded
    ? `Avg L${metrics.avgLevel.toFixed(1)} (min L${metrics.minLevel})`
    : "Collection levels not loaded yet";
  const secondary = winPair.secondary ? winPair.secondary.name : "None";

  const lines = [];
  lines.push(title);
  lines.push(`- Full 8-card deck: ${formatDeckList(cards)}`);
  lines.push(`- Archetype: ${archetype}`);
  lines.push(`- Average elixir: ${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)}`);
  lines.push(`- Main win condition: ${winPair.main ? winPair.main.name : "None"}`);
  lines.push(`- Secondary win condition: ${secondary}`);
  lines.push(`- Why it fits the levels: ${levelText}. This version leans on your strongest practical levels.`);
  lines.push(`- Why it fits trophy range: ${trophyRangeGuidance(trophies)}`);

  lines.push("- Card-by-card roles:");
  cards.forEach((card) => {
    lines.push(`  - ${cardCoachLabel(card)}: ${coachRoleSummary(card)}.`);
  });

  lines.push(`- Early game: ${plans.early}`);
  lines.push(`- Mid game: ${plans.mid}`);
  lines.push(`- Double elixir: ${plans.double}`);
  lines.push(`- Opening plays: ${openingPlaySuggestions(cards)}`);
  lines.push(`- Good matchups: ${matchups.good.join("; ")}.`);
  lines.push(`- Bad matchups: ${matchups.bad.join("; ")}.`);
  lines.push(`- Upgrade priority: ${upgrades.length ? upgrades.join(", ") : "Load your collection first for level-specific upgrade order."}.`);

  if (contextNote) {
    lines.push(`- Why this version: ${contextNote}`);
  }

  return lines.join("\n");
}

function explainCurrentDeck() {
  if (!state.deck.length) {
    return [
      "Quick Verdict",
      "Limited by missing deck",
      "",
      "Biggest Problem",
      "You have not provided a deck, so there is nothing real to analyze yet.",
      "",
      "Best Fix",
      "Load or build an 8-card deck first, then ask for analysis again.",
      "",
      "Full Explanation",
      "Share your current deck or use a recommendation first. Once 8 cards are loaded, I will break down archetype, structure, matchups, and exact fixes."
    ].join("\n");
  }

  const cards = deckCards();
  const metrics = calculateMetrics(cards);
  const archetype = inferArchetype(cards, metrics, []);
  const winPair = identifyWinConditionPair(cards);
  const verdict = deckLadderVerdict(metrics);
  const biggestProblem = deckBiggestProblem(metrics);
  const bestFix = deckBestFix(metrics);
  const matchups = matchupOverview(cards, metrics);
  const plans = gamePlanNotes(archetype, metrics);

  const strengths = [];
  if (metrics.winConditions >= 1) strengths.push("clear tower pressure plan");
  if (metrics.airDefense >= 2) strengths.push("solid anti-air coverage");
  if (metrics.spells >= 1) strengths.push("spell support for tempo control");
  if (metrics.avgElixir >= 2.8 && metrics.avgElixir <= 4.4) strengths.push("healthy elixir curve");
  if (!strengths.length) strengths.push("some usable card power, but structure is unstable");

  const weaknesses = [];
  if (metrics.winConditions === 0) weaknesses.push("no reliable finish");
  if (metrics.airDefense < 2) weaknesses.push("weak into stacked air");
  if (metrics.spells === 0) weaknesses.push("no spell control");
  if (metrics.avgElixir > 4.6) weaknesses.push("too clunky in rotation");
  if (metrics.winConditions > 2) weaknesses.push("too many win conditions");
  if (!weaknesses.length) weaknesses.push("support slots can still be cleaner");

  const full = [];
  full.push(`Archetype: ${archetype}.`);
  full.push(`Average elixir: ${metrics.hasVariableElixir ? "~" : ""}${metrics.avgElixir.toFixed(2)}.`);
  full.push(`Main win condition: ${winPair.main ? winPair.main.name : "None"}.`);
  full.push(`Secondary win condition: ${winPair.secondary ? winPair.secondary.name : "None"}.`);
  full.push(`What this deck does well: ${strengths.join(", ")}.`);
  full.push(`What this deck does poorly: ${weaknesses.join(", ")}.`);
  full.push(`Biggest flaw: ${biggestProblem}`);
  full.push(`Ladder safety: ${verdict}. ${trophyRangeGuidance(state.playerProfile?.trophies)}.`);
  full.push(`How to improve it: ${bestFix}`);
  full.push(`Good matchups: ${matchups.good.join("; ")}.`);
  full.push(`Bad matchups: ${matchups.bad.join("; ")}.`);
  full.push(`How to play it better: Early game -> ${plans.early} Mid game -> ${plans.mid} Double elixir -> ${plans.double}`);

  return [
    "Quick Verdict",
    verdict,
    "",
    "Biggest Problem",
    biggestProblem,
    "",
    "Best Fix",
    bestFix,
    "",
    "Full Explanation",
    ...full
  ].join("\n");
}

function listOwnedCardsWithLevels() {
  if (!state.collectionLoaded) {
    return "Load your collection first, then ask again.";
  }

  const playerLabel = state.loadedPlayerName
    ? `${state.loadedPlayerName}${state.loadedPlayerTag ? ` (${state.loadedPlayerTag})` : ""}`
    : state.loadedPlayerTag || "current player";

  const entries = [...state.ownedCards]
    .map((card) => ({
      name: card.name,
      slug: apiNameToSlug(card.name),
      level: Number(card.level ?? 0),
      evoLevel: Number(card.evolutionLevel ?? 0),
      hasEvoVariant: Boolean(card.hasEvoVariant),
      hasHeroVariant: Boolean(card.hasHeroVariant)
    }))
    .map((entry) => {
      const baseMeta = entry.slug ? BASE_CARD_BY_SLUG.get(entry.slug) || null : null;
      const elixir = baseMeta ? numericElixir(baseMeta) : 0;
      return { ...entry, elixir };
    })
    .filter((entry) => entry.level > 0)
    .sort((a, b) => b.elixir - a.elixir || b.level - a.level || a.name.localeCompare(b.name));

  if (!entries.length) {
    return "No owned cards found in the loaded profile.";
  }

  const lines = [];
  lines.push(`Owned cards for ${playerLabel}: ${entries.length} cards`);

  entries.forEach((entry, index) => {
    const tagNotes = [];
    if (entry.hasEvoVariant) tagNotes.push("Evolution");
    if (entry.hasHeroVariant) tagNotes.push("Hero");
    const variantNote = tagNotes.length ? `, Tags: ${tagNotes.join("/")}` : "";
    const evoNote = entry.evoLevel > 0 ? `, Evo ${entry.evoLevel}` : "";
    lines.push(`${index + 1}. ${entry.name} - ${entry.elixir} elixir - L${entry.level}${variantNote}${evoNote}`);
  });

  return lines.join("\n");
}

function usableUniqueCards() {
  if (!state.collectionLoaded) {
    return [];
  }

  const list = [];
  const seen = new Set();

  for (const base of BASE_CARDS) {
    if (seen.has(base.slug)) {
      continue;
    }
    if (!cardUsable(base)) {
      continue;
    }
    const preferred = preferredVariantCardForSlug(base.slug);
    if (!preferred) {
      continue;
    }
    seen.add(base.slug);
    list.push(preferred);
  }

  return list;
}

function modeCardScore(card, mode) {
  const lvl = state.collectionLoaded ? cardLevel(card) : 11;
  let score = lvl * 2;

  if (card.roles.includes("win_condition")) score += 10;
  if (card.type === "Spell" || card.roles.includes("spell")) score += 7;
  if (card.roles.includes("air_defense")) score += 6;
  if (card.roles.includes("building")) score += 3;
  if (card.roles.includes("cycle")) score += mode === "safe" ? 4 : 2;
  if (card.roles.includes("tank")) score += mode === "aggressive" ? 4 : 1;
  if (card.roles.includes("splash")) score += 2;

  if (!card.variable_elixir) {
    if (mode === "safe") {
      score += Math.max(0, 4 - card.elixir) * 1.3;
    } else if (mode === "aggressive") {
      score += Math.max(0, card.elixir - 3) * 1.1;
    } else {
      score += Math.max(0, 4.2 - Math.abs(3.8 - card.elixir));
    }
  }

  return score;
}

function buildDeckFromOwnedPool(mode = "balanced") {
  const pool = usableUniqueCards();
  if (pool.length < DECK_SIZE) {
    return [];
  }

  const sorted = [...pool].sort(
    (a, b) => modeCardScore(b, mode) - modeCardScore(a, mode) || cardLevel(b) - cardLevel(a) || a.name.localeCompare(b.name)
  );

  const picked = [];
  const used = new Set();

  const addIfValid = (card) => {
    if (!card || used.has(card.slug) || picked.length >= DECK_SIZE) {
      return false;
    }
    const nextMetrics = calculateMetrics([...picked, card]);
    if (nextMetrics.winConditions > 2) {
      return false;
    }
    if (nextMetrics.spells > 3) {
      return false;
    }
    if (mode === "safe" && nextMetrics.avgElixir > 4.2 && !card.variable_elixir && card.elixir >= 5) {
      return false;
    }
    if (mode === "balanced" && nextMetrics.avgElixir > 4.6 && !card.variable_elixir && card.elixir >= 6) {
      return false;
    }
    if (mode === "aggressive" && nextMetrics.avgElixir > 5.1 && !card.variable_elixir && card.elixir >= 6) {
      return false;
    }

    picked.push(card);
    used.add(card.slug);
    return true;
  };

  const pickRole = (predicate, targetCount) => {
    while (targetCount > 0 && picked.length < DECK_SIZE) {
      const candidate = sorted.find((card) => !used.has(card.slug) && predicate(card));
      if (!candidate) {
        return;
      }
      if (addIfValid(candidate)) {
        targetCount -= 1;
      } else {
        used.add(candidate.slug);
      }
    }
  };

  pickRole((card) => card.roles.includes("win_condition"), mode === "aggressive" ? 2 : 1);
  pickRole((card) => card.roles.includes("big_spell"), 1);
  pickRole((card) => card.type === "Spell" || card.roles.includes("spell"), 1);
  pickRole((card) => card.roles.includes("air_defense"), 2);
  if (mode !== "aggressive") {
    pickRole((card) => card.roles.includes("building"), 1);
  }
  if (mode === "safe") {
    pickRole((card) => card.roles.includes("cycle"), 2);
  } else if (mode === "aggressive") {
    pickRole((card) => card.roles.includes("tank"), 1);
  }

  for (const card of sorted) {
    if (picked.length >= DECK_SIZE) {
      break;
    }
    addIfValid(card);
  }

  if (picked.length < DECK_SIZE) {
    const fallback = [...pool]
      .sort((a, b) => cardLevel(b) - cardLevel(a) || a.name.localeCompare(b.name))
      .filter((card) => !picked.some((entry) => entry.slug === card.slug))
      .slice(0, DECK_SIZE - picked.length);
    picked.push(...fallback);
  }

  return picked.slice(0, DECK_SIZE);
}

function deckQualityScore(cards, modeTag = "balanced") {
  const metrics = calculateMetrics(cards);
  let score = 0;

  score += metrics.winConditions >= 1 ? 22 : -25;
  score += metrics.winConditions === 1 ? 5 : 0;
  score += metrics.spells >= 1 && metrics.spells <= 2 ? 10 : metrics.spells === 0 ? -12 : -4;
  score += metrics.airDefense >= 2 ? 10 : metrics.airDefense === 1 ? -5 : -12;
  score += metrics.buildings >= 1 ? 3 : 0;
  score += metrics.avgElixir >= 2.8 && metrics.avgElixir <= 4.6 ? 10 : -8;
  score += metrics.cycleCards >= 2 ? 4 : 0;
  score += state.collectionLoaded ? metrics.avgLevel * 1.8 + metrics.minLevel * 0.8 : 0;

  if (modeTag === "safe") {
    score += metrics.avgElixir <= 4.2 ? 3 : -2;
  } else if (modeTag === "aggressive") {
    score += metrics.avgElixir >= 3.7 ? 2 : -1;
  }

  return score;
}

function createCoachOptionFromCards(name, cards, note, tags = []) {
  const metrics = calculateMetrics(cards);
  return {
    name,
    tags,
    cards,
    note,
    missing: [],
    ready: cards.length === DECK_SIZE,
    avgLevel: metrics.avgLevel,
    score: deckQualityScore(cards, tags[0] || "balanced")
  };
}

function uniqueDeckOptions(options = []) {
  const seen = new Set();
  const result = [];

  for (const option of options) {
    if (!option || !Array.isArray(option.cards) || option.cards.length !== DECK_SIZE) {
      continue;
    }
    const sig = coachDeckSignature(option.cards);
    if (seen.has(sig)) {
      continue;
    }
    seen.add(sig);
    result.push(option);
  }

  return result.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function getSingleLegalDeckOption() {
  const pool = usableUniqueCards();
  if (pool.length !== DECK_SIZE) {
    return null;
  }
  return createCoachOptionFromCards(
    "Only Legal Deck",
    pool,
    "Only one legal 8-card combination exists from your current owned + level-filtered cards.",
    ["forced"]
  );
}

function buildCoachDeckOptions(query = "") {
  if (!state.collectionLoaded) {
    return [];
  }

  const single = getSingleLegalDeckOption();
  if (single) {
    return [single];
  }

  const balanced = buildDeckFromOwnedPool("balanced");
  const safe = buildDeckFromOwnedPool("safe");
  const aggressive = buildDeckFromOwnedPool("aggressive");

  const generated = [
    createCoachOptionFromCards(
      "Best Main Deck",
      balanced,
      "Cleanest all-around ladder structure from your owned cards and levels.",
      ["balanced", "control"]
    ),
    createCoachOptionFromCards(
      "Best Safer Deck",
      safe,
      "Safer version with tighter defense and cleaner rotation.",
      ["safe", "control", "cycle"]
    ),
    createCoachOptionFromCards(
      "Best Aggressive Deck",
      aggressive,
      "Higher pressure version for faster games and punish windows.",
      ["aggressive", "counterpush"]
    )
  ];

  const templateReady = DECK_TEMPLATES
    .map(evaluateTemplate)
    .filter((entry) => entry.ready)
    .map((entry) =>
      createCoachOptionFromCards(
        entry.name,
        entry.cards,
        `${entry.note} Practicality adjusted by your card levels.`,
        entry.tags
      )
    );

  let options = uniqueDeckOptions([...generated, ...templateReady]);

  const q = String(query || "").toLowerCase();
  if (q.includes("cycle")) {
    options = options.sort((a, b) => {
      const aMetrics = calculateMetrics(a.cards);
      const bMetrics = calculateMetrics(b.cards);
      return aMetrics.avgElixir - bMetrics.avgElixir || b.score - a.score;
    });
  } else if (q.includes("beatdown") || q.includes("aggressive")) {
    options = options.sort((a, b) => {
      const aMetrics = calculateMetrics(a.cards);
      const bMetrics = calculateMetrics(b.cards);
      return bMetrics.avgElixir - aMetrics.avgElixir || b.score - a.score;
    });
  }

  const playstyle = coercePlaystyle(state.playstylePreference);
  if (playstyle !== "no_preference") {
    options = options
      .map((option) => {
        const tags = new Set(option.tags || []);
        const metrics = calculateMetrics(option.cards || []);

        let bonus = 0;
        if (playstyle === "aggressive") {
          if (tags.has("aggressive") || tags.has("counterpush") || tags.has("beatdown")) bonus += 8;
          if (metrics.avgElixir >= 3.7) bonus += 4;
        } else if (playstyle === "control") {
          if (tags.has("control") || tags.has("safe") || tags.has("siege")) bonus += 8;
          if (metrics.spells >= 1 && metrics.airDefense >= 2) bonus += 3;
        } else if (playstyle === "beatdown") {
          if (tags.has("beatdown") || tags.has("aggressive")) bonus += 8;
          if (metrics.avgElixir >= 4.0) bonus += 3;
        } else if (playstyle === "cycle") {
          if (tags.has("cycle") || tags.has("safe")) bonus += 8;
          if (metrics.avgElixir <= 3.7) bonus += 4;
        } else if (playstyle === "bait") {
          if (tags.has("control") || tags.has("graveyard") || tags.has("cycle")) bonus += 6;
          if (metrics.spells >= 2) bonus += 2;
        }

        return {
          ...option,
          score: option.score + bonus
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  return options;
}

function formatDeckBuildResponse(query = "") {
  if (!state.collectionLoaded) {
    return [
      "Quick Verdict",
      "Limited by card pool data",
      "",
      "Biggest Problem",
      "I do not have your live collection and levels loaded, so strict owned-card deck building is impossible.",
      "",
      "Best Fix",
      'Use "Fetch My Cards" first, then ask me to build decks so I can use your real owned levels only.',
      "",
      "Full Explanation",
      "I can still discuss general meta ideas, but I will not pretend missing cards are available when collection data is missing."
    ].join("\n");
  }

  const options = buildCoachDeckOptions(query);
  if (!options.length) {
    return [
      "Quick Verdict",
      "Limited by card pool",
      "",
      "Biggest Problem",
      `You currently have fewer than ${DECK_SIZE} legal cards at your active level filter.`,
      "",
      "Best Fix",
      "Lower the minimum level filter or level up core cards, then I can build legal decks.",
      "",
      "Full Explanation",
      "The coach will only build full decks from cards you actually own and meet your level filter."
    ].join("\n");
  }

  state.coachRecommendations = options.slice(0, 3);

  if (options.length === 1) {
    const only = options[0];
    const section = formatDeckBreakdown("## Best Main Deck", only, state.playerProfile?.trophies, only.note);
    return [
      "Quick Verdict",
      "Limited by card pool",
      "",
      "Biggest Problem",
      "Only one legal 8-card deck exists from your current owned + level-filtered cards.",
      "",
      "Best Fix",
      "Run this version and optimize gameplay/matchups until your pool expands.",
      "",
      "Full Explanation",
      section,
      "",
      "## Best Safer Deck",
      "- Same as main deck (no second legal alternative currently).",
      "",
      "## Best Aggressive Deck",
      "- Same as main deck (no third legal alternative currently).",
      "",
      "## Final Verdict",
      "- Highest win chance right now: the only legal deck above.",
      "- Biggest account weakness: limited legal pool at current level threshold.",
      "- Next improvement: upgrade win condition + spell + anti-air core first.",
      "",
      'Type "load 1" to auto-load it.'
    ].join("\n");
  }

  const main = options[0];
  let safer = options.find((option) => option !== main && (option.tags.includes("safe") || option.tags.includes("control")));
  let aggressive = options.find((option) => option !== main && option !== safer && (option.tags.includes("aggressive") || option.tags.includes("beatdown") || option.tags.includes("counterpush")));

  if (!safer) {
    safer = options.find((option) => option !== main) || main;
  }
  if (!aggressive) {
    aggressive = options.find((option) => option !== main && option !== safer) || main;
  }

  state.coachRecommendations = [main, safer, aggressive];

  const mainSection = formatDeckBreakdown("## Best Main Deck", main, state.playerProfile?.trophies, main.note);
  const saferSection = formatDeckBreakdown("## Best Safer Deck", safer, state.playerProfile?.trophies, "Safer because the structure gives cleaner defense and less all-in risk.");
  const aggressiveSection = formatDeckBreakdown("## Best Aggressive Deck", aggressive, state.playerProfile?.trophies, "More aggressive because it creates faster pressure windows and punish pushes.");

  const mainMetrics = calculateMetrics(main.cards);
  const verdict = deckLadderVerdict(mainMetrics);
  const biggestProblem = deckBiggestProblem(mainMetrics);
  const bestFix = deckBestFix(mainMetrics);
  const upgrades = rankDeckUpgradePriorities(main.cards);

  return [
    "Quick Verdict",
    verdict,
    "",
    "Biggest Problem",
    biggestProblem,
    "",
    "Best Fix",
    bestFix,
    "",
    "Full Explanation",
    mainSection,
    "",
    saferSection,
    "",
    aggressiveSection,
    "",
    "## Final Verdict",
    `- Highest chance to win now: ${main.name}.`,
    "- Why: it is the cleanest balance of structure, levels, and ladder consistency from your collection.",
    `- Biggest account/deck-building weakness: ${biggestProblem}`,
    `- Cards/upgrades that improve your account most: ${upgrades.length ? upgrades.join(", ") : "load collection levels to rank upgrades."}.`,
    "",
    'Type "load 1", "load 2", or "load 3" to auto-load a deck.'
  ].join("\n");
}

function formatUpgradeAdviceResponse() {
  if (!state.collectionLoaded) {
    return [
      "Quick Verdict",
      "Limited by missing levels",
      "",
      "Biggest Problem",
      "I cannot give level-weighted upgrade advice without your loaded collection.",
      "",
      "Best Fix",
      "Fetch your cards first, then ask for upgrade priority.",
      "",
      "Full Explanation",
      "Upgrade advice is strongest when based on your actual card levels and current playable deck options."
    ].join("\n");
  }

  const options = buildCoachDeckOptions("upgrade");
  const main = options[0];
  if (!main) {
    return [
      "Quick Verdict",
      "Limited by card pool",
      "",
      "Biggest Problem",
      "No full legal deck can be built at your current level filter.",
      "",
      "Best Fix",
      "Lower level filter temporarily and prioritize core upgrades first.",
      "",
      "Full Explanation",
      "Once a legal deck is available, upgrade priorities become much more accurate."
    ].join("\n");
  }

  const priorities = rankDeckUpgradePriorities(main.cards);
  const metrics = calculateMetrics(main.cards);
  const biggestProblem = metrics.minLevel < metrics.avgLevel - 1.2
    ? "Your deck power is uneven, so low-level links are dragging key matchups."
    : "Your next gains come from upgrading high-impact core cards, not random side cards.";
  const bestFix = priorities.length
    ? `Upgrade in this order first: ${priorities.slice(0, 3).join(", ")}.`
    : "Upgrade your main win condition and primary spell first.";

  return [
    "Quick Verdict",
    "Strong but flawed",
    "",
    "Biggest Problem",
    biggestProblem,
    "",
    "Best Fix",
    bestFix,
    "",
    "Full Explanation",
    `Main reference deck: ${main.name}.`,
    "Upgrade priority ranking (highest to lowest):",
    ...priorities.map((item, index) => `${index + 1}. ${item}`),
    "Why this order matters:",
    "- Win condition levels convert more pushes into tower damage.",
    "- Spell levels improve guaranteed breakpoints versus swarms and supports.",
    "- Anti-air levels stabilize your hardest ladder matchups.",
    "- Avoid dumping resources into cards outside your main ladder core."
  ].join("\n");
}

function formatRelativeTime(isoString) {
  const date = new Date(isoString || "");
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function normalizeStateLabel(value) {
  const normalized = String(value || "stale").toLowerCase();
  if (["online", "syncing", "stale", "error"].includes(normalized)) {
    return normalized;
  }
  return "stale";
}

function setStatusTile(valueEl, timeEl, state, timeValue, emptyText) {
  if (!valueEl || !timeEl) {
    return;
  }

  const normalizedState = normalizeStateLabel(state);
  const tile = valueEl.closest(".status-tile");
  if (tile) {
    tile.dataset.state = normalizedState;
  }

  valueEl.textContent = normalizedState;
  timeEl.textContent = timeValue ? formatRelativeTime(timeValue) : (emptyText || "No data");
}

function renderStatusTracker() {
  if (!state.statusSnapshot) {
    return;
  }

  const snapshot = state.statusSnapshot;
  if (elements.statusBuildLabel) {
    const label = snapshot?.build?.label || "local-dev";
    const botVersion = snapshot?.build?.chatbotVersion || "coach-v2";
    elements.statusBuildLabel.textContent = `Build: ${label} • Chatbot: ${botVersion}`;
  }

  setStatusTile(
    elements.statusApiState,
    elements.statusApiTime,
    snapshot?.api?.state,
    snapshot?.api?.lastSuccessfulPlayerFetch,
    "No successful fetch yet"
  );
  setStatusTile(
    elements.statusDeckState,
    elements.statusDeckTime,
    snapshot?.decks?.state,
    snapshot?.decks?.lastDeckSync,
    "No deck sync yet"
  );
  setStatusTile(
    elements.statusChatState,
    elements.statusChatTime,
    snapshot?.chatbot?.state,
    snapshot?.chatbot?.lastUpdate,
    "No recent chatbot updates"
  );

  if (!elements.statusActivityList) {
    return;
  }

  const activity = Array.isArray(snapshot?.activity) ? snapshot.activity : [];
  if (!activity.length) {
    elements.statusActivityList.innerHTML = '<p class="meta">No recent activity yet.</p>';
    return;
  }

  elements.statusActivityList.innerHTML = activity
    .slice(0, 10)
    .map((entry) => {
      const component = escapeHtml(entry.component || "system");
      const message = escapeHtml(entry.message || "");
      const detail = escapeHtml(entry.detail || "");
      const stateLabel = normalizeStateLabel(entry.state || "stale");
      const timeText = formatRelativeTime(entry.createdAt || "");
      return `
        <article class="status-activity-item" data-state="${stateLabel}">
          <p><strong>${component}</strong> • ${stateLabel}</p>
          <p>${message}</p>
          ${detail ? `<p>${detail}</p>` : ""}
          <p class="line-meta">${timeText}</p>
        </article>
      `;
    })
    .join("");
}

async function appApiRequest(path, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed (${response.status})`);
    }

    return payload || {};
  } finally {
    clearTimeout(timeoutId);
  }
}

async function preloadCatalogArt() {
  try {
    const payload = await appApiRequest(CARD_ICONS_API, { method: "GET" }, 10000);
    const icons = Array.isArray(payload?.icons) ? payload.icons : [];
    const next = new Map();

    for (const entry of icons) {
      const iconUrl = String(entry?.iconUrl || "").trim();
      const slug = apiNameToSlug(entry?.name || "");
      if (!slug) {
        continue;
      }

      if (iconUrl) {
        next.set(catalogArtKey(slug, "base"), iconUrl);
      }

      const evoIconUrl = String(entry?.evolutionIconUrl || "").trim();
      if (evoIconUrl) {
        next.set(catalogArtKey(slug, "evolution"), evoIconUrl);
      }

      const heroIconUrl = String(entry?.heroIconUrl || "").trim();
      if (heroIconUrl) {
        next.set(catalogArtKey(slug, "hero"), heroIconUrl);
      }
    }

    state.catalogArtBySlug = next;
    renderCatalog();
    refreshInteractiveMotion();
  } catch (_error) {
    // Optional visual enhancement only.
  }
}

async function refreshStatusTracker() {
  try {
    const payload = await appApiRequest(STATUS_API, { method: "GET" }, 8000);
    state.statusSnapshot = payload;
    renderStatusTracker();
    refreshInteractiveMotion();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status refresh failed.";
    if (elements.statusBuildLabel) {
      elements.statusBuildLabel.textContent = `Build: ${APP_BUILD_LABEL} • Status unavailable`;
    }
    setStatus(`Status refresh failed: ${message}`, "warn");
  }
}

function startStatusPolling() {
  if (state.statusPollTimer) {
    clearInterval(state.statusPollTimer);
  }
  state.statusPollTimer = setInterval(() => {
    void refreshStatusTracker();
  }, STATUS_REFRESH_INTERVAL_MS);
}

async function pingChatbotStatus(message) {
  try {
    await appApiRequest(
      CHATBOT_PING_API,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      },
      5000
    );
  } catch (_error) {
    // Status ping is best-effort only.
  }
}

function persistDeckExplorerFavoritesLocal() {
  const ids = [...state.deckExplorerFavorites];
  localStorage.setItem(DECK_EXPLORER_FAVORITES_KEY, JSON.stringify(ids));
}

function loadDeckExplorerFavoritesLocal() {
  const raw = localStorage.getItem(DECK_EXPLORER_FAVORITES_KEY);
  const parsed = raw ? safeJsonParse(raw, []) : [];
  if (Array.isArray(parsed)) {
    state.deckExplorerFavorites = new Set(parsed.map((item) => String(item || "")).filter(Boolean));
  }
}

function deckExplorerTagClass(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderDeckExplorerFilters() {
  const decks = Array.isArray(state.deckExplorer.decks) ? state.deckExplorer.decks : [];

  const archetypes = [...new Set(decks.map((deck) => String(deck.archetype || "Unknown").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  if (elements.deckExplorerArchetypeSelect) {
    const options = ['<option value="all">All archetypes</option>'];
    archetypes.forEach((archetype) => {
      options.push(`<option value="${escapeHtml(archetype)}">${escapeHtml(archetype)}</option>`);
    });
    elements.deckExplorerArchetypeSelect.innerHTML = options.join("");
    elements.deckExplorerArchetypeSelect.value = archetypes.includes(state.deckExplorer.archetype)
      ? state.deckExplorer.archetype
      : "all";
  }

  const tags = [...new Set(
    decks
      .flatMap((deck) => Array.isArray(deck.tags) ? deck.tags : [])
      .map((tag) => String(tag || "").trim().toLowerCase())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  if (elements.deckExplorerTagSelect) {
    const options = ['<option value="all">All labels</option>'];
    tags.forEach((tag) => {
      options.push(`<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`);
    });
    elements.deckExplorerTagSelect.innerHTML = options.join("");
    elements.deckExplorerTagSelect.value = tags.includes(state.deckExplorer.tag)
      ? state.deckExplorer.tag
      : "all";
  }
}

function filteredDeckExplorerDecks() {
  const query = String(state.deckExplorer.search || "").trim().toLowerCase();

  return (state.deckExplorer.decks || [])
    .filter((deck) => {
      if (!deck || !Array.isArray(deck.cards)) {
        return false;
      }

      if (state.deckExplorer.favoritesOnly && !state.deckExplorerFavorites.has(deck.id)) {
        return false;
      }

      if (state.deckExplorer.sourceType !== "all" && String(deck.sourceType || "") !== state.deckExplorer.sourceType) {
        return false;
      }

      if (state.deckExplorer.archetype !== "all" && String(deck.archetype || "") !== state.deckExplorer.archetype) {
        return false;
      }

      if (state.deckExplorer.tag !== "all") {
        const tags = Array.isArray(deck.tags) ? deck.tags.map((tag) => String(tag || "").toLowerCase()) : [];
        if (!tags.includes(state.deckExplorer.tag)) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const searchBlob = [
        deck.name,
        deck.archetype,
        deck.notes,
        ...(deck.cards || []).map((card) => card.name || ""),
        ...(Array.isArray(deck.tags) ? deck.tags : [])
      ]
        .join(" ")
        .toLowerCase();

      return searchBlob.includes(query);
    })
    .sort((a, b) => {
      const popA = Number(a.popularity || 0);
      const popB = Number(b.popularity || 0);
      return popB - popA || String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function closeDeckDetailModal() {
  if (!elements.deckDetailModal) {
    return;
  }
  elements.deckDetailModal.classList.remove("open");
  elements.deckDetailModal.setAttribute("aria-hidden", "true");
}

function openDeckDetailModal(deckId) {
  const deck = (state.deckExplorer.decks || []).find((item) => String(item.id) === String(deckId));
  if (!deck || !elements.deckDetailModal || !elements.deckDetailContent) {
    return;
  }

  const cards = Array.isArray(deck.cards) ? deck.cards : [];
  const tags = Array.isArray(deck.tags) ? deck.tags : [];

  elements.deckDetailContent.innerHTML = `
    <article class="coach-mini-card">
      <h5>${escapeHtml(deck.name || "Deck")}</h5>
      <p class="deck-line"><strong>Archetype:</strong> ${escapeHtml(deck.archetype || "Unknown")}</p>
      <p class="deck-line"><strong>Average Elixir:</strong> ${Number(deck.averageElixir || 0).toFixed(2)}</p>
      <p class="deck-line"><strong>Source:</strong> ${escapeHtml(deck.source || "Unknown")}${deck.playerName ? ` • ${escapeHtml(deck.playerName)}` : ""}</p>
      <p class="deck-line"><strong>Labels:</strong> ${tags.length ? tags.map((tag) => escapeHtml(tag)).join(", ") : "none"}</p>
      <p class="deck-line"><strong>Notes:</strong> ${escapeHtml(deck.notes || "No notes")}</p>
      <div class="modal-grid-cards">
        ${cards.map((card) => `<div class="modal-card-line">${escapeHtml(card.name || "Unknown")}</div>`).join("")}
      </div>
    </article>
  `;

  elements.deckDetailModal.classList.add("open");
  elements.deckDetailModal.setAttribute("aria-hidden", "false");
  refreshInteractiveMotion();
}

function loadExplorerDeckToBuilder(deckId) {
  const deck = (state.deckExplorer.decks || []).find((item) => String(item.id) === String(deckId));
  if (!deck || !Array.isArray(deck.cards) || deck.cards.length < DECK_SIZE) {
    setStatus("Explorer deck is not available.", "warn");
    return;
  }

  const resolvedCards = deck.cards
    .map((rawCard) => {
      const slug = rawCard?.slug || apiNameToSlug(rawCard?.name || "");
      return slug ? preferredVariantCardForSlug(slug) : null;
    })
    .filter(Boolean);

  if (resolvedCards.length < DECK_SIZE) {
    setStatus("Some cards from this explorer deck do not exist in your local dataset yet.", "warn");
    return;
  }

  state.deck = resolvedCards.slice(0, DECK_SIZE).map((card) => card.id);
  renderAll();
  setStatus(`Loaded explorer deck: ${deck.name}.`, "info");
  addHistoryEntry("explorer", "Explorer deck loaded", deck.name || "Deck");
}

function toggleExplorerFavorite(deckId) {
  const id = String(deckId || "");
  if (!id) {
    return;
  }

  if (state.deckExplorerFavorites.has(id)) {
    state.deckExplorerFavorites.delete(id);
  } else {
    state.deckExplorerFavorites.add(id);
  }

  persistDeckExplorerFavoritesLocal();
  renderDeckExplorer();
}

function renderDeckExplorer() {
  if (!elements.deckExplorerGrid) {
    return;
  }

  const decks = filteredDeckExplorerDecks();

  if (!decks.length) {
    elements.deckExplorerGrid.innerHTML = '<p class="meta">No decks match your current filters.</p>';
  } else {
    elements.deckExplorerGrid.innerHTML = decks
      .map((deck) => {
        const cards = Array.isArray(deck.cards) ? deck.cards.slice(0, DECK_SIZE) : [];
        const tags = Array.isArray(deck.tags) ? deck.tags.slice(0, 4) : [];
        const favorite = state.deckExplorerFavorites.has(deck.id);
        const sourceType = String(deck.sourceType || "").replace(/_/g, " ");

        return `
          <article class="explorer-deck-card motion-tilt">
            <div class="explorer-deck-head">
              <div>
                <h4>${escapeHtml(deck.name || "Deck")}</h4>
                <p class="explorer-deck-sub">${escapeHtml(deck.archetype || "Unknown")} • Avg ${Number(deck.averageElixir || 0).toFixed(2)} • ${escapeHtml(sourceType)}</p>
              </div>
            </div>
            <div class="explorer-card-list">
              ${cards.map((card) => `<span class="explorer-card-chip">${escapeHtml(card.name || "Unknown")}</span>`).join("")}
            </div>
            <div class="explorer-label-row">
              ${tags.map((tag) => `<span class="explorer-label ${deckExplorerTagClass(tag)}">${escapeHtml(tag)}</span>`).join("")}
            </div>
            <p class="deck-line">${escapeHtml(deck.notes || "")}</p>
            <div class="explorer-actions">
              <button class="btn subtle" type="button" data-explorer-load="${escapeHtml(deck.id)}">Load</button>
              <button class="btn ghost" type="button" data-explorer-favorite="${escapeHtml(deck.id)}">${favorite ? "Unfavorite" : "Favorite"}</button>
              <button class="btn ghost" type="button" data-explorer-detail="${escapeHtml(deck.id)}">Details</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (elements.deckExplorerMeta) {
    const meta = state.deckExplorer.meta || {};
    const counts = meta.counts || {};
    const syncedAt = meta.syncedAt ? formatRelativeTime(meta.syncedAt) : "never";
    elements.deckExplorerMeta.textContent = `${decks.length} shown • ${Number(counts.total || state.deckExplorer.decks.length || 0)} total • Synced ${syncedAt}`;
  }

  refreshInteractiveMotion();
}

async function refreshDeckExplorer(forceRefresh = false) {
  if (elements.deckExplorerMeta) {
    elements.deckExplorerMeta.textContent = "Syncing deck explorer...";
  }

  try {
    const suffix = forceRefresh ? "?refresh=1" : "";
    const payload = await appApiRequest(`${DECK_EXPLORER_API}${suffix}`, { method: "GET" }, 12000);

    state.deckExplorer.decks = Array.isArray(payload?.decks) ? payload.decks : [];
    state.deckExplorer.sections = payload?.sections || { topPlayerDecks: [], popularDecks: [], metaDecks: [] };
    state.deckExplorer.meta = payload?.meta || null;

    renderDeckExplorerFilters();
    renderDeckExplorer();

    const errors = Array.isArray(payload?.meta?.errors) ? payload.meta.errors : [];
    if (errors.length) {
      setStatus(`Deck explorer synced with warnings: ${errors[0]}`, "warn");
    } else {
      setStatus(`Deck explorer synced: ${state.deckExplorer.decks.length} decks loaded.`, "info");
    }

    void refreshStatusTracker();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deck explorer sync failed.";
    if (elements.deckExplorerMeta) {
      elements.deckExplorerMeta.textContent = `Deck explorer error: ${message}`;
    }
    setStatus(`Deck explorer error: ${message}`, "bad");
  }
}

function parseTrophyHint(message) {
  const text = String(message || "").toLowerCase();
  const direct = text.match(/(?:at|around|near)\s*(\d{3,5})\s*(?:troph|cup)?/);
  if (direct) {
    return Number(direct[1]);
  }
  const generic = text.match(/(\d{4,5})\s*(?:troph|cups)/);
  if (generic) {
    return Number(generic[1]);
  }
  return 0;
}

function serializeDeckForCoachContext(cards = []) {
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards
    .slice(0, DECK_SIZE)
    .map((card) => ({
      name: card.name,
      slug: card.slug,
      level: state.collectionLoaded ? cardLevel(card) : 0,
      variant: card.variant || "base",
      rarity: card.rarity || "Unknown",
      elixir: numericElixir(card),
      evolutionLevel: state.collectionLoaded ? cardEvolutionLevel(card) : 0
    }));
}

function snapshotDeckForCoachContext(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.cardIds)) {
    return [];
  }
  return serializeDeckForCoachContext(cardsFromSnapshot(snapshot));
}

function ownedCardsForCoachContext() {
  if (!state.collectionLoaded || !Array.isArray(state.ownedCards)) {
    return [];
  }

  return state.ownedCards
    .map((card) => ({
      name: card.name,
      slug: card.slug || "",
      level: Number(card.level ?? 0),
      maxLevel: Number(card.maxLevel ?? 0),
      count: Number(card.count ?? 0),
      evolutionLevel: Number(card.evolutionLevel ?? 0),
      variant: card.variant || "base",
      hasEvoVariant: Boolean(card.hasEvoVariant),
      hasHeroVariant: Boolean(card.hasHeroVariant)
    }))
    .filter((card) => Number.isFinite(card.level) && card.level > 0)
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
    .slice(0, 180);
}

function buildCoachContextPayload(userMessage = "") {
  const currentDeck = serializeDeckForCoachContext(deckCards());
  const lastSuggestedDeck = state.coachRecommendations[0]?.cards?.length
    ? serializeDeckForCoachContext(state.coachRecommendations[0].cards)
    : [];
  const pinnedDeck = snapshotDeckForCoachContext(state.pinnedDeck);

  let collectionStatus = "not loaded";
  if (state.collectionLoaded) {
    collectionStatus = `loaded (${state.ownedCards.length} cards)`;
  }

  const analysisSnippet = state.lastAnalysisText
    ? state.lastAnalysisText.split("\n").slice(0, 4).join(" ").slice(0, 360)
    : "";

  const context = {
    playerName: state.playerProfile?.name || state.loadedPlayerName || "Unknown",
    playerTag: state.playerProfile?.tag || state.loadedPlayerTag || (elements.playerTagInput?.value || "Unknown"),
    trophies: Number(state.playerProfile?.trophies || 0),
    arena: state.playerProfile?.arena || "Unknown",
    preferredPlaystyle: state.playstylePreference || "no_preference",
    currentDeck,
    ownedCards: ownedCardsForCoachContext(),
    favoriteDeck: pinnedDeck,
    lastSuggestedDeck,
    pinnedDeck,
    struggleDecks: [],
    extraNotes: analysisSnippet || "Not provided",
    collectionStatus,
    userMessage
  };

  return context;
}

async function requestCoachReplyFromApi(message, intentData) {
  const payload = {
    message,
    sessionId: state.chatContext.sessionId || "",
    context: buildCoachContextPayload(message)
  };

  const response = await appApiRequest(
    COACH_CHAT_API,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    },
    50000
  );

  const sessionId = String(response?.sessionId || "").trim();
  if (sessionId) {
    state.chatContext.sessionId = sessionId;
    localStorage.setItem(CHAT_SESSION_STORAGE_KEY, sessionId);
  }

  const text = String(response?.reply || "").trim();
  if (!text) {
    throw new Error("Coach returned an empty reply.");
  }

  return {
    text,
    source: String(response?.provider || "ollama")
  };
}

function primeCoachStateForIntent(intentData) {
  if (!intentData || !intentData.intent) {
    return;
  }

  if (intentData.intent === "safe_deck") {
    formatDeckBuildResponse("safest deck control");
  } else if (intentData.intent === "aggressive_deck") {
    formatDeckBuildResponse("most aggressive deck beatdown");
  } else if (intentData.intent === "deck_build") {
    formatDeckBuildResponse(intentData.query || "best deck");
  }
}

function detectCoachIntent(rawMessage) {
  const message = String(rawMessage || "").trim();
  const q = message.toLowerCase();

  const loadMatch = q.match(/^load\s+(\d+)/);
  if (loadMatch) {
    return {
      intent: "load_recommendation",
      index: Number(loadMatch[1]) - 1,
      query: q,
      raw: message,
      trophyHint: parseTrophyHint(q)
    };
  }

  const trophyHint = parseTrophyHint(q);

  if (q.includes("list my cards") || q.includes("show my cards") || q.includes("what do i own") || q.includes("owned cards")) {
    return { intent: "list_cards", query: q, raw: message, trophyHint };
  }

  if (q.includes("upgrade") || q.includes("what should i upgrade") || q.includes("priority")) {
    return { intent: "upgrade", query: q, raw: message, trophyHint };
  }

  if (q.includes("analy") || q.includes("is this deck") || q.includes("rate my deck") || q.includes("bad deck")) {
    return { intent: "analyze", query: q, raw: message, trophyHint };
  }

  if (q.includes("safer") || q.includes("safe version")) {
    return { intent: "safe_deck", query: q, raw: message, trophyHint };
  }

  if (q.includes("aggressive") || q.includes("more pressure") || q.includes("faster version")) {
    return { intent: "aggressive_deck", query: q, raw: message, trophyHint };
  }

  if (q.includes("matchup") || q.includes("counter") || q.includes("hard matchup") || q.includes("i keep losing")) {
    return { intent: "matchup", query: q, raw: message, trophyHint };
  }

  if (q.includes("best deck") || q.includes("build") || q.includes("what deck") || q.includes("should i run") || q.includes("push")) {
    return { intent: "deck_build", query: q, raw: message, trophyHint };
  }

  if (trophyHint > 0 && state.chatContext.lastIntent !== "none") {
    return { intent: "trophy_followup", query: q, raw: message, trophyHint };
  }

  if (q.includes("hello") || q.includes("hey") || q.includes("yo") || q.includes("who are you")) {
    return { intent: "greeting", query: q, raw: message, trophyHint };
  }

  return { intent: "chat", query: q, raw: message, trophyHint };
}

function pushTypingIndicator() {
  if (!elements.chatLog) {
    return null;
  }

  const row = document.createElement("div");
  row.className = "chat-row bot typing";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

  row.appendChild(bubble);
  elements.chatLog.appendChild(row);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;

  return row;
}

function formatMatchupAnswer() {
  const cards = deckCards();
  if (!cards.length) {
    return [
      "Quick Verdict",
      "Limited by missing deck",
      "",
      "Biggest Problem",
      "No active deck is loaded, so matchup advice would be generic and less useful.",
      "",
      "Best Fix",
      "Load an 8-card deck first, then ask for matchup guidance again.",
      "",
      "Full Explanation",
      "Matchup coaching depends on your exact win condition, spells, and defense core. Once your deck is loaded, I can give good/bad/risky matchups and a clean game plan."
    ].join("\n");
  }

  const metrics = calculateMetrics(cards);
  const matchups = matchupOverview(cards, metrics);
  const verdict = deckLadderVerdict(metrics);
  const biggestProblem = deckBiggestProblem(metrics);
  const bestFix = deckBestFix(metrics);

  return [
    "Quick Verdict",
    verdict,
    "",
    "Biggest Problem",
    biggestProblem,
    "",
    "Best Fix",
    bestFix,
    "",
    "Full Explanation",
    `Good matchups: ${matchups.good.join("; ")}.`,
    `Bad matchups: ${matchups.bad.join("; ")}.`,
    `Risky matchups: ${riskyMatchups(cards, metrics).join("; ")}.`,
    `How to play these matchups: ${gamePlanNotes(inferArchetype(cards, metrics, []), metrics).mid}`
  ].join("\n");
}

function formatTrophyFollowup(trophiesHint) {
  const mainDeck = state.coachRecommendations[0]?.cards?.length ? state.coachRecommendations[0].cards : deckCards();
  if (!mainDeck.length) {
    return [
      "Quick Verdict",
      "Limited by missing deck",
      "",
      "Biggest Problem",
      "You asked for trophy-range tuning, but no deck is loaded.",
      "",
      "Best Fix",
      "Load or build a deck first, then ask again with your trophy range.",
      "",
      "Full Explanation",
      `I can tune recommendations for ${trophiesHint || "your"} trophies once I have a real deck to score.`
    ].join("\n");
  }

  const metrics = calculateMetrics(mainDeck);
  const verdict = deckLadderVerdict(metrics);
  const biggestProblem = deckBiggestProblem(metrics);
  const bestFix = deckBestFix(metrics);

  return [
    "Quick Verdict",
    verdict,
    "",
    "Biggest Problem",
    biggestProblem,
    "",
    "Best Fix",
    bestFix,
    "",
    "Full Explanation",
    `At ${trophiesHint} trophies: ${trophyRangeGuidance(trophiesHint)}`,
    `Your best chance right now is to keep this structure clean and avoid forcing bad single-elixir pushes.`,
    `If games feel harder at this range, safer version is usually better than greedier pressure builds.`
  ].join("\n");
}

function simpleCoachChatFallback(rawMessage) {
  const q = String(rawMessage || "").toLowerCase();

  if (q.includes("average elixir") || q.includes("avg elixir")) {
    return "Most ladder-safe decks sit around 3.0 to 4.3 average elixir. Below ~2.9 can lack stopping power, above ~4.5 gets clunky unless your defense is very clean.";
  }

  if (q.includes("elixir trade") || (q.includes("elixir") && q.includes("trade"))) {
    return "Good elixir trades are your win condition setup. Spend less than they spent, defend cleanly, then counterpush while they are low on elixir.";
  }

  if (q.includes("overcommit")) {
    return "Overcommit means you spent too much elixir in one sequence and cannot defend the punish. Keep 3 to 5 elixir in reserve unless you have a guaranteed tower break.";
  }

  if ((q.includes("mega knight") || q.includes("mk")) && q.includes("counter")) {
    return "Best Mega Knight counters are kite + single-target DPS. Pull him with a cheap unit/building, then melt with Mini P.E.K.K.A, Inferno, Prince, or high DPS support.";
  }

  if (q.includes("how many cards") && q.includes("deck")) {
    return "A Clash Royale deck always has 8 cards.";
  }

  if (q.includes("cycle") && (q.includes("faster") || q.includes("fast"))) {
    return "To cycle faster, lower your average elixir, keep at least 2 cheap cards, and avoid stacking too many 5+ elixir cards in one list.";
  }

  if (q.includes("spell") && (q.includes("when") || q.includes("use"))) {
    return "Use spells for reliable value: finish medium-health supports, secure tower chip, and prevent swarm resets. Avoid panic-spelling unless it saves critical damage.";
  }

  if (q.includes("2v2")) {
    return "In 2v2, play slower than ladder, avoid doubling the same role as your teammate, and hold at least one defensive answer for surprise win conditions.";
  }

  return [
    "I can answer normal Clash Royale questions too.",
    "Ask things like: what average elixir is safe, how to counter Mega Knight, when to spell cycle, or how to stop overcommitting."
  ].join(" ");
}

function coachReply(rawMessage) {
  const intentData = detectCoachIntent(rawMessage);
  const intent = intentData.intent;
  const trophiesHint = Number(intentData.trophyHint || 0);

  let text = "";

  if (intent === "load_recommendation") {
    const rec = state.coachRecommendations[intentData.index];
    if (!rec) {
      text = "I do not have that recommendation index yet. Ask for deck recommendations first.";
    } else if (!rec.ready) {
      text = `Recommendation ${intentData.index + 1} is not fully playable yet. Missing: ${rec.missing.join(", ")}.`;
    } else {
      state.deck = rec.cards.map((card) => card.id);
      renderAll();
      text = `Loaded deck ${intentData.index + 1}: ${rec.name}.`;
    }
  } else if (intent === "list_cards") {
    text = listOwnedCardsWithLevels();
  } else if (intent === "analyze") {
    text = explainCurrentDeck();
  } else if (intent === "upgrade") {
    text = formatUpgradeAdviceResponse();
  } else if (intent === "safe_deck") {
    text = formatDeckBuildResponse("safest deck control");
  } else if (intent === "aggressive_deck") {
    text = formatDeckBuildResponse("most aggressive deck beatdown");
  } else if (intent === "deck_build") {
    text = formatDeckBuildResponse(intentData.query || "best deck");
  } else if (intent === "matchup") {
    text = formatMatchupAnswer();
  } else if (intent === "trophy_followup") {
    text = formatTrophyFollowup(trophiesHint || state.chatContext.lastTrophyHint || state.playerProfile?.trophies || 0);
  } else if (intent === "greeting") {
    text = "I am your ladder deck coach. Ask naturally and I will route it: build deck, analyze deck, matchup guidance, or upgrade priorities.";
  } else {
    text = simpleCoachChatFallback(rawMessage);
  }

  state.chatContext.lastIntent = intent;
  state.chatContext.lastMessageAt = isoNow();
  if (trophiesHint > 0) {
    state.chatContext.lastTrophyHint = trophiesHint;
  }
  return {
    intent,
    text
  };
}

async function sendCoachMessage(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return;
  }

  pushChatMessage("user", trimmed);

  const intentData = detectCoachIntent(trimmed);

  if (intentData.intent === "load_recommendation") {
    const immediate = coachReply(trimmed);
    pushChatMessage("bot", immediate.text);
    renderCoachDeckCards(state.coachRecommendations);
    renderComparisonSelectors();
    renderCollectionInsights();
    void pingChatbotStatus(`chat intent: ${immediate.intent}`);
    return;
  }

  primeCoachStateForIntent(intentData);

  const typingRow = pushTypingIndicator();
  await new Promise((resolve) => setTimeout(resolve, 220));

  let outputText = "";
  let outputIntent = intentData.intent;
  let usedFallback = false;

  try {
    const aiReply = await requestCoachReplyFromApi(trimmed, intentData);
    outputText = aiReply.text;

    state.chatContext.lastIntent = outputIntent;
    state.chatContext.lastMessageAt = isoNow();
    if (Number(intentData.trophyHint || 0) > 0) {
      state.chatContext.lastTrophyHint = Number(intentData.trophyHint || 0);
    }
  } catch (error) {
    usedFallback = true;

    const fallback = coachReply(trimmed);
    outputText = fallback.text;
    outputIntent = fallback.intent;

    const reason = error instanceof Error ? error.message : "Ollama coach is unavailable.";
    setStatus(`Ollama coach unavailable, local fallback used: ${reason}`, "warn");
  } finally {
    if (typingRow?.parentNode) {
      typingRow.parentNode.removeChild(typingRow);
    }
  }

  pushChatMessage("bot", outputText);

  renderCoachDeckCards(state.coachRecommendations);
  renderComparisonSelectors();
  renderCollectionInsights();

  if (["deck_build", "safe_deck", "aggressive_deck", "analyze", "upgrade", "matchup", "trophy_followup"].includes(outputIntent)) {
    setAnalysisOutput(outputText);
  }

  void pingChatbotStatus(`${usedFallback ? "fallback" : "ollama"} intent: ${outputIntent}`);
}
function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    renderCatalog();
    renderCollectionInsights();
    refreshInteractiveMotion();
  });

  elements.filterBar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) {
      return;
    }

    state.activeFilter = button.dataset.filter;
    renderAll();
  });

  if (elements.catalogQuickFilters) {
    elements.catalogQuickFilters.addEventListener("click", (event) => {
      const chip = event.target.closest("button[data-catalog-quick]");
      if (!chip) {
        return;
      }

      state.catalogQuickFilter = chip.dataset.catalogQuick || "all";
      renderCatalog();
      renderCollectionInsights();
      refreshInteractiveMotion();
    });
  }

  if (elements.insightUpgradeBtn) {
    elements.insightUpgradeBtn.addEventListener("click", () => {
      void runOneTapMode("upgrade");
    });
  }

  if (elements.insightSafeDeckBtn) {
    elements.insightSafeDeckBtn.addEventListener("click", () => {
      void runOneTapMode("safe");
    });
  }

  elements.catalogGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-add-card]");
    if (!button) {
      return;
    }

    addCard(button.dataset.addCard);
  });

  elements.suggestionList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-add-card]");
    if (!button) {
      return;
    }

    addCard(button.dataset.addCard);
  });

  elements.deckSlots.addEventListener("click", (event) => {
    const slot = event.target.closest("button[data-index]");
    if (!slot) {
      return;
    }

    removeCardAt(Number(slot.dataset.index));
  });

  elements.randomDeckBtn.addEventListener("click", () => {
    const generated = generateRandomDeck();

    if (generated.length < DECK_SIZE) {
      setStatus("Not enough usable cards for random deck at current ownership/level filter.", "warn");
      return;
    }

    state.deck = generated;
    renderAll();
    setStatus("Generated a random balanced deck.");
  });

  elements.clearDeckBtn.addEventListener("click", () => {
    state.deck = [];
    renderAll();
    setStatus("Deck cleared.");
  });

  elements.loadCollectionBtn.addEventListener("click", () => {
    void loadCollectionFromApi();
  });

  elements.clearCollectionBtn.addEventListener("click", () => {
    clearCollection();
  });

  elements.ownedOnlyToggle.addEventListener("change", (event) => {
    if (!state.collectionLoaded) {
      event.target.checked = false;
      state.ownedOnly = false;
      return;
    }

    state.ownedOnly = Boolean(event.target.checked);
    renderAll();
  });

  elements.minLevelInput.addEventListener("change", () => {
    applyMinLevelFromInput();
    if (state.collectionLoaded) {
      pruneDeckForCollection();
    }
    renderAll();
  });

  if (elements.ownedCardsSearchInput) {
    elements.ownedCardsSearchInput.addEventListener("input", (event) => {
      state.ownedCardsSearch = String(event.target.value || "");
      renderOwnedCards();
      refreshInteractiveMotion();
    });
  }

  if (elements.chatForm) {
    elements.chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = elements.chatInput.value || "";
      elements.chatInput.value = "";
      sendCoachMessage(text);
    });
  }

  if (elements.coachCardsBtn) {
    elements.coachCardsBtn.addEventListener("click", () => {
      sendCoachMessage("list my cards");
    });
  }

  if (elements.coachAnalyzeBtn) {
    elements.coachAnalyzeBtn.addEventListener("click", () => {
      sendCoachMessage("analyze my deck");
      void runOneTapMode("analyze");
    });
  }

  if (elements.playstyleSelect) {
    elements.playstyleSelect.addEventListener("change", () => {
      syncPlaystyleFromUI();
      setStatus(`Playstyle set to ${formatPlaystyleLabel(state.playstylePreference)}.`, "info");
    });
  }

  if (elements.saveProfileBtn) {
    elements.saveProfileBtn.addEventListener("click", () => {
      void saveCurrentProfile();
    });
  }

  if (elements.loadProfileBtn) {
    elements.loadProfileBtn.addEventListener("click", () => {
      let selected = elements.savedProfilesSelect?.value || "";
      if (!selected) {
        selected = sanitizePlayerTag(elements.playerTagInput.value);
      }
      if (!selected) {
        setStatus("Choose a saved profile first.", "warn");
        return;
      }
      void loadSavedProfileByTag(selected);
    });
  }

  if (elements.savedProfilesSelect) {
    elements.savedProfilesSelect.addEventListener("change", () => {
      if (elements.savedProfilesSelect.value && elements.playerTagInput) {
        elements.playerTagInput.value = `#${elements.savedProfilesSelect.value}`;
      }
    });
  }

  if (elements.actionPushBtn) {
    elements.actionPushBtn.addEventListener("click", () => {
      void runOneTapMode("push");
    });
  }

  if (elements.actionSafeBtn) {
    elements.actionSafeBtn.addEventListener("click", () => {
      void runOneTapMode("safe");
    });
  }

  if (elements.actionAggroBtn) {
    elements.actionAggroBtn.addEventListener("click", () => {
      void runOneTapMode("aggressive");
    });
  }

  if (elements.actionUpgradeBtn) {
    elements.actionUpgradeBtn.addEventListener("click", () => {
      void runOneTapMode("upgrade");
    });
  }

  if (elements.actionAnalyzeBtn) {
    elements.actionAnalyzeBtn.addEventListener("click", () => {
      void runOneTapMode("analyze");
    });
  }

  if (elements.compareDeckBtn) {
    elements.compareDeckBtn.addEventListener("click", () => {
      compareSelectedDecks();
    });
  }

  if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener("click", () => {
      state.historyEntries = [];
      persistHistoryLocal();
      renderHistory();
      void clearRemoteHistory();
      setStatus("History cleared.", "info");
    });
  }

  if (elements.pinCurrentDeckBtn) {
    elements.pinCurrentDeckBtn.addEventListener("click", () => {
      const cards = deckCards();
      if (!isCompleteDeck(cards)) {
        setStatus("Build a full 8-card deck before pinning.", "warn");
        return;
      }
      setPinnedDeckFromCards(cards, "Pinned Current Deck", "current");
    });
  }

  if (elements.copySummaryBtn) {
    elements.copySummaryBtn.addEventListener("click", () => {
      void copyShareSummary();
    });
  }

  if (elements.generateShareCardBtn) {
    elements.generateShareCardBtn.addEventListener("click", () => {
      generateShareCard();
    });
  }

  if (elements.coachDeckCards) {
    elements.coachDeckCards.addEventListener("click", (event) => {
      const loadBtn = event.target.closest("button[data-load-reco]");
      if (loadBtn) {
        const index = Number(loadBtn.dataset.loadReco) - 1;
        const rec = state.coachRecommendations[index];
        if (!rec || !isCompleteDeck(rec.cards)) {
          setStatus("Deck recommendation is not ready.", "warn");
          return;
        }

        state.deck = rec.cards.map((card) => card.id);
        renderAll();
        setStatus(`Loaded ${rec.name}.`, "info");
        addHistoryEntry("recommend", "Recommendation loaded", rec.name);
        return;
      }

      const pinBtn = event.target.closest("button[data-pin-reco]");
      if (pinBtn) {
        const index = Number(pinBtn.dataset.pinReco) - 1;
        const rec = state.coachRecommendations[index];
        if (!rec || !isCompleteDeck(rec.cards)) {
          setStatus("Deck recommendation is not ready.", "warn");
          return;
        }
        setPinnedDeckFromCards(rec.cards, rec.name, "recommendation");
        return;
      }

      const compareABtn = event.target.closest("button[data-compare-a]");
      if (compareABtn) {
        state.compareSelectionA = compareABtn.dataset.compareA;
        renderComparisonSelectors();
        if (elements.compareDeckA) {
          elements.compareDeckA.value = state.compareSelectionA;
        }
        setStatus("Compare A set.", "info");
        return;
      }

      const compareBBtn = event.target.closest("button[data-compare-b]");
      if (compareBBtn) {
        state.compareSelectionB = compareBBtn.dataset.compareB;
        renderComparisonSelectors();
        if (elements.compareDeckB) {
          elements.compareDeckB.value = state.compareSelectionB;
        }
        setStatus("Compare B set.", "info");
        return;
      }

      const shareBtn = event.target.closest("button[data-share-reco]");
      if (shareBtn) {
        const index = Number(shareBtn.dataset.shareReco) - 1;
        const rec = state.coachRecommendations[index];
        if (!rec || !isCompleteDeck(rec.cards)) {
          setStatus("Deck recommendation is not ready.", "warn");
          return;
        }

        const text = buildShareSummary(rec.name, rec.cards);
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(text)
            .then(() => setStatus("Deck summary copied.", "info"))
            .catch(() => setStatus("Copy failed.", "bad"));
        } else {
          setStatus("Clipboard API unavailable.", "bad");
        }
      }
    });
  }

  if (elements.refreshStatusBtn) {
    elements.refreshStatusBtn.addEventListener("click", () => {
      void refreshStatusTracker();
    });
  }

  if (elements.syncDeckDbBtn) {
    elements.syncDeckDbBtn.addEventListener("click", () => {
      void refreshDeckExplorer(true);
    });
  }

  if (elements.refreshDeckExplorerBtn) {
    elements.refreshDeckExplorerBtn.addEventListener("click", () => {
      void refreshDeckExplorer(true);
    });
  }

  if (elements.deckExplorerSearchInput) {
    elements.deckExplorerSearchInput.addEventListener("input", (event) => {
      state.deckExplorer.search = String(event.target.value || "");
      renderDeckExplorer();
    });
  }

  if (elements.deckExplorerArchetypeSelect) {
    elements.deckExplorerArchetypeSelect.addEventListener("change", (event) => {
      state.deckExplorer.archetype = String(event.target.value || "all");
      renderDeckExplorer();
    });
  }

  if (elements.deckExplorerSourceSelect) {
    elements.deckExplorerSourceSelect.addEventListener("change", (event) => {
      state.deckExplorer.sourceType = String(event.target.value || "all");
      renderDeckExplorer();
    });
  }

  if (elements.deckExplorerTagSelect) {
    elements.deckExplorerTagSelect.addEventListener("change", (event) => {
      state.deckExplorer.tag = String(event.target.value || "all");
      renderDeckExplorer();
    });
  }

  if (elements.deckExplorerFavoritesToggle) {
    elements.deckExplorerFavoritesToggle.addEventListener("change", (event) => {
      state.deckExplorer.favoritesOnly = Boolean(event.target.checked);
      renderDeckExplorer();
    });
  }

  if (elements.deckExplorerGrid) {
    elements.deckExplorerGrid.addEventListener("click", (event) => {
      const loadBtn = event.target.closest("button[data-explorer-load]");
      if (loadBtn) {
        loadExplorerDeckToBuilder(loadBtn.dataset.explorerLoad || "");
        return;
      }

      const favoriteBtn = event.target.closest("button[data-explorer-favorite]");
      if (favoriteBtn) {
        toggleExplorerFavorite(favoriteBtn.dataset.explorerFavorite || "");
        return;
      }

      const detailBtn = event.target.closest("button[data-explorer-detail]");
      if (detailBtn) {
        openDeckDetailModal(detailBtn.dataset.explorerDetail || "");
      }
    });
  }

  if (elements.deckModalCloseBtn) {
    elements.deckModalCloseBtn.addEventListener("click", () => {
      closeDeckDetailModal();
    });
  }

  if (elements.deckDetailModal) {
    elements.deckDetailModal.addEventListener("click", (event) => {
      if (event.target === elements.deckDetailModal) {
        closeDeckDetailModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDeckDetailModal();
    }
  });

}

function initialize() {
  const storedTag = localStorage.getItem(PLAYER_TAG_STORAGE_KEY);
  if (storedTag) {
    elements.playerTagInput.value = storedTag;
  }

  const storedMin = Number(localStorage.getItem(MIN_LEVEL_STORAGE_KEY) || 1);
  state.minOwnedLevel = Number.isFinite(storedMin) ? Math.max(1, Math.min(MAX_CARD_LEVEL, Math.floor(storedMin))) : 1;
  elements.minLevelInput.value = String(state.minOwnedLevel);

  loadLocalCoachState();
  loadDeckExplorerFavoritesLocal();

  elements.datasetSummary.textContent = `${CARD_META.base_count} base cards • ${CARD_META.evolution_count} evolutions • ${CARD_META.hero_count} heroes • ${CARD_META.champion_count} champions`;

  bindEvents();
  renderAll();
  renderPinnedDeck();
  renderHistory();
  renderComparisonSelectors();

  initializeInteractiveMotion();
  refreshInteractiveMotion();

  void refreshSavedProfilesList();
  void refreshStatusTracker();
  void refreshDeckExplorer(false);
  void preloadCatalogArt();
  startStatusPolling();
  window.addEventListener("beforeunload", () => {
    if (state.statusPollTimer) {
      clearInterval(state.statusPollTimer);
    }
  });
  pushChatMessage("bot", "Ollama coach live. Ask your coach anything: deck fixes, upgrades, matchups, or push strategy.");
  setStatus("Dataset loaded: 121 cards + evolutions + heroes.");
}

initialize();
