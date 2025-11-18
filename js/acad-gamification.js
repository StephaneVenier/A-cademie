// js/acad-gamification.js
// Gamification locale + sync Firebase (si dispo)

import {
  initFirebaseAndAcad,
  loadAcadProgress,
  saveAcadProgress
} from "./firebase-init.js";

const STORAGE_KEY = "acad_gamification_state";

const defaultState = {
  xp: 0,
  level: 1,
  readArticles: [],
  completedQuizzes: [],
  perfectQuizzes: [],
  sharedArticles: []
};

let runtimeState = { ...defaultState };
let firebaseReady = false;
let firebaseUid = null;
let syncInProgress = false;

// ---------- LOCAL STORAGE ----------

function loadLocalState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      readArticles: parsed.readArticles || [],
      completedQuizzes: parsed.completedQuizzes || [],
      perfectQuizzes: parsed.perfectQuizzes || [],
      sharedArticles: parsed.sharedArticles || []
    };
  } catch (e) {
    console.warn("Erreur chargement état local", e);
    return { ...defaultState };
  }
}

function saveLocalState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- FUSION LOCAL + DISTANT ----------

function mergeStates(local, remote) {
  if (!remote) return local;

  const merged = { ...local };

  // XP / level : on prend le plus élevé (simple et safe)
  if (typeof remote.xp === "number" && remote.xp > merged.xp) {
    merged.xp = remote.xp;
  }
  if (typeof remote.level === "number" && remote.level > merged.level) {
    merged.level = remote.level;
  }

  function mergeArray(key) {
    const l = Array.isArray(local[key]) ? local[key] : [];
    const r = Array.isArray(remote[key]) ? remote[key] : [];
    merged[key] = Array.from(new Set([...l, ...r]));
  }

  mergeArray("readArticles");
  mergeArray("completedQuizzes");
  mergeArray("perfectQuizzes");
  mergeArray("sharedArticles");

  return merged;
}

// ---------- NIVEAU + XP ----------

function xpNeededForLevel(level) {
  return 100 * level;
}

function checkLevelUp(state) {
  let changed = false;
  while (state.xp >= xpNeededForLevel(state.level)) {
    state.level += 1;
    changed = true;
  }
  return changed;
}

function addXp(state, amount) {
  state.xp += amount;
  checkLevelUp(state);
  saveLocalState(state);
  queueRemoteSave();
}

// ---------- UI PROFIL ----------

function updateProfileUI(state) {
  const levelSpan = document.getElementById("acad-level");
  const xpSpan = document.getElementById("acad-xp");
  const nextLevelSpan = document.getElementById("acad-next-level");
  const xpToNextSpan = document.getElementById("acad-xp-to-next");
  const xpBar = document.getElementById("acad-xp-bar");

  if (!levelSpan || !xpSpan || !nextLevelSpan || !xpToNextSpan || !xpBar) return;

  const level = state.level;
  const xp = state.xp;
  const currentLevelXpRequired = xpNeededForLevel(level);
  const prevLevelTotalXp = xpNeededForLevel(level - 1) || 0;

  const xpIntoLevel = xp - prevLevelTotalXp;
  const xpLevelSpan = currentLevelXpRequired - prevLevelTotalXp || 1;
  const ratio = Math.max(0, Math.min(1, xpIntoLevel / xpLevelSpan));

  levelSpan.textContent = level;
  xpSpan.textContent = xp;
  nextLevelSpan.textContent = level + 1;
  xpToNextSpan.textContent = xpIntoLevel + "/" + xpLevelSpan;
  xpBar.style.width = ratio * 100 + "%";
}

// ---------- SYNC FIREBASE ----------

async function syncFromFirebase() {
  if (!firebaseReady || !firebaseUid) return;
  try {
    const remote = await loadAcadProgress(firebaseUid);
    const local = runtimeState;
    const merged = mergeStates(local, remote);
    runtimeState = merged;
    saveLocalState(merged);
    updateProfileUI(merged);
  } catch (e) {
    console.warn("Erreur de lecture Firestore", e);
  }
}

let saveTimeout = null;

function queueRemoteSave() {
  if (!firebaseReady || !firebaseUid) return;
  if (syncInProgress) return;

  if (saveTimeout) window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(async () => {
    try {
      syncInProgress = true;
      await saveAcadProgress(firebaseUid, runtimeState);
    } catch (e) {
      console.warn("Erreur de sauvegarde Firestore", e);
    } finally {
      syncInProgress = false;
    }
  }, 800); // on regroupe les petites modifications
}

// ---------- API PUBLIQUE ----------

const api = {
  getState() {
    return { ...runtimeState };
  },

  initProfileWidget() {
    updateProfileUI(runtimeState);
  },

  markArticleRead(articleId, xpReward) {
    if (!runtimeState.readArticles.includes(articleId)) {
      runtimeState.readArticles.push(articleId);
      addXp(runtimeState, xpReward || 20);
    } else {
      saveLocalState(runtimeState);
      queueRemoteSave();
    }
    updateProfileUI(runtimeState);
    return runtimeState;
  },

  registerQuizResult(articleId, score, total) {
    const ratio = total > 0 ? score / total : 0;

    if (!runtimeState.completedQuizzes.includes(articleId)) {
      runtimeState.completedQuizzes.push(articleId);
    }
    if (ratio === 1 && !runtimeState.perfectQuizzes.includes(articleId)) {
      runtimeState.perfectQuizzes.push(articleId);
    }

    let bonus = 10;
    if (ratio === 1) bonus = 30;
    else if (ratio >= 0.7) bonus = 20;

    addXp(runtimeState, bonus);
    updateProfileUI(runtimeState);
    return runtimeState;
  },

  registerShare(articleId, xpReward) {
    if (!runtimeState.sharedArticles.includes(articleId)) {
      runtimeState.sharedArticles.push(articleId);
      addXp(runtimeState, xpReward || 15);
    } else {
      saveLocalState(runtimeState);
      queueRemoteSave();
    }
    updateProfileUI(runtimeState);
    return runtimeState;
  },

  isArticleRead(articleId) {
    return runtimeState.readArticles.includes(articleId);
  },

  hasPerfectQuiz(articleId) {
    return runtimeState.perfectQuizzes.includes(articleId);
  },

  isShared(articleId) {
    return runtimeState.sharedArticles.includes(articleId);
  }
};

// On expose l'API comme avant
window.acadGamification = api;

// ---------- INITIALISATION ----------

document.addEventListener("DOMContentLoaded", async () => {
  // 1) On charge d'abord l'état local (comme avant)
  runtimeState = loadLocalState();
  updateProfileUI(runtimeState);

  // 2) On initialise Firebase en arrière-plan
  try {
    const { user } = await initFirebaseAndAcad();
    firebaseReady = true;
    firebaseUid = user.uid;

    // 3) On essaie de fusionner avec ce qu'il y a dans Firestore
    await syncFromFirebase();
  } catch (e) {
    console.warn("Firebase non dispo, on reste 100% local", e);
    firebaseReady = false;
    firebaseUid = null;
  }
});
