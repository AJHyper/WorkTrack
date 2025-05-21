// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJIAeldAX2VHxRZzxtc4-ucQvJ3aqkLQQ",
  authDomain: "worktrack-aeca0.firebaseapp.com",
  projectId: "worktrack-aeca0",
  storageBucket: "worktrack-aeca0.firebasestorage.app",
  messagingSenderId: "331304936885",
  appId: "1:331304936885:web:b648d8a8ff7fc421bc65fc"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// auth
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// db
export const db = getFirestore(app);