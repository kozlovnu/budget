// Только то, что нужно приложению: вход по почте и Firestore
export { initializeApp } from "firebase/app";
export { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, collection, query, orderBy, limit, getDoc, getDocs, setDoc, deleteDoc, deleteField, onSnapshot, runTransaction, terminate, clearIndexedDbPersistence } from "firebase/firestore";
