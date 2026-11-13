
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEEmQo5mHQyimwNQ0gAtrvDlPKQnCM8Vc",
  authDomain: "sarvajanik-medical-stores.firebaseapp.com",
  projectId: "sarvajanik-medical-stores",
  storageBucket: "sarvajanik-medical-stores.firebasestorage.app",
  messagingSenderId: "19586246470",
  appId: "1:19586246470:web:9db9aa5e8404758bcee747"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
