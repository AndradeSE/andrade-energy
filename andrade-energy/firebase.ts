import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "andrade-s-eletricas.firebaseapp.com",
  projectId: "andrade-s-eletricas",
  storageBucket: "andrade-s-eletricas.firebasestorage.app",
  messagingSenderId: "904799166431",
  appId: "1:904799166431:web:cf2adfa7790625d05bae6a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);