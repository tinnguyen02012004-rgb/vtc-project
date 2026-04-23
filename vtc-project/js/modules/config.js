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
  apiKey:            'AIzaSyB5fHbj56aCCEXsUocpygQSRsS7OS0kUb4',
  authDomain:        'anhtrangkhuya02.firebaseapp.com',
  projectId:         'anhtrangkhuya02',
  storageBucket:     'anhtrangkhuya02.firebasestorage.app',
  messagingSenderId: '518341156099',
  appId:             '1:518341156099:web:3b44e9d73265a9be7c1d36',
};

export const app            = initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
