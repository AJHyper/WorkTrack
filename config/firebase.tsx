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
  appId: "1:331304936885:web:b648d8a8ff7fc421bc65fc"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

