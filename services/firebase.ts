import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoTRkajQ8Cqf6kdWk_SliNv2g-uxW_5yA",
  authDomain: "stemm-app-f6675.firebaseapp.com",
  projectId: "stemm-app-f6675",
  storageBucket: "stemm-app-f6675.firebasestorage.app",
  messagingSenderId: "919781898546",
  appId: "1:919781898546:web:b991659fa86a2bfa8c3f2b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
