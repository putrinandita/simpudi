/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  PlusCircle, 
  History, 
  UserCheck, 
  Download, 
  Database, 
  FileCode, 
  Lock, 
  LogOut, 
  Home, 
  Warehouse, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  User, 
  Copy, 
  Check,
  ChevronRight,
  Info,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Warga, PupukMasuk, Transaksi, AdminSession } from './types';
import { PHP_MYSQL_SOURCES, SourceFile } from './phpCodeData';

// Simulated Initial Seed Data
const DEFAULT_WARGA: Warga[] = [
  { id: '1', nama: 'Budi Santoso', nik: '3201020304050001', jatahAwal: 120, sisaJatah: 120, createdAt: '2026-06-25T10:30:00Z' },
  { id: '2', nama: 'Siti Rahmawati', nik: '3201020304050002', jatahAwal: 100, sisaJatah: 100, createdAt: '2026-06-26T11:15:00Z' },
  { id: '3', nama: 'Joko Widodo', nik: '3201020304050003', jatahAwal: 150, sisaJatah: 150, createdAt: '2026-06-27T08:45:00Z' },
  { id: '4', nama: 'Agus Susanto', nik: '3201020304050004', jatahAwal: 80, sisaJatah: 80, createdAt: '2026-06-28T14:20:00Z' }
];

const DEFAULT_PUPUK_MASUK: PupukMasuk[] = [
  { id: 'm1', jumlahMasuk: 500, tanggal: '2026-06-24T09:00:00Z', keterangan: 'Pengadaan Awal Pemdes' }
];

const DEFAULT_TRANSAKSI: Transaksi[] = [
  { id: 't1', wargaId: '1', wargaNama: 'Budi Santoso', jumlahAmbil: 30, tanggalAmbil: '2026-06-28T16:00:00Z' }
];

export default function App() {
  // --- States ---
  const [session, setSession] = useState<AdminSession>(() => {
    const saved = localStorage.getItem('simpudi_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          username: 'admin',
          adminNama: 'Administrator Desa',
          ...parsed
        };
      } catch {
        // Fallback
      }
    }
    return { isLoggedIn: false, username: 'admin', adminNama: 'Administrator Desa', loginTime: '' };
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('simpudi_admin_password') || 'admin123';
  });

  const [wargaList, setWargaList] = useState<Warga[]>(() => {
    const saved = localStorage.getItem('simpudi_warga');
    return saved ? JSON.parse(saved) : DEFAULT_WARGA;
  });

  const [stokGudang, setStokGudang] = useState<number>(() => {
    const saved = localStorage.getItem('simpudi_stok');
    return saved ? Number(saved) : 470; // 500 initial - 30 transaction
  });

  const [pupukMasukList, setPupukMasukList] = useState<PupukMasuk[]>(() => {
    const saved = localStorage.getItem('simpudi_pupuk_masuk');
    return saved ? JSON.parse(saved) : DEFAULT_PUPUK_MASUK;
  });

  const [transaksiList, setTransaksiList] = useState<Transaksi[]>(() => {
    const saved = localStorage.getItem('simpudi_transaksi');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSAKSI;
  });

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'warga' | 'pupuk_masuk' | 'transaksi' | 'pengaturan' | 'source_code'>('dashboard');

  // Search Warga
  const [searchQuery, setSearchQuery] = useState('');

  // Login Form States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Notification states
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // CRUD Warga Form States
  const [wargaId, setWargaId] = useState('');
  const [wargaNik, setWargaNik] = useState('');
  const [wargaNama, setWargaNama] = useState('');
  const [wargaJatahAwal, setWargaJatahAwal] = useState<number | ''>('');
  const [wargaSisaJatah, setWargaSisaJatah] = useState<number | ''>('');
  const [isEditingWarga, setIsEditingWarga] = useState(false);

  // Pupuk Masuk Form States
  const [inputJumlahMasuk, setInputJumlahMasuk] = useState<number | ''>('');
  const [inputKeteranganMasuk, setInputKeteranganMasuk] = useState('');

  // Transaksi Form States
  const [selectedWargaId, setSelectedWargaId] = useState('');
  const [inputJumlahAmbil, setInputJumlahAmbil] = useState<number | ''>('');

  // Pengaturan Akun Form States
  const [settingsNama, setSettingsNama] = useState(session.adminNama || 'Administrator Desa');
  const [settingsUsername, setSettingsUsername] = useState(session.username || 'admin');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');

  // Sync settings inputs when session loads/changes
  useEffect(() => {
    if (session.isLoggedIn) {
      setSettingsNama(session.adminNama || 'Administrator Desa');
      setSettingsUsername(session.username || 'admin');
    }
  }, [session]);

  // Source Code Tab States
  const [selectedSourceFile, setSelectedSourceFile] = useState<SourceFile>(PHP_MYSQL_SOURCES[0]);
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);

  // Custom Confirmation Modal States (Avoids window.confirm blocked by iframes)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [deleteWargaTarget, setDeleteWargaTarget] = useState<Warga | null>(null);
  const [deletePupukMasukTarget, setDeletePupukMasukTarget] = useState<PupukMasuk | null>(null);
  const [deleteTransaksiTarget, setDeleteTransaksiTarget] = useState<Transaksi | null>(null);

  const [isEditingPupukMasuk, setIsEditingPupukMasuk] = useState(false);
  const [editingPupukMasukId, setEditingPupukMasukId] = useState<string | null>(null);
  const [isEditingTransaksi, setIsEditingTransaksi] = useState(false);
  const [editingTransaksiId, setEditingTransaksiId] = useState<string | null>(null);

  // Real-Time Clock State (WITA Zone)
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Makassar',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat('id-ID', options);
      setCurrentDateTime(formatter.format(new Date()) + ' WITA');
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Save states to localStorage ---
  useEffect(() => {
    localStorage.setItem('simpudi_session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem('simpudi_warga', JSON.stringify(wargaList));
  }, [wargaList]);

  useEffect(() => {
    localStorage.setItem('simpudi_stok', stokGudang.toString());
  }, [stokGudang]);

  useEffect(() => {
    localStorage.setItem('simpudi_pupuk_masuk', JSON.stringify(pupukMasukList));
  }, [pupukMasukList]);

  useEffect(() => {
    localStorage.setItem('simpudi_transaksi', JSON.stringify(transaksiList));
  }, [transaksiList]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper to show Toast
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  // --- Auth Handler ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError('Username dan Password tidak boleh kosong!');
      return;
    }

    const expectedUsername = session.username || 'admin';
    const expectedPassword = adminPassword || 'admin123';

    if (loginUsername === expectedUsername && loginPassword === expectedPassword) {
      const newSession = {
        isLoggedIn: true,
        username: expectedUsername,
        adminNama: session.adminNama || 'Administrator Desa',
        loginTime: new Date().toISOString()
      };
      setSession(newSession);
      setLoginError('');
      showToast('success', 'Selamat datang Admin! Login berhasil.');
    } else {
      setLoginError('Username atau Password salah!');
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setSession({ isLoggedIn: false, username: '', loginTime: '' });
    setLoginUsername('');
    setLoginPassword('');
    showToast('success', 'Berhasil logout dari sesi administrator.');
    setIsLogoutModalOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (!settingsNama.trim() || !settingsUsername.trim()) {
      showToast('error', 'Semua kolom wajib diisi!');
      return;
    }

    if (settingsPassword && settingsPassword !== settingsConfirmPassword) {
      showToast('error', 'Konfirmasi password baru tidak cocok!');
      return;
    }

    // Success! Update session and save to localStorage
    const newSession = {
      ...session,
      username: settingsUsername.trim(),
      adminNama: settingsNama.trim()
    };
    setSession(newSession);
    localStorage.setItem('simpudi_session', JSON.stringify(newSession));

    if (settingsPassword) {
      setAdminPassword(settingsPassword);
      localStorage.setItem('simpudi_admin_password', settingsPassword);
    }

    showToast('success', 'Kredensial akun administrator berhasil diperbarui!');
    setSettingsPassword('');
    setSettingsConfirmPassword('');
  };

  // --- CRUD Warga Handlers ---
  const handleSaveWarga = (e: React.FormEvent) => {
    e.preventDefault();

    // Lapis 3: Form pengisian tidak boleh kosong
    if (!wargaNik.trim() || !wargaNama.trim() || wargaJatahAwal === '') {
      showToast('error', 'Validasi Lapis 3 Gagal: Semua field wajib diisi!');
      return;
    }

    // Validasi panjang NIK
    if (wargaNik.trim().length !== 16) {
      showToast('error', 'Validasi Gagal: NIK wajib berjumlah 16 digit angka!');
      return;
    }

    const jatahNum = Number(wargaJatahAwal);
    const sisaNum = wargaSisaJatah === '' ? jatahNum : Number(wargaSisaJatah);

    // Lapis 1: Angka tidak boleh negatif atau nol
    if (jatahNum <= 0 || sisaNum < 0) {
      showToast('error', 'Validasi Lapis 1 Gagal: Jatah awal wajib > 0, dan sisa jatah tidak boleh bernilai negatif!');
      return;
    }

    // Lapis 2: Sisa jatah tidak boleh melebihi jatah awal
    if (sisaNum > jatahNum) {
      showToast('error', 'Validasi Lapis 2 Gagal: Sisa jatah saat ini tidak boleh melebihi jatah kuota awal warga!');
      return;
    }

    if (isEditingWarga) {
      // Edit mode
      setWargaList(prev => prev.map(w => {
        if (w.id === wargaId) {
          return {
            ...w,
            nama: wargaNama.trim(),
            nik: wargaNik.trim(),
            jatahAwal: jatahNum,
            sisaJatah: sisaNum
          };
        }
        return w;
      }));
      showToast('success', `Berhasil memperbarui data warga: ${wargaNama}`);
      resetWargaForm();
    } else {
      // Create mode
      // Cek apakah NIK duplikat
      if (wargaList.some(w => w.nik === wargaNik.trim())) {
        showToast('error', `Validasi Gagal: Warga dengan NIK ${wargaNik} sudah terdaftar!`);
        return;
      }

      const newWarga: Warga = {
        id: Date.now().toString(),
        nik: wargaNik.trim(),
        nama: wargaNama.trim(),
        jatahAwal: jatahNum,
        sisaJatah: jatahNum, // Initial remaining is same as initial quota
        createdAt: new Date().toISOString()
      };

      setWargaList(prev => [newWarga, ...prev]);
      showToast('success', `Warga baru "${wargaNama}" berhasil didaftarkan!`);
      resetWargaForm();
    }
  };

  const startEditWarga = (w: Warga) => {
    setWargaId(w.id);
    setWargaNik(w.nik);
    setWargaNama(w.nama);
    setWargaJatahAwal(w.jatahAwal);
    setWargaSisaJatah(w.sisaJatah);
    setIsEditingWarga(true);
  };

  const handleDeleteWarga = (id: string, nama: string) => {
    const w = wargaList.find(item => item.id === id);
    if (w) {
      setDeleteWargaTarget(w);
    }
  };

  const confirmDeleteWarga = () => {
    if (deleteWargaTarget) {
      const { id, nama } = deleteWargaTarget;
      setWargaList(prev => prev.filter(w => w.id !== id));
      // Delete corresponding transactions to simulate database CASCADE delete
      setTransaksiList(prev => prev.filter(t => t.wargaId !== id));
      showToast('success', `Data warga "${nama}" berhasil dihapus dari sistem.`);
      setDeleteWargaTarget(null);
    }
  };

  const resetWargaForm = () => {
    setWargaId('');
    setWargaNik('');
    setWargaNama('');
    setWargaJatahAwal('');
    setWargaSisaJatah('');
    setIsEditingWarga(false);
  };

  // --- Pupuk Masuk Handlers ---
  const handleAddPupukMasuk = (e: React.FormEvent) => {
    e.preventDefault();

    // Lapis 3: Form pengisian tidak boleh kosong
    if (inputJumlahMasuk === '') {
      showToast('error', 'Validasi Lapis 3 Gagal: Jumlah masuk tidak boleh kosong!');
      return;
    }

    const jumlahNum = Number(inputJumlahMasuk);

    // Lapis 1: Jumlah tidak boleh negatif atau nol
    if (jumlahNum <= 0) {
      showToast('error', 'Validasi Lapis 1 Gagal: Jumlah pupuk masuk wajib bernilai lebih besar dari 0!');
      return;
    }

    if (isEditingPupukMasuk && editingPupukMasukId) {
      const existing = pupukMasukList.find(log => log.id === editingPupukMasukId);
      if (!existing) {
        showToast('error', 'Data riwayat tidak ditemukan!');
        return;
      }
      const diff = jumlahNum - existing.jumlahMasuk;
      if (stokGudang + diff < 0) {
        showToast('error', `Validasi Gagal: Perubahan ini mengurangi stok gudang menjadi negatif (${stokGudang + diff} kg). Stok saat ini: ${stokGudang} kg.`);
        return;
      }

      setStokGudang(prev => prev + diff);
      setPupukMasukList(prev => prev.map(log => {
        if (log.id === editingPupukMasukId) {
          return {
            ...log,
            jumlahMasuk: jumlahNum,
            keterangan: inputKeteranganMasuk.trim() || 'Pengadaan Stok Tambahan (Diedit)'
          };
        }
        return log;
      }));
      showToast('success', `Berhasil memperbarui riwayat pengadaan pupuk masuk sebesar ${existing.jumlahMasuk} kg menjadi ${jumlahNum} kg.`);
      resetPupukMasukForm();
    } else {
      // Success: Update main warehouse stock and append to incoming list
      const newInLog: PupukMasuk = {
        id: 'm-' + Date.now(),
        jumlahMasuk: jumlahNum,
        tanggal: new Date().toISOString(),
        keterangan: inputKeteranganMasuk.trim() || 'Pengadaan Stok Tambahan'
      };

      setStokGudang(prev => prev + jumlahNum);
      setPupukMasukList(prev => [newInLog, ...prev]);
      showToast('success', `Berhasil meningkatkan Stok Utama Gudang sebanyak +${jumlahNum} kg!`);
      
      setInputJumlahMasuk('');
      setInputKeteranganMasuk('');
    }
  };

  const startEditPupukMasuk = (log: PupukMasuk) => {
    setInputJumlahMasuk(log.jumlahMasuk);
    setInputKeteranganMasuk(log.keterangan);
    setEditingPupukMasukId(log.id);
    setIsEditingPupukMasuk(true);
  };

  const resetPupukMasukForm = () => {
    setInputJumlahMasuk('');
    setInputKeteranganMasuk('');
    setEditingPupukMasukId(null);
    setIsEditingPupukMasuk(false);
  };

  const handleDeletePupukMasuk = (id: string) => {
    const log = pupukMasukList.find(item => item.id === id);
    if (log) {
      if (stokGudang - log.jumlahMasuk < 0) {
        showToast('error', `Gagal menghapus! Penghapusan ini akan memotong stok gudang sebesar ${log.jumlahMasuk} kg, sedangkan stok gudang saat ini hanya tersisa ${stokGudang} kg.`);
        return;
      }
      setDeletePupukMasukTarget(log);
    }
  };

  const confirmDeletePupukMasuk = () => {
    if (deletePupukMasukTarget) {
      const { id, jumlahMasuk, keterangan } = deletePupukMasukTarget;
      setStokGudang(prev => prev - jumlahMasuk);
      setPupukMasukList(prev => prev.filter(log => log.id !== id));
      showToast('success', `Riwayat pengadaan pupuk masuk sebesar ${jumlahMasuk} kg (${keterangan}) berhasil dihapus.`);
      setDeletePupukMasukTarget(null);
    }
  };

  // --- Transaksi Handlers ---
  const handleSaveTransaksi = (e: React.FormEvent) => {
    e.preventDefault();

    // Lapis 3: Form pengisian tidak boleh kosong
    if (!selectedWargaId || inputJumlahAmbil === '') {
      showToast('error', 'Validasi Lapis 3 Gagal: Warga penerima dan jumlah pengambilan wajib diisi!');
      return;
    }

    const ambilNum = Number(inputJumlahAmbil);

    // Lapis 1: Jumlah pengambilan tidak boleh negatif atau nol
    if (ambilNum <= 0) {
      showToast('error', 'Validasi Lapis 1 Gagal: Jumlah pengambilan pupuk wajib bernilai lebih besar dari 0!');
      return;
    }

    // Find targeted warga to validate remaining quota
    const warga = wargaList.find(w => w.id === selectedWargaId);
    if (!warga) {
      showToast('error', 'Validasi Gagal: Data warga tidak ditemukan!');
      return;
    }

    if (isEditingTransaksi && editingTransaksiId) {
      const existingTx = transaksiList.find(tx => tx.id === editingTransaksiId);
      if (!existingTx) {
        showToast('error', 'Data transaksi tidak ditemukan!');
        return;
      }

      const wargaLamaId = existingTx.wargaId;
      const ambilLama = existingTx.jumlahAmbil;

      if (selectedWargaId === wargaLamaId) {
        const diff = ambilNum - ambilLama;

        // Validasi jatah warga
        if (diff > warga.sisaJatah) {
          showToast('error', `Transaksi DITOLAK! Jumlah pengambilan baru (${ambilNum} kg) melebihi sisa jatah kuota warga ${warga.nama} (${warga.sisaJatah + ambilLama} kg).`);
          return;
        }

        // Validasi stok gudang
        if (diff > stokGudang) {
          showToast('error', `Transaksi DITOLAK! Jumlah pengambilan baru (${ambilNum} kg) melebihi ketersediaan stok di gudang (${stokGudang + ambilLama} kg).`);
          return;
        }

        // Apply changes
        setWargaList(prev => prev.map(w => {
          if (w.id === selectedWargaId) {
            return {
              ...w,
              sisaJatah: w.sisaJatah - diff
            };
          }
          return w;
        }));

        setStokGudang(prev => prev - diff);
        setTransaksiList(prev => prev.map(tx => {
          if (tx.id === editingTransaksiId) {
            return {
              ...tx,
              jumlahAmbil: ambilNum,
              tanggalAmbil: new Date().toISOString()
            };
          }
          return tx;
        }));

        showToast('success', `Transaksi atas nama ${warga.nama} berhasil diperbarui dari ${ambilLama} kg menjadi ${ambilNum} kg.`);
        resetTransaksiForm();
      } else {
        // Warga changed!
        const wargaLama = wargaList.find(w => w.id === wargaLamaId);
        
        // Validasi jatah warga baru
        if (ambilNum > warga.sisaJatah) {
          showToast('error', `Transaksi DITOLAK! Jumlah pengambilan baru (${ambilNum} kg) melebihi jatah warga baru ${warga.nama} (${warga.sisaJatah} kg).`);
          return;
        }

        // Validasi ketersediaan gudang (stok lama dipulihkan + stok sekarang)
        if (ambilNum > (stokGudang + ambilLama)) {
          showToast('error', `Transaksi DITOLAK! Jumlah pengambilan baru (${ambilNum} kg) melebihi ketersediaan stok gudang (${stokGudang + ambilLama} kg).`);
          return;
        }

        // Apply changes:
        // 1. Restore warga lama
        setWargaList(prev => prev.map(w => {
          if (w.id === wargaLamaId) {
            return {
              ...w,
              sisaJatah: w.sisaJatah + (wargaLama ? ambilLama : 0)
            };
          }
          // 2. Deduct warga baru
          if (w.id === selectedWargaId) {
            return {
              ...w,
              sisaJatah: w.sisaJatah - ambilNum
            };
          }
          return w;
        }));

        // 3. Adjust stok gudang
        setStokGudang(prev => prev + ambilLama - ambilNum);

        // 4. Update transaction
        setTransaksiList(prev => prev.map(tx => {
          if (tx.id === editingTransaksiId) {
            return {
              ...tx,
              wargaId: selectedWargaId,
              wargaNama: warga.nama,
              jumlahAmbil: ambilNum,
              tanggalAmbil: new Date().toISOString()
            };
          }
          return tx;
        }));

        showToast('success', `Penerima transaksi berhasil dialihkan ke ${warga.nama} sebesar ${ambilNum} kg.`);
        resetTransaksiForm();
      }
    } else {
      // Lapis 2: Jumlah pengambilan melebihi sisa jatah kuota warga
      if (ambilNum > warga.sisaJatah) {
        showToast('error', `Validasi Lapis 2 Gagal: Jumlah pengambilan (${ambilNum} kg) melebihi sisa jatah kuota warga ${warga.nama} (${warga.sisaJatah} kg)!`);
        return;
      }

      // Lapis 2: Jumlah pengambilan melebihi ketersediaan stok utama gudang
      if (ambilNum > stokGudang) {
        showToast('error', `Validasi Lapis 2 Gagal: Jumlah pengambilan (${ambilNum} kg) melebihi sisa ketersediaan stok utama gudang (${stokGudang} kg)!`);
        return;
      }

      // SUCCESS: Synchronize database automatically:
      // 1. Deduct Sisa Jatah Warga
      setWargaList(prev => prev.map(w => {
        if (w.id === selectedWargaId) {
          return {
            ...w,
            sisaJatah: w.sisaJatah - ambilNum
          };
        }
        return w;
      }));

      // 2. Deduct Total Stok Utama Gudang
      setStokGudang(prev => prev - ambilNum);

      // 3. Log transaction
      const newTx: Transaksi = {
        id: 't-' + Date.now(),
        wargaId: selectedWargaId,
        wargaNama: warga.nama,
        jumlahAmbil: ambilNum,
        tanggalAmbil: new Date().toISOString()
      };

      setTransaksiList(prev => [newTx, ...prev]);
      showToast('success', `Transaksi BERHASIL! Pengambilan pupuk ${ambilNum} kg atas nama ${warga.nama} telah dicatat and disinkronkan.`);
      
      // Clear Form
      setInputJumlahAmbil('');
      setSelectedWargaId('');
    }
  };

  const startEditTransaksi = (tx: Transaksi) => {
    setSelectedWargaId(tx.wargaId);
    setInputJumlahAmbil(tx.jumlahAmbil);
    setEditingTransaksiId(tx.id);
    setIsEditingTransaksi(true);
  };

  const resetTransaksiForm = () => {
    setInputJumlahAmbil('');
    setSelectedWargaId('');
    setEditingTransaksiId(null);
    setIsEditingTransaksi(false);
  };

  const handleDeleteTransaksi = (tx: Transaksi) => {
    setDeleteTransaksiTarget(tx);
  };

  const confirmDeleteTransaksi = () => {
    if (deleteTransaksiTarget) {
      const { id, wargaId, wargaNama, jumlahAmbil } = deleteTransaksiTarget;
      
      // 1. Restore citizen's quota
      setWargaList(prev => prev.map(w => {
        if (w.id === wargaId) {
          return {
            ...w,
            sisaJatah: w.sisaJatah + jumlahAmbil
          };
        }
        return w;
      }));

      // 2. Restore warehouse stock
      setStokGudang(prev => prev + jumlahAmbil);

      // 3. Delete transaction
      setTransaksiList(prev => prev.filter(tx => tx.id !== id));

      showToast('success', `Transaksi pengambilan pupuk subsidi sebesar ${jumlahAmbil} kg atas nama ${wargaNama} berhasil dihapus.`);
      setDeleteTransaksiTarget(null);
    }
  };

  // Filtered lists for instant responsive search
  const filteredWarga = useMemo(() => {
    if (!searchQuery.trim()) return wargaList;
    const q = searchQuery.toLowerCase().trim();
    return wargaList.filter(w => 
      w.nama.toLowerCase().includes(q) || 
      w.nik.includes(q)
    );
  }, [wargaList, searchQuery]);

  // Sum of all citizens remaining quotas
  const totalSisaJatahSemuaWarga = useMemo(() => {
    return wargaList.reduce((acc, curr) => acc + curr.sisaJatah, 0);
  }, [wargaList]);

  // Safe selected warga details for transaction form warnings
  const currentSelectedWarga = useMemo(() => {
    return wargaList.find(w => w.id === selectedWargaId);
  }, [wargaList, selectedWargaId]);

  // --- Code Copy & Download Utilities ---
  const handleCopyCode = (file: SourceFile) => {
    navigator.clipboard.writeText(file.code);
    setCopiedFilename(file.filename);
    setTimeout(() => setCopiedFilename(null), 3000);
    showToast('success', `Isi file "${file.filename}" disalin ke clipboard!`);
  };

  const handleDownloadCode = (file: SourceFile) => {
    const element = document.createElement("a");
    const blob = new Blob([file.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(blob);
    element.download = file.filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('success', `File "${file.filename}" berhasil diunduh!`);
  };

  // Default redirect if not logged in
  if (!session.isLoggedIn) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
          id="login_card"
        >
          <div className="text-center mb-8">
            <div className="bg-green-100 text-green-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">🌾</div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight" id="login_title">SIMPUDI DESA</h1>
            <p className="text-sm text-slate-500 mt-1">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
          </div>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm"
              id="login_error"
            >
              {loginError}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username Administrator</label>
              <input 
                type="text"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-700 bg-slate-50 text-sm font-medium"
                placeholder="Masukkan username admin"
                id="login_username_field"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input 
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-700 bg-slate-50 text-sm font-medium"
                placeholder="Masukkan password admin"
                id="login_password_field"
                autoComplete="new-password"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-green-100 flex items-center justify-center gap-2"
              id="login_submit_btn"
            >
              <Lock className="w-4 h-4" /> Masuk ke Dasbor
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col">
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border w-[90%] max-w-lg ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
            id="toast_message"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="text-sm font-semibold leading-snug">{toast.message}</div>
            <button 
              onClick={() => setToast(null)}
              className="ml-auto text-xs font-bold hover:opacity-85"
            >
              Tutup
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Top Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm" id="main_navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 text-white p-2.5 rounded-xl text-xl shadow-md">🌾</div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">SIMPUDI DESA</h1>
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Sistem Informasi Manajemen Pupuk Subsidi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Compact Real-Time Clock Widget (WITA Zone) */}
            <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hidden md:block">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                WAKTU SISTEM (WITA)
              </p>
              <p className="text-xs font-bold text-slate-700 font-mono" id="live_clock_navbar">{currentDateTime || 'Memuat...'}</p>
            </div>

            <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hidden sm:block">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Operator Sesi</p>
              <p className="text-sm font-bold text-slate-800">{session.adminNama || 'Administrator Desa'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-2 border border-rose-100"
              id="logout_btn"
            >
              <LogOut className="w-4 h-4" /> Keluar Sesi
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        
        {/* Module Sub-navigation */}
        <nav className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100" id="sub_navigation">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition ${
              activeTab === 'dashboard' 
                ? 'bg-green-600 text-white shadow-md shadow-green-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="tab_dashboard"
          >
            <Home className="w-4 h-4" /> Dasbor Utama
          </button>
          
          <button 
            onClick={() => setActiveTab('warga')}
            className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition ${
              activeTab === 'warga' 
                ? 'bg-green-600 text-white shadow-md shadow-green-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="tab_warga"
          >
            <User className="w-4 h-4" /> Kelola Data Warga
          </button>
          
          <button 
            onClick={() => setActiveTab('pupuk_masuk')}
            className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition ${
              activeTab === 'pupuk_masuk' 
                ? 'bg-green-600 text-white shadow-md shadow-green-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="tab_pupuk_masuk"
          >
            <Warehouse className="w-4 h-4" /> Pupuk Masuk
          </button>
          
          <button 
            onClick={() => setActiveTab('transaksi')}
            className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition ${
              activeTab === 'transaksi' 
                ? 'bg-green-600 text-white shadow-md shadow-green-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="tab_transaksi"
          >
            <History className="w-4 h-4" /> Transaksi Pengambilan
          </button>

          <button 
            onClick={() => setActiveTab('pengaturan')}
            className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition ${
              activeTab === 'pengaturan' 
                ? 'bg-green-600 text-white shadow-md shadow-green-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            id="tab_pengaturan"
          >
            <Settings className="w-4 h-4" /> Pengaturan Akun
          </button>
        </nav>

        {/* --- VIEWS RENDERER --- */}
        <AnimatePresence mode="wait">
          
          {/* 1. VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
              id="view_dashboard"
            >
              
              {/* Bento-style Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Stat 1: Stok Gudang Utama */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="stat_stok_gudang">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Stok Gudang Utama</span>
                    <span className={`p-2 rounded-lg text-sm font-bold ${stokGudang < 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>🏭</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                      {stokGudang.toLocaleString('id-ID')} <span className="text-base font-semibold text-slate-500">kg</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Ketersediaan pupuk di gudang pusat</p>
                  </div>
                  {stokGudang < 100 && (
                    <div className="mt-3 bg-red-50 text-red-700 p-2 rounded-lg text-[11px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Stok kritis! Segera catat pupuk masuk.
                    </div>
                  )}
                </div>

                {/* Stat 2: Total Warga Terdaftar */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="stat_total_warga">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Warga</span>
                    <span className="bg-blue-100 text-blue-700 p-2 rounded-lg text-sm">👥</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                      {wargaList.length} <span className="text-base font-semibold text-slate-500">orang</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Warga penerima jatah pupuk subsidi</p>
                  </div>
                </div>

                {/* Stat 3: Total Sisa Jatah Alokasi */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="stat_sisa_alokasi">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sisa Alokasi Jatah</span>
                    <span className="bg-amber-100 text-amber-700 p-2 rounded-lg text-sm">📊</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                      {totalSisaJatahSemuaWarga.toLocaleString('id-ID')} <span className="text-base font-semibold text-slate-500">kg</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Sisa kuota jatah yang belum diserap</p>
                  </div>
                </div>

                {/* Stat 4: Total Transaksi Penyaluran */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="stat_total_transaksi">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Transaksi</span>
                    <span className="bg-purple-100 text-purple-700 p-2 rounded-lg text-sm">🧾</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                      {transaksiList.length} <span className="text-base font-semibold text-slate-500">kali</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Frekuensi pengambilan terdaftar</p>
                  </div>
                </div>

              </div>

              {/* Quick Search & Responsive Interactive Warga List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">🔍 Pencarian Responsif Nama Warga</h2>
                      <p className="text-xs text-slate-400">Temukan nama warga desa secara instan untuk penyaluran jatah pupuk subsidi.</p>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Ketik Nama Lengkap atau 16-digit NIK warga..."
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                      id="search_warga_input"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse" id="warga_dashboard_table">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                          <th className="py-3 px-3">Nama Warga</th>
                          <th className="py-3 px-3">NIK</th>
                          <th className="py-3 px-3 text-center">Jatah Awal</th>
                          <th className="py-3 px-3 text-center">Sisa Jatah</th>
                          <th className="py-3 px-3 text-right">Aksi Penyaluran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredWarga.length > 0 ? (
                          filteredWarga.map(w => (
                            <tr key={w.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3.5 px-3 font-bold text-slate-800">{w.nama}</td>
                              <td className="py-3.5 px-3 font-mono text-xs text-slate-400">{w.nik}</td>
                              <td className="py-3.5 px-3 text-center font-medium text-slate-600">{w.jatahAwal} kg</td>
                              <td className="py-3.5 px-3 text-center">
                                <span className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                                  w.sisaJatah <= 0 
                                    ? 'bg-rose-50 text-rose-600' 
                                    : w.sisaJatah <= 20 
                                      ? 'bg-amber-50 text-amber-700' 
                                      : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {w.sisaJatah} kg
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {w.sisaJatah > 0 ? (
                                  <button 
                                    onClick={() => {
                                      setSelectedWargaId(w.id);
                                      setActiveTab('transaksi');
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition inline-flex items-center gap-1"
                                  >
                                    Ambil Pupuk 🌾
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 bg-slate-100 font-bold px-3 py-2 rounded-xl">Kuota Habis</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 text-sm font-medium">
                              Data warga "{searchQuery}" tidak ditemukan dalam sistem.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sisi Kanan: Log Penyaluran Terbaru */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="dashboard_recent_transaksi">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">⏱️ Penyaluran Terbaru</h2>
                      <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded uppercase">Live Log</span>
                    </div>

                    <div className="space-y-4">
                      {transaksiList.slice(0, 5).map(tx => (
                        <div key={tx.id} className="border-b border-slate-50 pb-3 last:border-none last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{tx.wargaNama}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(tx.tanggalAmbil).toLocaleString('id-ID', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
                                })} WITA
                              </p>
                            </div>
                            <span className="bg-green-100 text-green-700 text-xs font-black px-2.5 py-1 rounded-full">
                              -{tx.jumlahAmbil} kg
                            </span>
                          </div>
                        </div>
                      ))}

                      {transaksiList.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-sm font-medium">
                          Belum ada transaksi pencatatan yang tersimpan.
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('transaksi')}
                    className="w-full text-center text-xs font-bold text-green-600 hover:text-green-700 hover:underline pt-4 border-t border-slate-50 mt-4 block"
                  >
                    Lihat Seluruh Riwayat Transaksi →
                  </button>
                </div>

              </div>

            </motion.div>
          )}

          {/* 2. VIEW: KELOLA WARGA */}
          {activeTab === 'warga' && (
            <motion.div 
              key="warga"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              id="view_kelola_warga"
            >
              
              {/* Form Input Tambah / Edit */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {isEditingWarga ? '✏️ Edit Data Warga' : '➕ Tambah Data Warga'}
                  </h2>
                  {isEditingWarga && (
                    <button 
                      onClick={resetWargaForm}
                      className="text-xs text-rose-500 hover:underline font-bold"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveWarga} className="space-y-5" id="warga_form">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">NIK Warga (16 Digit)</label>
                    <input 
                      type="text"
                      maxLength={16}
                      value={wargaNik}
                      onChange={e => setWargaNik(e.target.value.replace(/\D/g, ''))} // Numeric only
                      disabled={isEditingWarga} // NIK immutable during edit in database safety model
                      className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50 ${
                        isEditingWarga ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="Contoh: 3201020304050001"
                      required
                    />
                    {!isEditingWarga && (
                      <span className="text-[10px] text-slate-400 mt-1 block">Pastikan NIK valid dan berjumlah tepat 16 karakter angka.</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap Warga</label>
                    <input 
                      type="text"
                      value={wargaNama}
                      onChange={e => setWargaNama(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                      placeholder="Masukkan nama sesuai KTP"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Jatah Awal Pupuk Subsidi (kg)</label>
                    <input 
                      type="number"
                      value={wargaJatahAwal}
                      onChange={e => setWargaJatahAwal(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                      placeholder="Contoh: 100"
                      min={1}
                      required
                    />
                  </div>

                  {isEditingWarga && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Sisa Jatah Pupuk Saat Ini (kg)</label>
                      <input 
                        type="number"
                        value={wargaSisaJatah}
                        onChange={e => setWargaSisaJatah(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                        placeholder="Contoh: 80"
                        min={0}
                        required
                      />
                      <span className="text-xs text-amber-600 font-semibold mt-1.5 block leading-relaxed">
                        ⚠️ Sisa jatah tidak boleh bernilai negatif dan tidak boleh melebihi Jatah Kuota Awal ({wargaJatahAwal} kg).
                      </span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md shadow-green-100 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> {isEditingWarga ? 'Simpan Perubahan' : 'Daftarkan Warga Baru'}
                  </button>
                </form>
              </div>

              {/* Table List of Residents */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">👥 Warga Penerima Subsidi Pupuk</h2>
                  <p className="text-xs text-slate-400">Daftar lengkap warga desa yang terverifikasi mendapatkan jatah alokasi pupuk bersubsidi.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse" id="warga_full_crud_table">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="py-3 px-2">NIK Warga</th>
                        <th className="py-3 px-2">Nama Penerima</th>
                        <th className="py-3 px-2 text-center">Kuota Awal</th>
                        <th className="py-3 px-2 text-center">Sisa Jatah</th>
                        <th className="py-3 px-2 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {wargaList.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-2 font-mono text-xs text-slate-500">{w.nik}</td>
                          <td className="py-3.5 px-2 font-bold text-slate-800">{w.nama}</td>
                          <td className="py-3.5 px-2 text-center text-slate-600 font-semibold">{w.jatahAwal} kg</td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                              w.sisaJatah <= 0 
                                ? 'bg-rose-50 text-rose-600' 
                                : w.sisaJatah <= 20 
                                  ? 'bg-amber-50 text-amber-700' 
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {w.sisaJatah} kg
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-right space-x-1.5">
                            <button 
                              onClick={() => startEditWarga(w)}
                              className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 p-2 rounded-xl transition inline-flex items-center gap-1 font-bold"
                              title="Edit warga"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteWarga(w.id, w.nama)}
                              className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition inline-flex items-center gap-1 font-bold"
                              title="Hapus warga"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        </tr>
                      ))}

                      {wargaList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                            Belum ada data warga terdaftar. Gunakan panel kiri untuk mendaftarkan warga baru.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* 3. VIEW: PUPUK MASUK */}
          {activeTab === 'pupuk_masuk' && (
            <motion.div 
              key="pupuk_masuk"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              id="view_pupuk_masuk"
            >
              
              {/* Form Input & Keterangan */}
              <div className="space-y-6">
                
                {/* Total Stock Indicator */}
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-2xl shadow-lg text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-green-100">Ketersediaan Gudang Utama</p>
                  <h3 className="text-4xl font-black mt-2 tracking-tight">
                    {stokGudang.toLocaleString('id-ID')} <span className="text-lg font-normal text-green-100">kg</span>
                  </h3>
                  <p className="text-xs text-green-100 mt-4 leading-relaxed opacity-90">
                    Ketersediaan ini adalah persediaan jatah pupuk pusat yang dapat diambil oleh seluruh warga penerima subsidi desa.
                  </p>
                </div>

                {/* Form Add */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                    {isEditingPupukMasuk ? '✏️ Edit Riwayat Pupuk Masuk' : '📥 Input Stok Gudang Baru'}
                  </h2>

                  <form onSubmit={handleAddPupukMasuk} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Pupuk Masuk (kg)</label>
                      <input 
                        type="number"
                        value={inputJumlahMasuk}
                        onChange={e => setInputJumlahMasuk(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                        placeholder="Contoh: 1000"
                        min={1}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Keterangan Sumber / Produsen</label>
                      <input 
                        type="text"
                        value={inputKeteranganMasuk}
                        onChange={e => setInputKeteranganMasuk(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                        placeholder="Contoh: PT Pupuk Sriwidjaja Palembang"
                      />
                    </div>

                    <div className="flex gap-2">
                      {isEditingPupukMasuk && (
                        <button 
                          type="button"
                          onClick={resetPupukMasukForm}
                          className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition"
                        >
                          Batal
                        </button>
                      )}
                      <button 
                        type="submit"
                        className={`${isEditingPupukMasuk ? 'w-1/2' : 'w-full'} bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md shadow-green-100 flex items-center justify-center gap-2`}
                      >
                        <PlusCircle className="w-4 h-4" /> {isEditingPupukMasuk ? 'Simpan Perubahan' : 'Simpan Stok Gudang'}
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Logs List Table */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">📋 Riwayat Stok Pupuk Masuk</h2>
                  <p className="text-xs text-slate-400">Log lengkap pengiriman barang dan penambahan kapasitas stok gudang pusat desa.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse" id="pupuk_masuk_table">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="py-3 px-2">Tanggal Catat</th>
                        <th className="py-3 px-2 text-center">Stok Masuk</th>
                        <th className="py-3 px-2">Keterangan Pengadaan</th>
                        <th className="py-3 px-2 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pupukMasukList.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-2 text-slate-500 font-medium text-xs">
                            {new Date(log.tanggal).toLocaleString('id-ID', {
                              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
                            })} WITA
                          </td>
                          <td className="py-3.5 px-2 text-center font-black text-green-700 text-sm">
                            +{log.jumlahMasuk.toLocaleString('id-ID')} kg
                          </td>
                          <td className="py-3.5 px-2 text-slate-500 italic text-xs">{log.keterangan}</td>
                          <td className="py-3.5 px-2 text-right space-x-1.5 whitespace-nowrap">
                            <button 
                              onClick={() => startEditPupukMasuk(log)}
                              className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 p-2 rounded-xl transition inline-flex items-center gap-1 font-bold"
                              title="Edit riwayat"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeletePupukMasuk(log.id)}
                              className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition inline-flex items-center gap-1 font-bold"
                              title="Hapus riwayat"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        </tr>
                      ))}

                      {pupukMasukList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                            Belum ada pencatatan pupuk masuk gudang utama.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* 4. VIEW: TRANSAKSI */}
          {activeTab === 'transaksi' && (
            <motion.div 
              key="transaksi"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              id="view_transaksi"
            >
              
              {/* Form Input Transaksi & Real-time Warnings */}
              <div className="space-y-6">
                
                {/* Available Warehouse Indicator */}
                <div className="bg-slate-800 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ketersediaan Stok Gudang Pusat</span>
                  <h4 className="text-3xl font-black mt-1 text-green-400">
                    {stokGudang.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-300">kg</span>
                  </h4>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    {isEditingTransaksi ? '✏️ Edit Pengambilan Pupuk' : '🧾 Catat Pengambilan Pupuk'}
                  </h2>

                  <form onSubmit={handleSaveTransaksi} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Warga Penerima Jatah</label>
                      <select 
                        value={selectedWargaId}
                        onChange={e => setSelectedWargaId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                        required
                      >
                        <option value="">-- Pilih Warga Penerima --</option>
                        {wargaList.map(w => {
                          const existingTx = isEditingTransaksi ? transaksiList.find(tx => tx.id === editingTransaksiId) : null;
                          const isCurrentlyEditedWarga = existingTx && existingTx.wargaId === w.id;
                          const isDisabled = w.sisaJatah <= 0 && !isCurrentlyEditedWarga;
                          return (
                            <option key={w.id} value={w.id} disabled={isDisabled}>
                              {w.nama} - [Sisa: {w.sisaJatah} kg] {isDisabled ? '(Kuota Habis)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Pengambilan (kg)</label>
                      <input 
                        type="number"
                        value={inputJumlahAmbil}
                        onChange={e => setInputJumlahAmbil(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium bg-slate-50"
                        placeholder="Contoh: 50"
                        min={1}
                        required
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Warga diperbolehkan mengambil kuota jatahnya secara bertahap / sebagian.</span>
                    </div>

                    {/* DYNAMIC REAL-TIME SINKRONISASI WARNINGS (Lapis 1 & Lapis 2) */}
                    {selectedWargaId && inputJumlahAmbil !== '' && (() => {
                      const existingTx = isEditingTransaksi ? transaksiList.find(tx => tx.id === editingTransaksiId) : null;
                      const maxAmbilWarga = currentSelectedWarga ? (currentSelectedWarga.sisaJatah + (existingTx && existingTx.wargaId === currentSelectedWarga.id ? existingTx.jumlahAmbil : 0)) : 0;
                      const maxAmbilGudang = stokGudang + (existingTx ? existingTx.jumlahAmbil : 0);
                      const isLapis1Lolos = Number(inputJumlahAmbil) > 0;
                      const isLapis2WargaLolos = currentSelectedWarga ? Number(inputJumlahAmbil) <= maxAmbilWarga : false;
                      const isLapis2GudangLolos = Number(inputJumlahAmbil) <= maxAmbilGudang;
                      return (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                          <h4 className="font-bold text-slate-700 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Evaluasi Aturan Validasi:
                          </h4>
                          
                          {/* Validation Lapis 1 Check */}
                          <div className="flex items-center gap-2">
                            <span className={!isLapis1Lolos ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                              {!isLapis1Lolos ? '❌ Lapis 1 Gagal' : '✓ Lapis 1 Lolos'}
                            </span>
                            <span className="text-slate-500">: Kuantitas input ({inputJumlahAmbil} kg) lebih besar dari nol.</span>
                          </div>

                          {/* Validation Lapis 2 Check: Warga Quota */}
                          {currentSelectedWarga && (
                            <div className="flex items-center gap-2">
                              <span className={!isLapis2WargaLolos ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                                {!isLapis2WargaLolos ? '❌ Lapis 2 Gagal' : '✓ Lapis 2 Lolos'}
                              </span>
                              <span className="text-slate-500">
                                : Input tidak melebihi sisa jatah {currentSelectedWarga.nama} ({maxAmbilWarga} kg{existingTx && existingTx.wargaId === currentSelectedWarga.id ? ' - setelah penyesuaian' : ''}).
                              </span>
                            </div>
                          )}

                          {/* Validation Lapis 2 Check: Gudang Stock */}
                          <div className="flex items-center gap-2">
                            <span className={!isLapis2GudangLolos ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                              {!isLapis2GudangLolos ? '❌ Lapis 2 Gagal' : '✓ Lapis 2 Lolos'}
                            </span>
                            <span className="text-slate-500">
                              : Input tidak melebihi sisa ketersediaan gudang pusat ({maxAmbilGudang} kg{existingTx ? ' - setelah penyesuaian' : ''}).
                            </span>
                          </div>

                          {/* Summary Status */}
                          <div className="mt-3 pt-2.5 border-t border-slate-200">
                            {isLapis1Lolos && isLapis2WargaLolos && isLapis2GudangLolos ? (
                              <p className="text-emerald-700 font-bold bg-emerald-50 p-2 rounded text-center">
                                👍 Transaksi AMAN & SIAP DISINKRONKAN!
                              </p>
                            ) : (
                              <p className="text-rose-700 font-bold bg-rose-50 p-2 rounded text-center">
                                🚨 TRANSAKSI AKAN DITOLAK OLEH SISTEM PHP & DATABASE!
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex gap-2">
                      {isEditingTransaksi && (
                        <button 
                          type="button"
                          onClick={resetTransaksiForm}
                          className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition"
                        >
                          Batal
                        </button>
                      )}
                      <button 
                        type="submit"
                        disabled={(() => {
                          const existingTx = isEditingTransaksi ? transaksiList.find(tx => tx.id === editingTransaksiId) : null;
                          const maxAmbilWarga = currentSelectedWarga ? (currentSelectedWarga.sisaJatah + (existingTx && existingTx.wargaId === currentSelectedWarga.id ? existingTx.jumlahAmbil : 0)) : 0;
                          const maxAmbilGudang = stokGudang + (existingTx ? existingTx.jumlahAmbil : 0);
                          return (
                            !selectedWargaId || 
                            inputJumlahAmbil === '' || 
                            Number(inputJumlahAmbil) <= 0 || 
                            (currentSelectedWarga && Number(inputJumlahAmbil) > maxAmbilWarga) || 
                            Number(inputJumlahAmbil) > maxAmbilGudang
                          );
                        })()}
                        className={`font-bold py-3.5 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 ${
                          isEditingTransaksi ? 'w-1/2' : 'w-full'
                        } ${
                          (() => {
                            const existingTx = isEditingTransaksi ? transaksiList.find(tx => tx.id === editingTransaksiId) : null;
                            const maxAmbilWarga = currentSelectedWarga ? (currentSelectedWarga.sisaJatah + (existingTx && existingTx.wargaId === currentSelectedWarga.id ? existingTx.jumlahAmbil : 0)) : 0;
                            const maxAmbilGudang = stokGudang + (existingTx ? existingTx.jumlahAmbil : 0);
                            return (
                              !selectedWargaId || 
                              inputJumlahAmbil === '' || 
                              Number(inputJumlahAmbil) <= 0 || 
                              (currentSelectedWarga && Number(inputJumlahAmbil) > maxAmbilWarga) || 
                              Number(inputJumlahAmbil) > maxAmbilGudang
                            );
                          })()
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-100'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" /> {isEditingTransaksi ? 'Simpan Perubahan' : 'Simpan & Sinkronisasi Data'}
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Transaction Log Table */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">📋 Riwayat Penyaluran Pupuk Subsidi Desa</h2>
                  <p className="text-xs text-slate-400">Seluruh catatan historis transaksi pengambilan pupuk subsidi beserta sinkronisasi otomatisnya.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse" id="transaksi_history_table">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="py-3 px-2">Tanggal & Jam Ambil</th>
                        <th className="py-3 px-2">Nama Warga</th>
                        <th className="py-3 px-2 text-right">Jumlah Diambil</th>
                        <th className="py-3 px-2 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transaksiList.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-2 text-slate-500 font-medium text-xs">
                            {new Date(tx.tanggalAmbil).toLocaleString('id-ID', {
                              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
                            })} WITA
                          </td>
                          <td className="py-3.5 px-2 font-bold text-slate-800">{tx.wargaNama}</td>
                          <td className="py-3.5 px-2 text-right font-black text-rose-600 text-base">
                            -{tx.jumlahAmbil.toLocaleString('id-ID')} kg
                          </td>
                          <td className="py-3.5 px-2 text-right space-x-1.5 whitespace-nowrap">
                            <button 
                              onClick={() => startEditTransaksi(tx)}
                              className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 p-2 rounded-xl transition inline-flex items-center gap-1 font-bold"
                              title="Edit transaksi"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaksi(tx)}
                              className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition inline-flex items-center gap-1 font-bold"
                              title="Hapus transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </td>
                        </tr>
                      ))}

                      {transaksiList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                            Belum ada riwayat transaksi pengambilan terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

          {/* 4.5 VIEW: PENGATURAN AKUN */}
          {activeTab === 'pengaturan' && (
            <motion.div
              key="pengaturan"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto"
              id="view_pengaturan"
            >
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="bg-green-100 text-green-700 p-2.5 rounded-xl text-lg">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Pengaturan Kredensial Admin</h2>
                    <p className="text-xs text-slate-400 font-medium">Perbarui nama lengkap, username, dan password untuk mengamankan akses sistem.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div>
                    <label htmlFor="settings_nama" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nama Lengkap Administrator</label>
                    <input 
                      type="text" 
                      id="settings_nama" 
                      required
                      value={settingsNama}
                      onChange={(e) => setSettingsNama(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 font-medium text-slate-800"
                      placeholder="Masukkan nama lengkap admin"
                    />
                  </div>

                  <div>
                    <label htmlFor="settings_username" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Username Baru</label>
                    <input 
                      type="text" 
                      id="settings_username" 
                      required
                      value={settingsUsername}
                      onChange={(e) => setSettingsUsername(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 font-medium text-slate-800"
                      placeholder="Masukkan username baru"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">Username ini digunakan untuk login sesi administrator.</span>
                  </div>

                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Ganti Password (Opsional)</h3>
                      <p className="text-xs text-slate-400">Kosongkan kolom di bawah ini jika tidak ingin memperbarui password saat ini.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="settings_password" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Password Baru</label>
                        <input 
                          type="password" 
                          id="settings_password" 
                          value={settingsPassword}
                          onChange={(e) => setSettingsPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 text-slate-800"
                          placeholder="Password baru"
                        />
                      </div>

                      <div>
                        <label htmlFor="settings_confirm_password" className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Konfirmasi Password</label>
                        <input 
                          type="password" 
                          id="settings_confirm_password" 
                          value={settingsConfirmPassword}
                          onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 text-slate-800"
                          placeholder="Konfirmasi password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-sm shadow-green-100 flex items-center gap-2"
                    >
                      Simpan Perubahan Kredensial 💾
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* 5. VIEW: SOURCE CODE */}
          {activeTab === 'source_code' && (
            <motion.div 
              key="source_code"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
              id="view_source_code"
            >
              
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-amber-400 flex items-center gap-2">
                      <Database className="w-5 h-5 text-amber-500 animate-pulse" /> Kode Sumber PHP Native & Skema MySQL (XAMPP / phpMyAdmin)
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Salin atau unduh file-file lengkap berikut untuk pengujian Quality Assurance dan integrasi offline Anda dengan database relasional MySQL.
                    </p>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleCopyCode(selectedSourceFile)}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      {copiedFilename === selectedSourceFile.filename ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" /> Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Salin Kode
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => handleDownloadCode(selectedSourceFile)}
                      className="bg-amber-600 hover:bg-amber-700 text-slate-900 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh File
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
                  
                  {/* File Select Column */}
                  <div className="lg:col-span-1 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2 px-2">Daftar File Project</span>
                    {PHP_MYSQL_SOURCES.map(file => (
                      <button 
                        key={file.filename}
                        onClick={() => setSelectedSourceFile(file)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between group ${
                          selectedSourceFile.filename === file.filename 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                            : 'text-slate-400 hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <span className="truncate flex items-center gap-2">
                          <span className={file.language === 'sql' ? 'text-amber-500' : 'text-blue-400'}>
                            {file.language === 'sql' ? '🗄️' : '🐘'}
                          </span>
                          {file.filename}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-slate-500" />
                      </button>
                    ))}
                  </div>

                  {/* Code View Area */}
                  <div className="lg:col-span-3 space-y-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Keterangan File</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedSourceFile.description}</p>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-850">
                        <span className="text-[10px] font-mono text-slate-400">{selectedSourceFile.filename} ({selectedSourceFile.language.toUpperCase()})</span>
                        <div className="flex gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        </div>
                      </div>
                      
                      <pre className="p-5 text-xs font-mono overflow-auto max-h-[480px] text-slate-300 select-all leading-relaxed whitespace-pre" id="code_preview">
                        <code>{selectedSourceFile.code}</code>
                      </pre>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
        
      </main>

      <footer className="bg-white border-t border-slate-150 py-8 text-center text-xs text-slate-400 font-medium">
        <p>&copy; 2026 SIMPUDI Desa. Seluruh hak cipta dilindungi. Purwarupa Interaktif (React & TS) & Distribusi File PHP Native / MySQL.</p>
      </footer>

      {/* --- POPUP DIALOGS / CUSTOM MODALS (Avoids window.confirm blocked by iframes) --- */}
      <AnimatePresence>
        {/* Logout Modal */}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Card Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative z-10 overflow-hidden"
              id="logout_confirmation_modal"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <LogOut className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">Konfirmasi Keluar Sesi</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Apakah Anda yakin ingin keluar dari sistem? Sesi administrator Anda saat ini akan dihentikan secara total.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-150 transition"
                  id="cancel_logout_btn"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-md shadow-rose-100"
                  id="confirm_logout_btn"
                >
                  Ya, Keluar Sesi
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Warga Modal */}
        {deleteWargaTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteWargaTarget(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Card Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative z-10 overflow-hidden"
              id="delete_warga_confirmation_modal"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">Hapus Data Warga</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Apakah Anda yakin ingin menghapus warga <span className="font-extrabold text-slate-800">"{deleteWargaTarget.nama}"</span> dari sistem? Seluruh data transaksi terkait akan dihapus secara permanen.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteWargaTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-150 transition"
                  id="cancel_delete_warga_btn"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteWarga}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-md shadow-rose-100"
                  id="confirm_delete_warga_btn"
                >
                  Hapus Permanen 🗑️
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Pupuk Masuk Modal */}
        {deletePupukMasukTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletePupukMasukTarget(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Card Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative z-10 overflow-hidden"
              id="delete_pupuk_masuk_confirmation_modal"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">Hapus Riwayat Pupuk Masuk</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Apakah Anda yakin ingin menghapus catatan pengadaan pupuk masuk sebesar <span className="font-extrabold text-slate-800">{deletePupukMasukTarget.jumlahMasuk} kg</span>? Tindakan ini akan mengurangi ketersediaan gudang utama dan sinkronisasi data akan langsung dilakukan.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setDeletePupukMasukTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-150 transition"
                  id="cancel_delete_pupuk_masuk_btn"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePupukMasuk}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-md shadow-rose-100"
                  id="confirm_delete_pupuk_masuk_btn"
                >
                  Hapus & Sesuaikan Stok 🗑️
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Transaksi Modal */}
        {deleteTransaksiTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTransaksiTarget(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Card Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative z-10 overflow-hidden"
              id="delete_transaksi_confirmation_modal"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">Hapus Riwayat Transaksi</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Apakah Anda yakin ingin membatalkan/menghapus transaksi pengambilan pupuk subsidi sebesar <span className="font-extrabold text-slate-800">{deleteTransaksiTarget.jumlahAmbil} kg</span> atas nama <span className="font-extrabold text-slate-800">"{deleteTransaksiTarget.wargaNama}"</span>? Jatah warga dan stok gudang utama akan dipulihkan secara sinkron.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteTransaksiTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-150 transition"
                  id="cancel_delete_transaksi_btn"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTransaksi}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-md shadow-rose-100"
                  id="confirm_delete_transaksi_btn"
                >
                  Hapus & Pulihkan Jatah 🗑️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
