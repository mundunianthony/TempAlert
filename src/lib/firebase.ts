// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyflZ6cKrDa2SmHMz5es3Oxn62u3fJQtI",
  authDomain: "tempalert-7abb2.firebaseapp.com",
  projectId: "tempalert-7abb2",
  storageBucket: "tempalert-7abb2.firebasestorage.app",
  messagingSenderId: "952450715967",
  appId: "1:952450715967:web:558fc36f4eefb7da2ac38a",
  databaseURL: "YOUR_DATABASE_URL", // Add this line
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
export { app, auth, database };
