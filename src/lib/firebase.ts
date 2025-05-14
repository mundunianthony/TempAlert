import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyflZ6cKrDa2SmHMz5es3Oxn62u3fJQtI",
  authDomain: "tempalert-7abb2.firebaseapp.com",
  projectId: "tempalert-7abb2",
  storageBucket: "tempalert-7abb2.appspot.com",
  messagingSenderId: "952450715967",
  appId: "1:952450715967:web:558fc36f4eefb7da2ac38a",
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Services
const authInstance = getAuth(app);
const firestoreInstance = getFirestore(app);

// Export
export { authInstance as auth, firestoreInstance, getFirestore };
