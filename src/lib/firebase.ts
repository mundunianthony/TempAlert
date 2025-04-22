// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Using Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyflZ6cKrDa2SmHMz5es3Oxn62u3fJQtI",
  authDomain: "tempalert-7abb2.firebaseapp.com",
  projectId: "tempalert-7abb2",
  storageBucket: "tempalert-7abb2.appspot.com",
  messagingSenderId: "952450715967",
  appId: "1:952450715967:web:558fc36f4eefb7da2ac38a",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getFirestore(app);
export { app, auth, database }; 