// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEz0N6IcIMTC11wHzECzY1-MlyRCW9hDY",
  authDomain: "safety-map-app-924b0.firebaseapp.com",
  projectId: "safety-map-app-924b0",
  storageBucket: "safety-map-app-924b0.firebasestorage.app",
  messagingSenderId: "855836940606",
  appId: "1:855836940606:web:d0461dc2250b8c82c5346f",
  measurementId: "G-GZ7PS06HJ3"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
