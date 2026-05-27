import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCAS97mk3dOezWYbBAuyqhVQSbjLbs8t1k",
    authDomain: "super-duper-octo-enigma.firebaseapp.com",
    databaseURL: "https://super-duper-octo-enigma-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "super-duper-octo-enigma",
    storageBucket: "super-duper-octo-enigma.firebasestorage.app",
    messagingSenderId: "824244909415",
    appId: "1:824244909415:web:27043c530fa5c570442bc2",
    measurementId: "G-NBHB9RT94J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Firebase Analytics could not be initialized.");
}

// Sign in anonymously
signInAnonymously(auth)
    .then(() => {
        console.log("Signed in anonymously to Firebase.");
    })
    .catch((error) => {
        console.error("Error signing in anonymously:", error);
    });

export { app, database, auth };
