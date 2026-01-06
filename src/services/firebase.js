import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDe2CStsyiBzuqkqdIVKfgYIvGEqNHBQXE",
  authDomain: "voxlog-bda13.firebaseapp.com",
  projectId: "voxlog-bda13",
  storageBucket: "voxlog-bda13.firebasestorage.app",
  messagingSenderId: "1029143833400",
  appId: "1:1029143833400:web:ffc088846802809b46efcd",
  measurementId: "G-VNCMRL7913"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
