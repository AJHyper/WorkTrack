import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJIAeldAX2VHxRZzxtc4-ucQvJ3aqkLQQ",
  authDomain: "worktrack-aeca0.firebaseapp.com",
  projectId: "worktrack-aeca0",
  storageBucket: "worktrack-aeca0.appspot.com",
  messagingSenderId: "331304936885",
  appId: "1:331304936885:web:b648d8a8ff7fc421bc65fc",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence using AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore database
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Export your Firebase config and services
export const APP_ID = firebaseConfig.projectId;
export { app, auth, db, storage };

