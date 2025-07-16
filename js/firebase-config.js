// firebase-config.js
// Centralized Firebase configuration and initialization

// Only include this file ONCE in your HTML before any Firebase usage

const firebaseConfig = {
  apiKey: "AIzaSyAXKk5gRjwSGK_g9f_HP_f4y4445e_8l4w",
  authDomain: "project-1-1e31c.firebaseapp.com",
  projectId: "project-1-1e31c",
  storageBucket: "project-1-1e31c.appspot.com",
  messagingSenderId: "658275930203",
  appId: "1:658275930203:web:afc2e2a249509737b0ef7e",
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
