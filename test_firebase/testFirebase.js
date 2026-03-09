import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
const db = getFirestore(app);

async function run() {
    console.log("Fetching attendance_records...");
    try {
        const snap = await getDocs(collection(db, "attendance_records"));
        console.log("Total records:", snap.size);
        if (snap.size > 0) {
            console.log("Sample 1:", snap.docs[0].data());
            if (snap.size > 1) {
                console.log("Sample 2:", snap.docs[1].data());
            }
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
