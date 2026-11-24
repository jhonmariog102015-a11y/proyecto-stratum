// Configuración oficial y servicios de Firebase para Stratum Group
import { initializeApp } from "firebase/app";
import { esVistaLocal } from "./entorno.js";
import {
  getFirestore,
  collection,
  getDoc, getDocs, connectFirestoreEmulator,
  writeBatch,
  addDoc,
  updateDoc,
  deleteField,
  deleteDoc,
  getCount,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore/lite";
import {
  initializeAuth, connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserSessionPersistence
} from "firebase/auth";

// Configuración pública del SDK web; las reglas controlan el acceso.
const firebaseConfig = {
  apiKey: "AIzaSyCmhk8GsGVn3qcMsUgGNvHOUExV-Q48AT4",
  authDomain: "stratum-group.firebaseapp.com",
  projectId: "stratum-group",
  storageBucket: "stratum-group.firebasestorage.app",
  messagingSenderId: "1060403201870",
  appId: "1:1060403201870:web:c72ab431d64984bf00401f",
  measurementId: "G-XV8K98LN1V"
};

// Inicializar Firebase
const app = initializeApp(esVistaLocal ? {
  apiKey: "demo-stratum", projectId: "demo-stratum", appId: "demo-stratum"
} : firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, { persistence: browserSessionPersistence });
if (esVistaLocal) {
  connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 18080);
}

// Exportar servicios para el panel de administración
export {
  db,
  auth,
  collection,
  getDocs,
  getDoc,
  writeBatch,
  addDoc,
  updateDoc,
  deleteField,
  deleteDoc,
  getCount,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
