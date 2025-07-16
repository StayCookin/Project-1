// firebase-config.js
// Centralized Firebase configuration and initialization

// Only include this file ONCE in your HTML before any Firebase usage
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAXKk5gRjwSGK_g9f_HP_f4y4445e_8l4w",
  authDomain: "project-1-1e31c.firebaseapp.com",
  projectId: "project-1-1e31c",
  storageBucket: "project-1-1e31c.appspot.com",
  messagingSenderId: "658275930203",
  appId: "1:658275930203:web:afc2e2a249509737b0ef7e",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

window.app = app;
window.auth = getAuth(app);
window.firestore = getFirestore(app);
window.storage = getStorage(app);
// Initialize Firebase only if not already initialized

export { app, auth, firestore, storage };
