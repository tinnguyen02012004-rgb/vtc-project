// ============================================================
// File: js/modules/config.js
// Mô tả: Khởi tạo Firebase — App, Auth, Firestore
// Export: app, auth, db, googleProvider
// ============================================================

import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore }        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Firebase project credentials ─────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBQy49IG7E9qcd6G1sM317s7O50FryJhPA",
  authDomain: "vtc-project-6c9f0.firebaseapp.com",
  projectId: "vtc-project-6c9f0",
  storageBucket: "vtc-project-6c9f0.firebasestorage.app",
  messagingSenderId: "278854919209",
  appId: "1:278854919209:web:d8b1395d3e28b5e104a838"
};


export const app            = initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
