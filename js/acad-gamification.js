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
    dom.nextLevel.textContent
