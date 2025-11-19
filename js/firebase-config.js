// Configuration Firebase pour A-Cadémie
// ➜ Remplace les valeurs ci-dessous par celles de TON projet Firebase.
//   (Console Firebase > Paramètres du projet > Config SDK Web)

if (typeof firebase !== "undefined") {
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

  if (firebase.apps && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}
