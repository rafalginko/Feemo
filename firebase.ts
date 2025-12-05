
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAAIpp_g-v_1vZf2vx35sKjAk2hqU5uoSE",
  authDomain: "feemo-68fa3.firebaseapp.com",
  projectId: "feemo-68fa3",
  storageBucket: "feemo-68fa3.firebasestorage.app",
  messagingSenderId: "300126368984",
  appId: "1:300126368984:web:3a9e544067d1b2467a13ad",
  measurementId: "G-DHJXL9G54G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
