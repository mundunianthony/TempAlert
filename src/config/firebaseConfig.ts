// src/config/firebaseConfig.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJflU88O0LJWl4jhzudI2gxDogKyOAsFI",
  authDomain: "tempalert-56e58.firebaseapp.com",
  projectId: "tempalert-56e58",
  storageBucket: "tempalert-56e58.appspot.com", // fixed typo (.app -> .com)
  messagingSenderId: "571700583727",
  appId: "1:571700583727:web:d3e09ffe219383065795da"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
