// Configuration Firebase pour A-Cadémie
// ➜ Remplace les valeurs ci-dessous par celles de TON projet Firebase.
//   (Console Firebase > Paramètres du projet > Config SDK Web)

if (typeof firebase !== "undefined") {
  const firebaseConfig = {
    apiKey: "REMPLACE-MOI",
    authDomain: "REMPLACE-MOI.firebaseapp.com",
    projectId: "REMPLACE-MOI",
    storageBucket: "REMPLACE-MOI.appspot.com",
    messagingSenderId: "REMPLACE-MOI",
    appId: "REMPLACE-MOI"
  };

  if (firebase.apps && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}
