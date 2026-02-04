import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Configuration Handling ---
// 請在此處填入您的 Firebase config (從 Firebase Console -> 專案設定 -> 一般 -> 您的應用程式 複製)
const firebaseConfig = {
    apiKey: "AIzaSyDVx02X8yTPSZa8GDEeAbfBJ_mY1gfrd7A",
    authDomain: "dodojojo.firebaseapp.com",
    projectId: "dodojojo",
    storageBucket: "dodojojo.firebasestorage.app",
    messagingSenderId: "1064636261324",
    appId: "1:1064636261324:web:5d60acd4e65592ef7d3369",
    measurementId: "G-J2JZ6Y51XZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
