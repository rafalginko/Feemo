
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/analytics";
import "firebase/compat/firestore";
import "firebase/compat/storage";

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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
// const analytics = firebase.analytics(); // Analytics optional

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

export default firebase;
