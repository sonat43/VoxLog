import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Use initializeFirestore to force long polling which can bypass some proxy/firewall/extension blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);
