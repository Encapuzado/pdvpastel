// src/firebase.js
// Configuração principal do Firebase para o frontend (React)

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database"; 

const firebaseConfig = {
  apiKey: "AIzaSyB_QnCVZR4scg_Q3X6_SXlfMzF_ENzCS-s",
  authDomain: "pdvpastel.firebaseapp.com",
  projectId: "pdvpastel",
  storageBucket: "pdvpastel.firebasestorage.app",
  messagingSenderId: "482208869366",
  appId: "1:482208869366:web:d83dc72f7daa2d8cf535d7",

  // ✔️ ESTA LINHA ERA O QUE FALTAVA
  databaseURL: "https://pdvpastel-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
