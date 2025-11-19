// Remplace ces valeurs par celles de TON projet Firebase
// (console Firebase > Paramètres du projet > Config SDK Web)
var firebaseConfig = {
  apiKey: "REMPLACE-MOI",
  authDomain: "REMPLACE-MOI.firebaseapp.com",
  projectId: "REMPLACE-MOI",
  storageBucket: "REMPLACE-MOI.appspot.com",
  messagingSenderId: "REMPLACE-MOI",
  appId: "REMPLACE-MOI"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var auth = firebase.auth();
var db = firebase.firestore();
