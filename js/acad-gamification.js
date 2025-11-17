
// A-Cadémie — Gamification locale simple (partagée)
// Stockage dans localStorage sous forme d'objet unique.

(function () {
  const STORAGE_KEY = "acad_gamification_state";

  const defaultState = {
    xp: 0,
    level: 1,
    readArticles: [],    // ["vma", ...]
    completedQuizzes: [],// ["vma", ...]
    perfectQuizzes: [],  // ["vma", ...]
    sharedArticles: []   // ["vma", ...]
  };

  function loadState() {
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
      console.warn("Erreur chargement état gamification", e);
      return { ...defaultState };
    }
  }

  function saveState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

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
    saveState(state);
  }

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
    xpBar.style.width = (ratio * 100) + "%";
  }

  // API publique
  const api = {
    getState() {
      return loadState();
    },

    initProfileWidget() {
      const st = loadState();
      updateProfileUI(st);
    },

    markArticleRead(articleId, xpReward) {
      const state = loadState();
      if (!state.readArticles.includes(articleId)) {
        state.readArticles.push(articleId);
        addXp(state, xpReward || 20);
      } else {
        saveState(state);
      }
      updateProfileUI(state);
      return state;
    },

    registerQuizResult(articleId, score, total) {
      const state = loadState();
      const ratio = total > 0 ? score / total : 0;
      if (!state.completedQuizzes.includes(articleId)) {
        state.completedQuizzes.push(articleId);
      }
      if (ratio === 1 && !state.perfectQuizzes.includes(articleId)) {
        state.perfectQuizzes.push(articleId);
      }
      let bonus = 10;
      if (ratio === 1) bonus = 30;
      else if (ratio >= 0.7) bonus = 20;
      addXp(state, bonus);
      updateProfileUI(state);
      return state;
    },

    registerShare(articleId, xpReward) {
      const state = loadState();
      if (!state.sharedArticles.includes(articleId)) {
        state.sharedArticles.push(articleId);
        addXp(state, xpReward || 15);
      } else {
        saveState(state);
      }
      updateProfileUI(state);
      return state;
    },

    isArticleRead(articleId) {
      const state = loadState();
      return state.readArticles.includes(articleId);
    },

    hasPerfectQuiz(articleId) {
      const state = loadState();
      return state.perfectQuizzes.includes(articleId);
    },

    isShared(articleId) {
      const state = loadState();
      return state.sharedArticles.includes(articleId);
    }
  };

  window.acadGamification = api;

  document.addEventListener("DOMContentLoaded", () => {
    api.initProfileWidget();
  });
})();
