// js/firebase-init.js
// Initialisation Firebase + helpers pour A-Cadémie

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 👉 COLLE ICI LA CONFIG DE TON PROJET (celle d'A-Quest)
const firebaseConfig = {
  apiKey: "AIzaSyC5zlM-40tu4k3xD3rJH13HR-mh8D9_JM0",
  authDomain: "sporting-anywhere.firebaseapp.com",
  databaseURL: "https://sporting-anywhere-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sporting-anywhere",
  storageBucket: "sporting-anywhere.firebasestorage.app",
  messagingSenderId: "1053011055365",
  appId: "1:1053011055365:web:6fc7d8e048520d0eca1d6c",
  measurementId: "G-5YZ2H39PVZ"
};

let app = null;
let auth = null;
let db = null;

// Initialise Firebase une seule fois
function ensureApp() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
}

// Sign-in anonyme si besoin, ou réutilise un user déjà connecté
export function initFirebaseAndAcad() {
  ensureApp();

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          // Personne n'est connecté -> on passe en anonyme
          const cred = await signInAnonymously(auth);
          user = cred.user;
        }
        resolve({ app, auth, db, user });
      } catch (e) {
        console.error("Erreur d'auth Firebase", e);
        reject(e);
      }
    }, reject);
  });
}

// Charge la progression A-Cadémie pour un uid donné
export async function loadAcadProgress(uid) {
  ensureApp();
  const ref = doc(db, "users", uid, "acad", "progress");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Sauvegarde la progression A-Cadémie pour un uid donné
export async function saveAcadProgress(uid, data) {
  ensureApp();
  const ref = doc(db, "users", uid, "acad", "progress");
  const payload = {
    ...data,
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, payload, { merge: true });
}
