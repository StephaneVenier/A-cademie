// js/acad-gamification.js
// Gestion simple de l'XP locale + articles + quiz + partages

(function () {
  const STORAGE_KEY = "acad_profile_v1";
  const ARTICLE_KEY = "acad_articles_v1";
  const QUIZ_KEY = "acad_quiz_v1";
  const SHARE_KEY = "acad_share_v1";

  const dom = {
    xp: document.getElementById("acad-xp"),
    level: document.getElementById("acad-level"),
    nextLevel: document.getElementById("acad-next-level"),
    xpToNext: document.getElementById("acad-xp-to-next"),
    xpBar: document.getElementById("acad-xp-bar")
  };

  // ----- Profil / XP -----

  let profile = loadProfile();

  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { xp: 0, level: 1 };
      }
      const data = JSON.parse(raw);
      if (typeof data.xp !== "number" || typeof data.level !== "number") {
        return { xp: 0, level: 1 };
      }
      return data;
    } catch (e) {
      return { xp: 0, level: 1 };
    }
  }

  function saveProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  // courbe de niveau très simple
  function xpNeededForLevel(level) {
    // exemple : 100 XP pour passer chaque niveau (tu peux ajuster)
    return 100 + (level - 1) * 20;
  }

  function recomputeLevelFromXp() {
    let lvl = 1;
    let xpLeft = profile.xp;
    let need = xpNeededForLevel(lvl);
    while (xpLeft >= need) {
      xpLeft -= need;
      lvl++;
      need = xpNeededForLevel(lvl);
      if (lvl > 100) break; // sécurité
    }
    profile.level = lvl;
  }

  function updateUI() {
    if (!dom.xp || !dom.level || !dom.nextLevel || !dom.xpToNext || !dom.xpBar) return;

    recomputeLevelFromXp();

    const currentLevel = profile.level;
    const prevLevel = Math.max(1, currentLevel - 1);

    // XP cumulée pour atteindre le niveau actuel
    let xpAtPrev = 0;
    for (let l = 1; l < currentLevel; l++) {
      xpAtPrev += xpNeededForLevel(l);
    }
    const xpForThisLevel = xpNeededForLevel(currentLevel);
    const xpInThisLevel = profile.xp - xpAtPrev;
    const ratio = Math.max(0, Math.min(1, xpInThisLevel / xpForThisLevel));

    dom.xp.textContent = Math.round(profile.xp);
    dom.level.textContent = currentLevel;
    dom.nextLevel.textContent = currentLevel + 1;
    dom.xpToNext.textContent = `${Math.round(xpInThisLevel)} / ${xpForThisLevel}`;
    dom.xpBar.style.width = (ratio * 100).toFixed(1) + "%";
  }

  function addXp(amount) {
    if (!amount || amount <= 0) return;
    profile.xp += amount;
    saveProfile();
    updateUI();
  }

  // ----- Articles (lecture) -----

  function getArticleStore() {
    try {
      return JSON.parse(localStorage.getItem(ARTICLE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveArticleStore(store) {
    localStorage.setItem(ARTICLE_KEY, JSON.stringify(store));
  }

  function markArticleRead(articleId, xpGain) {
    if (!articleId) return;
    const store = getArticleStore();

    if (store[articleId] && store[articleId].read) {
      // déjà compté → pas de nouvelle XP
      return;
    }

    store[articleId] = {
      read: true,
      xpGain: xpGain || 0,
      timestamp: Date.now()
    };
    saveArticleStore(store);

    if (xpGain && xpGain > 0) {
      addXp(xpGain);
    }
  }

  function isArticleRead(articleId) {
    if (!articleId) return false;
    const store = getArticleStore();
    return !!(store[articleId] && store[articleId].read);
  }

  // ----- Quiz -----

  function getQuizStore() {
    try {
      return JSON.parse(localStorage.getItem(QUIZ_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveQuizStore(store) {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(store));
  }

  /**
   * Enregistre le résultat d'un quiz.
   * ➜ L'XP n'est donnée QU'UNE SEULE FOIS par article (ARTICLE_ID).
   */
  function registerQuizResult(articleId, score, total) {
    if (!articleId || typeof score !== "number" || typeof total !== "number" || total <= 0) return;

    const store = getQuizStore();
    const existing = store[articleId] || {};

    // 🔒 Si l'XP a déjà été donnée pour ce quiz → on ne refait rien
    if (existing.xpGranted) {
      // On peut juste mettre à jour le bestScore pour info, sans XP
      if (score > (existing.bestScore || 0)) {
        store[articleId].bestScore = score;
        saveQuizStore(store);
      }
      return;
    }

    const ratio = score / total;
    let xpGain = 0;

    // ➜ adapte ici si tu veux d'autres valeurs
    if (ratio === 1) {
      xpGain = 25; // tout bon
    } else if (ratio >= 0.7) {
      xpGain = 15;
    } else if (ratio >= 0.4) {
      xpGain = 10;
    } else {
      xpGain = 5; // tu peux mettre 0 si tu veux seulement récompenser les bons scores
    }

    if (xpGain > 0) {
      addXp(xpGain);
    }

    store[articleId] = {
      xpGranted: true,
      bestScore: Math.max(existing.bestScore || 0, score),
      lastScore: score,
      total: total,
      timestamp: Date.now()
    };
    saveQuizStore(store);
  }

  // ----- Partages -----

  function getShareStore() {
    try {
      return JSON.parse(localStorage.getItem(SHARE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveShareStore(store) {
    localStorage.setItem(SHARE_KEY, JSON.stringify(store));
  }

  /**
   * Enregistre un partage d'article.
   * ➜ L'XP de partage ne doit être donnée qu'UNE SEULE FOIS par ARTICLE_ID.
   */
  function registerShare(articleId, xpGain) {
    if (!articleId) return;
    const store = getShareStore();
    if (store[articleId] && store[articleId].xpGranted) {
      // déjà récompensé pour ce partage
      return;
    }

    store[articleId] = {
      xpGranted: true,
      xpGain: xpGain || 0,
      timestamp: Date.now()
    };
    saveShareStore(store);

    if (xpGain && xpGain > 0) {
      addXp(xpGain);
    }
  }

  // ----- Init -----
  updateUI();

  // On expose l'API globale attendue par tes pages
  window.acadGamification = {
    markArticleRead,
    isArticleRead,
    registerQuizResult,
    registerShare
  };
})();
