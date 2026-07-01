-- =========================================================================
-- DATABASE: SISTEM MANAJEMEN PUPUK DESA
-- DBMS: MySQL / MariaDB (Kompatibel dengan phpMyAdmin Lokal)
-- =========================================================================

-- Buat database baru jika belum ada
CREATE DATABASE IF NOT EXISTS db_pupuk_desa;
USE db_pupuk_desa;

-- -------------------------------------------------------------------------
-- 1. TABEL: admin
-- Menyimpan kredensial login dan profil administrator desa
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Menyimpan kata sandi (disarankan hash bcrypt pada produksi)
    nama_admin VARCHAR(100) NOT NULL DEFAULT 'Administrator Desa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 2. TABEL: warga (Petani Penerima Jatah Pupuk)
-- Menyimpan profil warga, NIK unik, jatah awal, dan sisa jatah pupuk bersubsidi
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warga (
    id VARCHAR(50) NOT NULL PRIMARY KEY, -- Menggunakan VARCHAR untuk fleksibilitas ID/UUID dari sistem frontend
    nik VARCHAR(16) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    jatah_awal DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Satuan Kilogram (Kg)
    sisa_jatah DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Satuan Kilogram (Kg)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 3. TABEL: pupuk_masuk (Alokasi Stok Gudang)
-- Mencatat arus pasokan pupuk masuk ke gudang desa
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pupuk_masuk (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    jumlah_masuk DECIMAL(10, 2) NOT NULL, -- Satuan Kilogram (Kg)
    tanggal DATE NOT NULL,
    keterangan TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- 4. TABEL: transaksi (Riwayat Pengambilan Pupuk)
-- Mencatat setiap transaksi pengambilan pupuk bersubsidi oleh warga
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksi (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    warga_id VARCHAR(50) NOT NULL,
    jumlah_ambil DECIMAL(10, 2) NOT NULL, -- Satuan Kilogram (Kg)
    tanggal_ambil DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaksi_warga 
        FOREIGN KEY (warga_id) REFERENCES warga(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================================
-- SEED DATA (DATA AWAL UNTUK PENGUJIAN)
-- =========================================================================

-- 1. Menyisipkan Akun Administrator Default (username: admin, password: admin123)
-- Catatan: Pada server produksi asli, password wajib di-hash demi keamanan.
INSERT INTO admin (username, password, nama_admin) VALUES 
('admin', 'admin123', 'Administrator Desa');

-- 2. Menyisipkan Contoh Data Warga/Petani (ID disesuaikan dengan format sistem aplikasi)
INSERT INTO warga (id, nik, nama, jatah_awal, sisa_jatah) VALUES
('warga-1', '3507123456780001', 'Budi Santoso', 150.00, 100.00),
('warga-2', '3507123456780002', 'Siti Rahmawati', 200.00, 200.00),
('warga-3', '3507123456780003', 'Joko Widodo', 120.00, 40.00),
('warga-4', '3507123456780004', 'Agus Setiawan', 180.00, 180.00),
('warga-5', '3507123456780005', 'Sri Wahyuni', 160.00, 110.00);

-- 3. Menyisipkan Contoh Stok Pupuk Masuk (Gudang Desa)
INSERT INTO pupuk_masuk (id, jumlah_masuk, tanggal, keterangan) VALUES
('stok-1', 1000.00, '2026-06-15', 'Pasokan pupuk Urea bersubsidi Tahap I'),
('stok-2', 500.00, '2026-06-28', 'Pasokan pupuk NPK Phonska Tambahan');

-- 4. Menyisipkan Contoh Transaksi Pengambilan Pupuk
-- (Menunjukkan sisa jatah di tabel 'warga' yang telah berkurang dari jatah_awal)
INSERT INTO transaksi (id, warga_id, jumlah_ambil, tanggal_ambil) VALUES
('tx-1', 'warga-1', 50.00, '2026-06-20'),
('tx-2', 'warga-3', 80.00, '2026-06-22'),
('tx-3', 'warga-5', 50.00, '2026-06-29');