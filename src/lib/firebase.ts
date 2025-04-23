// src/lib/firebase.ts

import { getApps, initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Your Firebase “web” config; you only need this to register your app.
// RNFirebase reads all other settings from native config files automatically.
const firebaseConfig = {
  apiKey: "AIzaSyCyflZ6cKrDa2SmHMz5es3Oxn62u3fJQtI",
  authDomain: "tempalert-7abb2.firebaseapp.com",
  projectId: "tempalert-7abb2",
  storageBucket: "tempalert-7abb2.appspot.com",
  messagingSenderId: "952450715967",
  appId: "1:952450715967:web:558fc36f4eefb7da2ac38a",
};

// Prevent re-initializing if hot reloading
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Export the “auth” and “db” instances for the rest of your app
export { auth, firestore as database };
