// A-Cadémie — Synchronisation facultative avec Firebase (auth anonyme + Firestore)
// Cette couche laisse la gamification locale telle quelle (localStorage),
// et synchronise l'état vers Firestore si Firebase est correctement configuré.

(function () {
  const STORAGE_KEY = "acad_gamification_state";

  function hasFirebase() {
    return typeof firebase !== "undefined" &&
           firebase.apps &&
           firebase.apps.length > 0 &&
           typeof firebase.firestore === "function" &&
           typeof firebase.auth === "function";
  }

  if (!hasFirebase()) {
    return; // Firebase non disponible ou non configuré
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  function getLocalState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          xp: 0,
          level: 1,
          readArticles: [],
          completedQuizzes: [],
          perfectQuizzes: [],
          sharedArticles: []
        };
      }
      const parsed = JSON.parse(raw);
      return {
        xp: parsed.xp || 0,
        level: parsed.level || 1,
        readArticles: parsed.readArticles || [],
        completedQuizzes: parsed.completedQuizzes || [],
        perfectQuizzes: parsed.perfectQuizzes || [],
        sharedArticles: parsed.sharedArticles || []
      };
    } catch (e) {
      console.warn("Firebase sync — erreur lecture état local", e);
      return {
        xp: 0,
        level: 1,
        readArticles: [],
        completedQuizzes: [],
        perfectQuizzes: [],
        sharedArticles: []
      };
    }
  }

  function setLocalState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (window.acadGamification && typeof window.acadGamification.initProfileWidget === "function") {
        window.acadGamification.initProfileWidget();
      }
    } catch (e) {
      console.warn("Firebase sync — erreur écriture état local", e);
    }
  }

  function mergeArraysUnique(a, b) {
    const set = new Set([].concat(a || [], b || []));
    return Array.from(set);
  }

  function mergeStates(local, remote) {
    if (!remote) return local;
    return {
      xp: Math.max(local.xp || 0, remote.xp || 0),
      level: Math.max(local.level || 1, remote.level || 1),
      readArticles: mergeArraysUnique(local.readArticles, remote.readArticles),
      completedQuizzes: mergeArraysUnique(local.completedQuizzes, remote.completedQuizzes),
      perfectQuizzes: mergeArraysUnique(local.perfectQuizzes, remote.perfectQuizzes),
      sharedArticles: mergeArraysUnique(local.sharedArticles, remote.sharedArticles)
    };
  }

  function attachMethodSync(api, docRef, methodName) {
    const original = api[methodName];
    if (typeof original !== "function") return;
    api[methodName] = function () {
      const result = original.apply(api, arguments);
      try {
        const state = api.getState ? api.getState() : getLocalState();
        docRef.set(state, { merge: true }).catch(function (e) {
          console.warn("Firebase sync — erreur mise à jour Firestore", e);
        });
      } catch (e) {
        console.warn("Firebase sync — erreur récupération état pour Firestore", e);
      }
      return result;
    };
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      auth.signInAnonymously().catch(function (e) {
        console.warn("Firebase sync — erreur auth anonyme", e);
      });
      return;
    }

    const uid = user.uid;
    const docRef = db.collection("users").doc(uid);

    docRef.get().then(function (snap) {
      const localState = getLocalState();
      if (snap.exists) {
        const remote = snap.data();
        const merged = mergeStates(localState, remote || {});
        setLocalState(merged);
        docRef.set(merged, { merge: true }).catch(function (e) {
          console.warn("Firebase sync — erreur enregistrement état fusionné", e);
        });
      } else {
        // Pas encore de doc côté Firestore → on enregistre l'état local actuel
        docRef.set(localState, { merge: true }).catch(function (e) {
          console.warn("Firebase sync — erreur création doc Firestore", e);
        });
      }

      // Lorsque la gamification est prête, on attache la synchro sur certaines méthodes
      if (window.acadGamification) {
        ["markArticleRead", "registerQuizResult", "registerShare"].forEach(function (name) {
          attachMethodSync(window.acadGamification, docRef, name);
        });
      } else {
        // Si la gamification est chargée après, on attend le DOMContentLoaded
        document.addEventListener("DOMContentLoaded", function () {
          if (!window.acadGamification) return;
          ["markArticleRead", "registerQuizResult", "registerShare"].forEach(function (name) {
            attachMethodSync(window.acadGamification, docRef, name);
          });
        });
      }
    }).catch(function (e) {
      console.warn("Firebase sync — erreur lecture doc Firestore", e);
    });
  });
})();
