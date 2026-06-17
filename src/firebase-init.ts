import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// Initialize Firebase with your actual project config
const app = initializeApp({
  apiKey: "AIzaSyA-ezEYEV3zADxtuEzNY1v3BbK94mcw-zM",
  authDomain: "kantongku-app.firebaseapp.com",
  projectId: "kantongku-app",
  storageBucket: "kantongku-app.firebasestorage.app",
  messagingSenderId: "712883913642",
  appId: "1:712883913642:web:0b5a33dd265d00f11161d3",
  measurementId: "G-0PDSEFQ68P"
});

const db = getFirestore(app);
const auth = getAuth(app);

// Firebase Authentication Helpers
window.daftarAkunFirebase = async function(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Firebase Registration Error:", error);
        throw error;
    }
};

window.masukAkunFirebase = async function(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Firebase Login Error:", error);
        throw error;
    }
};

window.keluarAkunFirebase = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Firebase Logout Error:", error);
        throw error;
    }
};

window.ubahKataSandiFirebase = async function(newPassword) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Pengguna tidak terautentikasi.");
        await updatePassword(user, newPassword);
    } catch (error) {
        console.error("Firebase Update Password Error:", error);
        throw error;
    }
};

window.ubahProfilFirebase = async function(displayName, photoURL) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Pengguna tidak terautentikasi.");
        await updateProfile(user, { displayName, photoURL });
    } catch (error) {
        console.error("Firebase Update Profile Error:", error);
        throw error;
    }
};

// Listener for auth state changes
onAuthStateChanged(auth, (user) => {
    if (window.onAuthStateChangedCallback) {
        window.onAuthStateChangedCallback(user);
    }
});

/**
 * Fungsi Global untuk Menghapus Transaksi atau Jatah Jajan
 * @param {string} namaKoleksi - Nama tabel di Firebase ("Daftar_Transaksi" atau "Daftar_Anggaran")
 * @param {string} idDokumen - ID dokumen unik dari Firebase Firestore
 * @param {string} elemenIdHTML - ID elemen div/li di HTML agar langsung hilang dari layar
 */
window.hapusDataPermanen = async function(namaKoleksi, idDokumen, elemenIdHTML) {
    // 1. Tampilkan dialog konfirmasi ramah dalam Bahasa Indonesia
    const konfirmasi = confirm("Apakah Anda yakin ingin menghapus catatan keuangan ini?");
    
    if (!konfirmasi) return; // Jika batal, hentikan fungsi

    try {
        // 2. Akses dokumen spesifik di Firebase Firestore dan hapus (runs if firestore has mock or actual configuration active)
        try {
            const dokumenRef = doc(db, namaKoleksi, idDokumen);
            // Jalankan secara asynchronous tanpa await agar tidak me-block UI jika koneksi lambat
            deleteDoc(dokumenRef).catch(firestoreError => {
                console.warn("Firestore collection deletion error:", firestoreError);
            });
        } catch (firestoreError) {
            console.warn("Firestore collection deletion attempted:", firestoreError);
        }

        // Update relevant React application state globally so local persistence is correctly updated
        if (namaKoleksi === 'Daftar_Transaksi') {
            if (window.handleDeleteTransaction) {
                window.handleDeleteTransaction(idDokumen);
            }
        } else if (namaKoleksi === 'Daftar_Anggaran') {
            if (window.handleDeleteBudget) {
                window.handleDeleteBudget(idDokumen);
            }
        }

        // 3. Efek visual: Hapus elemen dari layar secara instan tanpa muat ulang halaman
        const elemenDiLayar = document.getElementById(elemenIdHTML);
        if (elemenDiLayar) {
            elemenDiLayar.style.transition = "all 0.3s ease";
            elemenDiLayar.style.opacity = "0";
            elemenDiLayar.style.transform = "translateX(50px)";
            
            setTimeout(() => {
                elemenDiLayar.remove();
                // 4. Hitung ulang total saldo seluruhnya di layar beranda
                if (window.hitungUlangTotalSaldo) {
                    window.hitungUlangTotalSaldo();
                }
            }, 300);
        }

        alert("Catatan berhasil dihapus dari KantongKu!");
    } catch (error) {
        alert("Gagal menghapus data: " + error.message);
    }
}
