/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SourceFile {
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const PHP_MYSQL_SOURCES: SourceFile[] = [
  {
    filename: "database.sql",
    language: "sql",
    description: "Struktur database MySQL lengkap beserta relasi, batasan (constraints), dan data awal (seeding) yang siap diimpor melalui phpMyAdmin.",
    code: `-- Database: db_pupuk_desa
-- Dibuat untuk Sistem Manajemen Pupuk Desa

CREATE DATABASE IF NOT EXISTS \`db_pupuk_desa\`;
USE \`db_pupuk_desa\`;

-- 1. Tabel Admin (Autentikasi)
CREATE TABLE IF NOT EXISTS \`admin\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL, -- Berisi hash password bcrypt
  \`nama_lengkap\` VARCHAR(100) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Stok Utama Gudang (Single Row untuk efisiensi ketersediaan pusat)
CREATE TABLE IF NOT EXISTS \`stok_gudang\` (
  \`id\` INT PRIMARY KEY,
  \`stok_sekarang\` INT NOT NULL DEFAULT 0,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_stok_positif CHECK (stok_sekarang >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Warga (Data kuota dan sisa jatah)
CREATE TABLE IF NOT EXISTS \`warga\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nik\` VARCHAR(16) NOT NULL UNIQUE,
  \`nama\` VARCHAR(100) NOT NULL,
  \`jatah_awal\` INT NOT NULL DEFAULT 100, -- kg
  \`sisa_jatah\` INT NOT NULL DEFAULT 100, -- kg
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sisa_jatah CHECK (sisa_jatah >= 0),
  CONSTRAINT chk_jatah_awal CHECK (jatah_awal > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Log Pupuk Masuk
CREATE TABLE IF NOT EXISTS \`pupuk_masuk\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`jumlah_masuk\` INT NOT NULL,
  \`keterangan\` VARCHAR(255) DEFAULT NULL,
  \`tanggal\` DATETIME NOT NULL, -- Kolom DATETIME pencatatan waktu otomatis ter-sinkronisasi penuh dari PHP (Zona Indonesia Barat)
  CONSTRAINT chk_masuk_positif CHECK (jumlah_masuk > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Transaksi Pengambilan Pupuk (Relasi warga_id -> warga.id)
CREATE TABLE IF NOT EXISTS \`transaksi\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`warga_id\` INT NOT NULL,
  \`jumlah_ambil\` INT NOT NULL,
  \`tanggal_ambil\` DATETIME NOT NULL, -- Kolom DATETIME pencatatan waktu otomatis ter-sinkronisasi penuh dari PHP (Zona Indonesia Barat)
  CONSTRAINT chk_ambil_positif CHECK (jumlah_ambil > 0),
  FOREIGN KEY (\`warga_id\`) REFERENCES \`warga\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =======================================================
-- SEED DATA AWAL (Password admin default: admin123)
-- =======================================================

-- Admin Default (Username: admin, Password: admin123 menggunakan password_hash bcrypt)
INSERT INTO \`admin\` (\`username\`, \`password\`, \`nama_lengkap\`) 
VALUES ('admin', '$2y$10$oX3hL92uS20v2xY579XnEubfG1zTj8tE6l/9v76i9Ico26kZzK7pG', 'Administrator Desa')
ON DUPLICATE KEY UPDATE \`nama_lengkap\`=VALUES(\`nama_lengkap\`);

-- Inisialisasi Stok Gudang Utama (Nilai awal 500 kg)
INSERT INTO \`stok_gudang\` (\`id\`, \`stok_sekarang\`) 
VALUES (1, 500)
ON DUPLICATE KEY UPDATE \`stok_sekarang\`=VALUES(\`stok_sekarang\`);

-- Data Warga Contoh
INSERT INTO \`warga\` (\`nik\`, \`nama\`, \`jatah_awal\`, \`sisa_jatah\`) VALUES
('3201020304050001', 'Budi Santoso', 120, 120),
('3201020304050002', 'Siti Rahmawati', 100, 100),
('3201020304050003', 'Joko Widodo', 150, 150),
('3201020304050004', 'Agus Susanto', 80, 80)
ON DUPLICATE KEY UPDATE \`nama\`=VALUES(\`nama\`);
`
  },
  {
    filename: "koneksi.php",
    language: "php",
    description: "Koneksi database aman menggunakan ekstensi PDO PHP dengan konfigurasi Zona Waktu Indonesia Tengah (WITA) secara default.",
    code: `<?php
/**
 * File Koneksi Database PDO & Konfigurasi Zona Waktu
 * Sistem Manajemen Pupuk Desa
 */

// Menetapkan Zona Waktu Resmi Indonesia Tengah (WITA) untuk sinkronisasi antarmuka dan basis data
date_default_timezone_set('Asia/Makassar');

$host = "localhost";
$username = "root";
$password = "";
$database = "db_pupuk_desa";

try {
    // Membuat koneksi PDO dengan charset utf8mb4
    $dsn = "mysql:host=$host;dbname=$database;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    die("Koneksi database gagal: " . $e->getMessage());
}
?>`
  },
  {
    filename: "index.php",
    language: "php",
    description: "Gerbang masuk utama web yang melakukan pengecekan sesi admin secara murni dan otomatis mengarahkan ke dashboard atau login.",
    code: `<?php
/**
 * Gerbang Masuk Utama (Routing Sesi)
 * Sistem Manajemen Pupuk Desa
 */
session_start();

// Cek apakah sesi administrator sudah aktif
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    // Jika aktif, alihkan langsung ke halaman dasbor utama
    header("Location: dashboard.php");
    exit;
} else {
    // Jika tidak ada sesi aktif, alihkan paksa ke halaman login.php
    header("Location: login.php");
    exit;
}
?>`
  },
  {
    filename: "login.php",
    language: "php",
    description: "Halaman login administrator menggunakan session aman dan validasi password terenkripsi password_hash.",
    code: `<?php
// Pengaturan header keamanan anti-cache tingkat lanjut
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

date_default_timezone_set('Asia/Makassar');
/**
 * Halaman Login Admin
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

$error = "";

// Jika admin sudah login, alihkan langsung ke dashboard
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header("Location: dashboard.php");
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['kredensial_unik_admin'] ?? '');
    $password = $_POST['sandi_rahasia_desa'] ?? '';

    // Validasi Lapis 3: Form tidak boleh kosong
    if (empty($username) || empty($password)) {
        $error = "Username dan Password wajib diisi!";
    } else {
        try {
            $stmt = $pdo->prepare("SELECT * FROM admin WHERE username = :username");
            $stmt->execute(['username' => $username]);
            $admin = $stmt->fetch();

            if ($admin && password_verify($password, $admin['password'])) {
                // Set data session
                $_SESSION['admin_logged_in'] = true;
                $_SESSION['admin_id'] = $admin['id'];
                $_SESSION['admin_username'] = $admin['username'];
                $_SESSION['admin_nama'] = $admin['nama_lengkap'];
                
                header("Location: dashboard.php");
                exit;
            } else {
                $error = "Username atau password salah!";
            }
        } catch (PDOException $e) {
            $error = "Terjadi kesalahan sistem: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Sistem Manajemen Pupuk Desa</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 flex items-center justify-center min-h-screen">
    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-slate-100">
        <div class="text-center mb-8">
            <div class="bg-green-100 text-green-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">🌾</div>
            <h1 class="text-2xl font-bold text-slate-800 tracking-tight">SIMPUDI DESA</h1>
            <p class="text-sm text-slate-500 mt-1">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 text-sm">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <form action="login.php" method="POST" class="space-y-5" autocomplete="off">
            <!-- Fake honeypot inputs to absorb aggressive browser auto-fill -->
            <input type="text" style="display:none; opacity:0; position:absolute;" tabindex="-1" name="fake_username_autofill_preventer">
            <input type="password" style="display:none; opacity:0; position:absolute;" tabindex="-1" name="fake_password_autofill_preventer">

            <div>
                <label for="admin_cred" class="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                <input type="text" id="admin_cred" name="kredensial_unik_admin" required autocomplete="off"
                       value="" readonly="readonly" onfocus="this.removeAttribute('readonly');"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-700 bg-slate-50"
                       placeholder="Masukkan username admin">
            </div>

            <div>
                <label for="secret_lock" class="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <input type="password" id="secret_lock" name="sandi_rahasia_desa" required autocomplete="new-password"
                       value="" readonly="readonly" onfocus="this.removeAttribute('readonly');"
                       class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-700 bg-slate-50"
                       placeholder="Masukkan password">
            </div>

            <button type="submit" 
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-sm shadow-green-200">
                Masuk ke Sistem
            </button>
        </form>
    </div>

    <!-- JavaScript Antidote Auto-fill -->
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Jeda pertama: 100ms
            setTimeout(function() {
                var credInput = document.getElementById("admin_cred");
                var lockInput = document.getElementById("secret_lock");
                if (credInput) credInput.value = "";
                if (lockInput) lockInput.value = "";
            }, 100);

            // Jeda kedua: 500ms untuk menyapu bersih autofill yang terlambat
            setTimeout(function() {
                var credInput = document.getElementById("admin_cred");
                var lockInput = document.getElementById("secret_lock");
                if (credInput) credInput.value = "";
                if (lockInput) lockInput.value = "";
            }, 500);
            
            // Lapis perlindungan tambahan saat halaman terfokus
            window.addEventListener("pageshow", function() {
                var credInput = document.getElementById("admin_cred");
                var lockInput = document.getElementById("secret_lock");
                if (credInput) credInput.value = "";
                if (lockInput) lockInput.value = "";
            });

            // JavaScript Aggressive Force-Clear: setInterval setiap 50ms selama 2 detik pertama
            var forceClearInterval = setInterval(function() {
                var credInput = document.getElementById("admin_cred");
                var lockInput = document.getElementById("secret_lock");
                // Hanya mengosongkan jika elemen input sedang tidak aktif difokuskan (sedang tidak diketik manual oleh admin)
                if (credInput && document.activeElement !== credInput) {
                    credInput.value = "";
                }
                if (lockInput && document.activeElement !== lockInput) {
                    lockInput.value = "";
                }
            }, 50);

            // Hentikan interval setelah 2 detik untuk mempersilakan input manual tanpa gangguan
            setTimeout(function() {
                clearInterval(forceClearInterval);
            }, 2000);
        });
    </script>
</body>
</html>`
  },
  {
    filename: "logout.php",
    language: "php",
    description: "Script logout aman yang menghapus seluruh data sesi admin secara total dengan menghapus cookie sesi, session_unset(), dan session_destroy() lalu otomatis mengalihkan ke login.php.",
    code: `<?php
/**
 * Logika Logout Admin (Penghancuran Sesi Absolut)
 * Sistem Manajemen Pupuk Desa
 */
session_start();

// Bebaskan semua variabel sesi secara total
session_unset();

// Kosongkan array $_SESSION secara total
$_SESSION = array();

// Jika menggunakan cookie sesi, hapus cookie sesi secara menyeluruh dari browser
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Hancurkan sesi pada server secara total
session_destroy();

// Otomatis mengalihkan pengguna kembali ke halaman login.php
header("Location: login.php");
exit;
?>`
  },
  {
    filename: "dashboard.php",
    language: "php",
    description: "Halaman dasbor utama yang merangkum statistik krusial, ketersediaan pupuk, log aktivitas terbaru, serta fitur pencarian responsif.",
    code: `<?php
/**
 * Dasbor Utama Admin
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

// 1. Ambil Stok Gudang Utama saat ini
$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_utama = $stmtStok->fetchColumn() ?: 0;

// 2. Hitung Total Warga
$stmtTotalWarga = $pdo->query("SELECT COUNT(*) FROM warga");
$total_warga = $stmtTotalWarga->fetchColumn();

// 3. Hitung Total Sisa Jatah Semua Warga
$stmtTotalSisa = $pdo->query("SELECT SUM(sisa_jatah) FROM warga");
$total_sisa_jatah = $stmtTotalSisa->fetchColumn() ?: 0;

// 4. Hitung Total Transaksi
$stmtTotalTx = $pdo->query("SELECT COUNT(*) FROM transaksi");
$total_transaksi = $stmtTotalTx->fetchColumn();

// 5. Fitur Search / Pencarian Nama Warga yang Responsif
$search = trim($_GET['search'] ?? '');
$warga_list = [];

if ($search !== '') {
    $stmtWarga = $pdo->prepare("SELECT * FROM warga WHERE nama LIKE :search OR nik LIKE :search ORDER BY nama ASC");
    $stmtWarga->execute(['search' => "%$search%"]);
    $warga_list = $stmtWarga->fetchAll();
} else {
    // Ambil 5 warga teratas secara default untuk tampilan dashboard awal
    $stmtWarga = $pdo->query("SELECT * FROM warga ORDER BY created_at DESC LIMIT 5");
    $warga_list = $stmtWarga->fetchAll();
}

// 6. Ambil 5 Transaksi Pengambilan Terakhir
$stmtTxLog = $pdo->query("SELECT t.*, w.nama as nama_warga FROM transaksi t JOIN warga w ON t.warga_id = w.id ORDER BY t.tanggal_ambil DESC LIMIT 5");
$transaksi_terbaru = $stmtTxLog->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dasbor SIMPUDI - Sistem Informasi Manajemen Pupuk Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen font-sans text-slate-800">
    
    <!-- Navbar / Header -->
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold tracking-tight text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <!-- Compact Real-Time Clock Widget (WITA Zone) -->
                <div class="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hidden md:block">
                    <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center justify-end gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        WAKTU SISTEM (WITA)
                    </p>
                    <p id="realtime-clock" class="text-xs font-bold text-slate-700 font-mono">Memuat...</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-semibold text-slate-700"><?php echo htmlspecialchars($_SESSION['admin_nama']); ?></p>
                    <p class="text-xs text-green-600 font-semibold">Administrator</p>
                </div>
                <a href="logout.php" onclick="return confirm('Apakah Anda yakin ingin keluar?')"
                   class="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2 rounded-xl text-sm transition">
                    Keluar 🚪
                </a>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        
        <!-- Menu Navigasi Modul -->
        <nav class="flex flex-wrap gap-3 mb-8">
            <a href="dashboard.php" class="bg-green-600 text-white font-semibold px-5 py-3 rounded-xl shadow-sm text-sm hover:bg-green-700 transition">
                🏠 Dasbor Utama
            </a>
            <a href="warga.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                👥 Kelola Data Warga
            </a>
            <a href="pupuk_masuk.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                📥 Pupuk Masuk (Stok Gudang)
            </a>
            <a href="transaksi.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                🧾 Transaksi Pengambilan
            </a>
            <a href="pengaturan.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                ⚙️ Pengaturan Akun
            </a>
        </nav>

        <!-- Informasi Ringkasan / Bento Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- 1. Stok Gudang -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Stok Gudang Utama</span>
                    <span class="bg-green-100 text-green-700 p-2 rounded-lg text-lg">🏭</span>
                </div>
                <h3 class="text-3xl font-extrabold text-slate-900"><?php echo number_format($stok_utama); ?> <span class="text-lg font-medium text-slate-500">kg</span></h3>
                <p class="text-xs text-slate-400 mt-2 font-medium">Ketersediaan pupuk di gudang pusat</p>
            </div>

            <!-- 2. Total Warga -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Warga</span>
                    <span class="bg-blue-100 text-blue-700 p-2 rounded-lg text-lg">👥</span>
                </div>
                <h3 class="text-3xl font-extrabold text-slate-900"><?php echo number_format($total_warga); ?> <span class="text-lg font-medium text-slate-500">orang</span></h3>
                <p class="text-xs text-slate-400 mt-2 font-medium">Jumlah warga penerima jatah subsidi</p>
            </div>

            <!-- 3. Sisa Jatah Total -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Sisa Alokasi Jatah</span>
                    <span class="bg-amber-100 text-amber-700 p-2 rounded-lg text-lg">📊</span>
                </div>
                <h3 class="text-3xl font-extrabold text-slate-900"><?php echo number_format($total_sisa_jatah); ?> <span class="text-lg font-medium text-slate-500">kg</span></h3>
                <p class="text-xs text-slate-400 mt-2 font-medium">Sisa total subsidi yang belum diambil</p>
            </div>

            <!-- 4. Total Transaksi -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transaksi</span>
                    <span class="bg-purple-100 text-purple-700 p-2 rounded-lg text-lg">🧾</span>
                </div>
                <h3 class="text-3xl font-extrabold text-slate-900"><?php echo number_format($total_transaksi); ?> <span class="text-lg font-medium text-slate-500">kali</span></h3>
                <p class="text-xs text-slate-400 mt-2 font-medium">Frekuensi penyaluran pupuk desa</p>
            </div>
        </div>

        <!-- Kolom Utama & Samping -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Sisi Kiri: Cari & Ringkasan Warga -->
            <div class="lg:col-span-2 space-y-8">
                
                <!-- Fitur Search Responsif -->
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">🔍 Pencarian Penerima Jatah Pupuk</h2>
                    
                    <form action="dashboard.php" method="GET" class="flex gap-2">
                        <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>"
                               placeholder="Ketik nama atau NIK warga..."
                               class="flex-grow px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                        <button type="submit" class="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-3 rounded-xl text-sm transition">
                            Cari
                        </button>
                        <?php if ($search !== ''): ?>
                            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-3 rounded-xl text-sm transition flex items-center justify-center">
                                Reset
                            </a>
                        <?php endif; ?>
                    </form>

                    <!-- Hasil Pencarian -->
                    <div class="mt-6 overflow-x-auto">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            <?php echo $search !== '' ? 'Hasil Pencarian Warga' : 'Warga Baru Ditambahkan'; ?>
                        </h3>
                        <?php if (count($warga_list) > 0): ?>
                            <table class="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-100 text-slate-400 font-semibold">
                                        <th class="py-3 px-2">Nama Warga</th>
                                        <th class="py-3 px-2">NIK</th>
                                        <th class="py-3 px-2 text-center">Jatah Awal</th>
                                        <th class="py-3 px-2 text-center">Sisa Jatah saat ini</th>
                                        <th class="py-3 px-2 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-50">
                                    <?php foreach ($warga_list as $w): ?>
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="py-3 px-2 font-semibold text-slate-800"><?php echo htmlspecialchars($w['nama']); ?></td>
                                            <td class="py-3 px-2 text-xs font-mono text-slate-500"><?php echo htmlspecialchars($w['nik']); ?></td>
                                            <td class="py-3 px-2 text-center font-medium"><?php echo $w['jatah_awal']; ?> kg</td>
                                            <td class="py-3 px-2 text-center font-bold">
                                                <span class="<?php echo $w['sisa_jatah'] <= 20 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-green-700 bg-green-50 px-2 py-1 rounded'; ?>">
                                                    <?php echo $w['sisa_jatah']; ?> kg
                                                </span>
                                            </td>
                                            <td class="py-3 px-2 text-right">
                                                <?php if ($w['sisa_jatah'] > 0): ?>
                                                    <a href="transaksi.php?warga_id=<?php echo $w['id']; ?>" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition inline-block">
                                                        Ambil Pupuk 🌾
                                                    </a>
                                                <?php else: ?>
                                                    <span class="text-xs text-slate-400 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg">Kuota Habis</span>
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        <?php else: ?>
                            <p class="text-sm text-slate-400 text-center py-6">Data warga tidak ditemukan.</p>
                        <?php endif; ?>
                    </div>
                </div>

            </div>

            <!-- Sisi Kanan: Log Transaksi Terbaru -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">⏱️ Penyaluran Terbaru</h2>
                
                <?php if (count($transaksi_terbaru) > 0): ?>
                    <div class="space-y-4">
                        <?php foreach ($transaksi_terbaru as $tx): ?>
                            <div class="border-b border-slate-50 pb-3 last:border-none last:pb-0">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-bold text-slate-800 text-sm"><?php echo htmlspecialchars($tx['nama_warga']); ?></p>
                                        <p class="text-xs text-slate-400 mt-0.5"><?php echo date('d M Y, H:i', strtotime($tx['tanggal_ambil'])); ?></p>
                                    </div>
                                    <span class="bg-green-100 text-green-700 text-xs font-extrabold px-2.5 py-1 rounded-full">
                                        -<?php echo $tx['jumlah_ambil']; ?> kg
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <div class="mt-6 text-center">
                        <a href="transaksi.php" class="text-xs font-bold text-green-600 hover:text-green-700">Lihat Semua Transaksi →</a>
                    </div>
                <?php else: ?>
                    <p class="text-sm text-slate-400 text-center py-8">Belum ada transaksi pencatatan.</p>
                <?php endif; ?>
            </div>

        </div>

    </main>

    <footer class="bg-white border-t border-slate-100 mt-16 py-8 text-center text-xs text-slate-400">
        <p>&copy; <?php echo date('Y'); ?> SIMPUDI Desa. Dikembangkan dengan PHP PDO Native & Tailwind CSS.</p>
    </footer>

    <!-- Script Jam Dinamis Real-Time Terintegrasi -->
    <script>
    function updateClock() {
        const options = {
            timeZone: 'Asia/Makassar',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        try {
            const formatter = new Intl.DateTimeFormat('id-ID', options);
            document.getElementById('realtime-clock').textContent = formatter.format(new Date()) + ' WITA';
        } catch (e) {
            // Fallback jika pelokalan gagal
            document.getElementById('realtime-clock').textContent = new Date().toLocaleString() + ' (WITA)';
        }
    }
    
    // Jalankan fungsi setiap detik
    setInterval(updateClock, 1000);
    updateClock(); // Jalankan pertama kali langsung
    </script>

</body>
</html>`
  },
  {
    filename: "warga.php",
    language: "php",
    description: "Operasi CRUD Lengkap untuk Data Warga (Tambah, Edit, Hapus) dengan 3 lapis validasi data input di server-side.",
    code: `<?php
/**
 * Modul Kelola Data Warga (CRUD)
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";

// Ambil pesan flash jika ada dari file eksekutor eksternal seperti hapus_warga.php
if (isset($_SESSION['success_msg'])) {
    $success = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

// Mengatur status pengeditan
$is_edit = false;
$edit_data = [
    'id' => '',
    'nik' => '',
    'nama' => '',
    'jatah_awal' => 100,
    'sisa_jatah' => 100
];

// 1. PROSES SIMPAN / EDIT WARGA (CREATE & UPDATE)
if (isset($_POST['submit_warga'])) {
    $id = trim($_POST['id'] ?? '');
    $nik = trim($_POST['nik'] ?? '');
    $nama = trim($_POST['nama'] ?? '');
    $jatah_awal = isset($_POST['jatah_awal']) ? (int)$_POST['jatah_awal'] : 0;
    $sisa_jatah = isset($_POST['sisa_jatah']) ? (int)$_POST['sisa_jatah'] : 0;

    // VALIDASI LAPIS 3: Form pengisian tidak boleh kosong
    if (empty($nik) || empty($nama)) {
        $error = "NIK dan Nama warga tidak boleh dibiarkan kosong!";
    }
    // VALIDASI LAPIS 1: Jatah Awal dan Sisa tidak boleh negatif atau nol
    else if ($jatah_awal <= 0 || $sisa_jatah < 0) {
        $error = "Jatah awal harus lebih besar dari 0, dan sisa jatah tidak boleh bernilai negatif!";
    }
    // VALIDASI LAPIS 2: Sisa jatah tidak boleh melebihi jatah kuota awal warga tersebut
    else if ($sisa_jatah > $jatah_awal) {
        $error = "Sisa jatah saat ini tidak boleh melebihi total kuota jatah awal warga!";
    } 
    else {
        try {
            if (!empty($id)) {
                // UPDATE Data Warga
                $stmt = $pdo->prepare("UPDATE warga SET nik = :nik, nama = :nama, jatah_awal = :jatah_awal, sisa_jatah = :sisa_jatah WHERE id = :id");
                $stmt->execute([
                    'nik' => $nik,
                    'nama' => $nama,
                    'jatah_awal' => $jatah_awal,
                    'sisa_jatah' => $sisa_jatah,
                    'id' => $id
                ]);
                $success = "Data warga berhasil diperbarui!";
            } else {
                // INSERT Data Warga Baru (Sisa jatah otomatis diatur sama dengan jatah awal saat pendaftaran awal)
                // Cek NIK duplikat
                $checkNik = $pdo->prepare("SELECT COUNT(*) FROM warga WHERE nik = :nik");
                $checkNik->execute(['nik' => $nik]);
                if ($checkNik->fetchColumn() > 0) {
                    $error = "Warga dengan NIK $nik sudah terdaftar sebelumnya!";
                } else {
                    $stmt = $pdo->prepare("INSERT INTO warga (nik, nama, jatah_awal, sisa_jatah) VALUES (:nik, :nama, :jatah_awal, :jatah_awal)");
                    $stmt->execute([
                        'nik' => $nik,
                        'nama' => $nama,
                        'jatah_awal' => $jatah_awal
                    ]);
                    $success = "Warga baru berhasil didaftarkan!";
                }
            }
        } catch (PDOException $e) {
            $error = "Gagal memproses data: " . $e->getMessage();
        }
    }
}

// 2. PROSES AKTIFKAN FORM EDIT
if (isset($_GET['edit_id'])) {
    $edit_id = (int)$_GET['edit_id'];
    try {
        $stmt = $pdo->prepare("SELECT * FROM warga WHERE id = :id");
        $stmt->execute(['id' => $edit_id]);
        $row = $stmt->fetch();
        if ($row) {
            $is_edit = true;
            $edit_data = $row;
        }
    } catch (PDOException $e) {
        $error = "Gagal mengambil data untuk edit: " . $e->getMessage();
    }
}

// 3. PROSES HAPUS WARGA (DELETE)
if (isset($_GET['delete_id'])) {
    $delete_id = (int)$_GET['delete_id'];
    try {
        $stmt = $pdo->prepare("DELETE FROM warga WHERE id = :id");
        $stmt->execute(['id' => $delete_id]);
        $success = "Data warga berhasil dihapus dari sistem.";
    } catch (PDOException $e) {
        $error = "Gagal menghapus warga: " . $e->getMessage();
    }
}

// Ambil semua daftar warga
$stmtWarga = $pdo->query("SELECT * FROM warga ORDER BY nama ASC");
$all_warga = $stmtWarga->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kelola Data Warga - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    
    <!-- Navbar -->
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition">
                Kembali ke Dasbor 🏠
            </a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        
        <!-- Pesan Alert Status -->
        <?php if (!empty($error)): ?>
            <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm flex justify-between items-center shadow-sm">
                <span>⚠️ <strong>Error:</strong> <?php echo htmlspecialchars($error); ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm flex justify-between items-center shadow-sm">
                <span>✅ <strong>Sukses:</strong> <?php echo htmlspecialchars($success); ?></span>
            </div>
        <?php endif; ?>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Kolom 1: Form Tambah/Edit Warga -->
            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <?php echo $is_edit ? '✏️ Edit Data Warga' : '➕ Tambah Data Warga'; ?>
                </h2>

                <form action="warga.php" method="POST" class="space-y-5">
                    <input type="hidden" name="id" value="<?php echo htmlspecialchars($edit_data['id']); ?>">

                    <div>
                        <label for="nik" class="block text-sm font-semibold text-slate-700 mb-2">NIK Warga</label>
                        <input type="text" id="nik" name="nik" required maxlength="16" minlength="16"
                               value="<?php echo htmlspecialchars($edit_data['nik']); ?>"
                               <?php echo $is_edit ? 'readonly class="bg-slate-100 cursor-not-allowed"' : 'class="bg-slate-50"'; ?>
                               class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                               placeholder="Masukkan 16 digit NIK">
                    </div>

                    <div>
                        <label for="nama" class="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap Warga</label>
                        <input type="text" id="nama" name="nama" required
                               value="<?php echo htmlspecialchars($edit_data['nama']); ?>"
                               class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                               placeholder="Nama warga penerima">
                    </div>

                    <div>
                        <label for="jatah_awal" class="block text-sm font-semibold text-slate-700 mb-2">Jatah Awal Pupuk (kg)</label>
                        <input type="number" id="jatah_awal" name="jatah_awal" required min="1"
                               value="<?php echo htmlspecialchars($edit_data['jatah_awal']); ?>"
                               class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                               placeholder="Contoh: 100">
                    </div>

                    <?php if ($is_edit): ?>
                        <div>
                            <label for="sisa_jatah" class="block text-sm font-semibold text-slate-700 mb-2">Sisa Jatah Saat Ini (kg)</label>
                            <input type="number" id="sisa_jatah" name="sisa_jatah" required min="0"
                                   value="<?php echo htmlspecialchars($edit_data['sisa_jatah']); ?>"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Contoh: 80">
                            <p class="text-xs text-amber-600 mt-1.5 font-medium">⚠️ Sisa jatah tidak boleh melebihi Jatah Awal.</p>
                        </div>
                    <?php endif; ?>

                    <div class="flex gap-2 pt-2">
                        <button type="submit" name="submit_warga"
                                class="flex-grow bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-sm">
                            <?php echo $is_edit ? 'Simpan Perubahan' : 'Daftarkan Warga'; ?>
                        </button>
                        <?php if ($is_edit): ?>
                            <a href="warga.php" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl text-sm transition text-center">
                                Batal
                            </a>
                        <?php endif; ?>
                    </div>
                </form>
            </div>

            <!-- Kolom 2 & 3: Tabel Daftar Warga -->
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">👥 Daftar Warga Penerima Subsidi</h2>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-150 text-slate-400 font-semibold">
                                <th class="py-3 px-2">NIK</th>
                                <th class="py-3 px-2">Nama Warga</th>
                                <th class="py-3 px-2 text-center">Jatah Awal</th>
                                <th class="py-3 px-2 text-center">Sisa Jatah</th>
                                <th class="py-3 px-2 text-right">Opsi Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (count($all_warga) > 0): ?>
                                <?php foreach ($all_warga as $w): ?>
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="py-3 px-2 font-mono text-xs text-slate-500"><?php echo htmlspecialchars($w['nik']); ?></td>
                                        <td class="py-3 px-2 font-semibold text-slate-800"><?php echo htmlspecialchars($w['nama']); ?></td>
                                        <td class="py-3 px-2 text-center font-medium"><?php echo $w['jatah_awal']; ?> kg</td>
                                        <td class="py-3 px-2 text-center font-bold">
                                            <span class="<?php echo $w['sisa_jatah'] <= 20 ? 'text-red-600 bg-red-50 px-2.5 py-1 rounded-lg' : 'text-green-700 bg-green-50 px-2.5 py-1 rounded-lg'; ?>">
                                                <?php echo $w['sisa_jatah']; ?> kg
                                            </span>
                                        </td>
                                        <td class="py-3 px-2 text-right space-x-2">
                                            <a href="warga.php?edit_id=<?php echo $w['id']; ?>" class="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Edit
                                            </a>
                                            <a href="hapus_warga.php?id=<?php echo $w['id']; ?>" 
                                               onclick="return confirm('Apakah Anda yakin ingin menghapus data warga <?php echo htmlspecialchars($w['nama']); ?>? Seluruh riwayat transaksi terkait juga akan terhapus secara permanen.')"
                                               class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Hapus
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" class="py-8 text-center text-slate-400">Belum ada data warga terdaftar.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

    </main>

    <footer class="bg-white border-t border-slate-100 mt-16 py-8 text-center text-xs text-slate-400">
        <p>&copy; <?php echo date('Y'); ?> SIMPUDI Desa. Hak Cipta Dilindungi.</p>
    </footer>

</body>
</html>`
  },
  {
    filename: "pupuk_masuk.php",
    language: "php",
    description: "Modul penambahan ketersediaan total stok utama gudang dengan riwayat barang masuk dan 3 lapis validasi ketat.",
    code: `<?php
/**
 * Modul Pupuk Masuk (Tambah Stok Gudang)
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";

// Ambil pesan flash jika ada dari file eksekutor eksternal
if (isset($_SESSION['success_msg'])) {
    $success = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

// Ambil Stok Gudang Utama saat ini
$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_sekarang = $stmtStok->fetchColumn() ?: 0;

// PROSES TAMBAH STOK
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_stok'])) {
    $jumlah_masuk = isset($_POST['jumlah_masuk']) ? (int)$_POST['jumlah_masuk'] : 0;
    $keterangan = trim($_POST['keterangan'] ?? '');

    // VALIDASI LAPIS 3: Form jumlah barang tidak boleh kosong saat disubmit
    if (empty($_POST['jumlah_masuk'])) {
        $error = "Jumlah kuantitas pupuk masuk tidak boleh kosong!";
    }
    // VALIDASI LAPIS 1: Jumlah pupuk yang diinput tidak boleh menerima angka negatif atau nol
    else if ($jumlah_masuk <= 0) {
        $error = "Jumlah ketersediaan yang dimasukkan wajib bernilai lebih besar dari nol (0)!";
    } 
    else {
        try {
            // Jalankan transaksi database (atomic operation)
            $pdo->beginTransaction();

            // 1. Catat log di tabel pupuk_masuk secara eksplisit menggunakan waktu rill server yang tersinkronisasi (WITA)
            $waktu_sekarang = date('Y-m-d H:i:s');
            $stmtInsert = $pdo->prepare("INSERT INTO pupuk_masuk (jumlah_masuk, keterangan, tanggal) VALUES (:jumlah_masuk, :keterangan, :tanggal)");
            $stmtInsert->execute([
                'jumlah_masuk' => $jumlah_masuk,
                'keterangan' => empty($keterangan) ? 'Pengadaan Stok Tambahan' : $keterangan,
                'tanggal' => $waktu_sekarang
            ]);

            // 2. Perbarui total stok di gudang utama
            $stmtUpdateStok = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang + :jumlah_masuk WHERE id = 1");
            $stmtUpdateStok->execute(['jumlah_masuk' => $jumlah_masuk]);

            $pdo->commit();

            // Ambil ulang nilai stok terbaru
            $stok_sekarang += $jumlah_masuk;
            $success = "Stok utama gudang berhasil ditingkatkan sebanyak $jumlah_masuk kg!";
        } catch (PDOException $e) {
            $pdo->rollBack();
            $error = "Gagal memperbarui stok database: " . $e->getMessage();
        }
    }
}

// Ambil riwayat log pupuk masuk
$stmtLog = $pdo->query("SELECT * FROM pupuk_masuk ORDER BY tanggal DESC LIMIT 15");
$log_masuk = $stmtLog->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pupuk Masuk (Stok Gudang) - SIMPUD Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition">
                Kembali ke Dasbor 🏠
            </a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        
        <?php if (!empty($error)): ?>
            <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm">
                ⚠️ <strong>Error:</strong> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm">
                ✅ <strong>Sukses:</strong> <?php echo htmlspecialchars($success); ?>
            </div>
        <?php endif; ?>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Tambah Stok Form -->
            <div class="space-y-6">
                
                <!-- Display Stok Gudang Utama saat ini -->
                <div class="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-2xl shadow-md text-white">
                    <p class="text-xs font-bold uppercase tracking-wider text-green-100">Ketersediaan Stok Utama</p>
                    <h3 class="text-4xl font-black mt-2"><?php echo number_format($stok_sekarang); ?> <span class="text-lg font-normal text-green-100">kg</span></h3>
                    <p class="text-xs text-green-100 mt-4 opacity-90">Stok ini akan berkurang otomatis ketika transaksi warga dicatat oleh sistem.</p>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">📥 Catat Pupuk Masuk</h2>
                    
                    <form action="pupuk_masuk.php" method="POST" class="space-y-5">
                        <div>
                            <label for="jumlah_masuk" class="block text-sm font-semibold text-slate-700 mb-2">Jumlah Masuk (kg)</label>
                            <input type="number" id="jumlah_masuk" name="jumlah_masuk" required min="1"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Contoh: 1000">
                        </div>

                        <div>
                            <label for="keterangan" class="block text-sm font-semibold text-slate-700 mb-2">Sumber / Keterangan Pengadaan</label>
                            <input type="text" id="keterangan" name="keterangan"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Contoh: PT Pupuk Sriwidjaja Palembang">
                        </div>

                        <button type="submit" name="submit_stok"
                                class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-sm shadow-green-100">
                            Simpan Stok Tambahan 💾
                        </button>
                    </form>
                </div>
            </div>

            <!-- Log Riwayat Pupuk Masuk -->
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">📋 Riwayat Pengadaan Pupuk Gudang Utama</h2>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-150 text-slate-400 font-semibold">
                                <th class="py-3 px-2">Tanggal Pengadaan</th>
                                <th class="py-3 px-2 text-center">Jumlah Stok Masuk</th>
                                <th class="py-3 px-2">Keterangan Sumber</th>
                                <th class="py-3 px-2 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (count($log_masuk) > 0): ?>
                                <?php foreach ($log_masuk as $log): ?>
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="py-3 px-2 font-medium text-slate-600 text-xs">
                                            <?php echo date('d M Y, H:i', strtotime($log['tanggal'])); ?> WITA
                                        </td>
                                        <td class="py-3 px-2 text-center font-bold text-green-700">
                                            +<?php echo number_format($log['jumlah_masuk']); ?> kg
                                        </td>
                                        <td class="py-3 px-2 text-slate-500 italic">
                                            <?php echo htmlspecialchars($log['keterangan']); ?>
                                        </td>
                                        <td class="py-3 px-2 text-center space-x-1 whitespace-nowrap">
                                            <a href="edit_pupuk_masuk.php?id=<?php echo $log['id']; ?>" class="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Edit ✏️
                                            </a>
                                            <a href="hapus_pupuk_masuk.php?id=<?php echo $log['id']; ?>" 
                                               onclick="return confirm('Apakah Anda yakin ingin menghapus data pengadaan pupuk masuk sebesar <?php echo $log['jumlah_masuk']; ?> kg? Tindakan ini akan secara otomatis mengurangi Total Stok Utama di gudang!')"
                                               class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Hapus 🗑️
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="4" class="py-8 text-center text-slate-400">Belum ada riwayat stok tambahan terdaftar.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </main>

</body>
</html>`
  },
  {
    filename: "transaksi.php",
    language: "php",
    description: "Modul Transaksi Pengambilan Pupuk dengan Logika Sinkronisasi Database Otomatis (mengurangi Jatah Warga dan Stok Gudang Utama sekaligus dalam model transaksi PDO aman). Memiliki 3 lapis validasi input ketat.",
    code: `<?php
/**
 * Modul Transaksi Pengambilan Pupuk Desa
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";

// Ambil pesan flash jika ada dari file eksekutor eksternal
if (isset($_SESSION['success_msg'])) {
    $success = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

// Mengambil warga_id jika diakses langsung dari tombol "Ambil Pupuk" di dasbor
$preselected_warga_id = isset($_GET['warga_id']) ? (int)$_GET['warga_id'] : 0;

// Ambil Stok Gudang Utama saat ini
$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_utama = $stmtStok->fetchColumn() ?: 0;

// Ambil semua daftar warga yang masih memiliki jatah > 0 untuk pilihan di form dropdown
$stmtWargaDropdown = $pdo->query("SELECT * FROM warga WHERE sisa_jatah > 0 ORDER BY nama ASC");
$warga_options = $stmtWargaDropdown->fetchAll();

// PROSES SIMPAN TRANSAKSI PENGAMBILAN
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_transaksi'])) {
    $warga_id = isset($_POST['warga_id']) ? (int)$_POST['warga_id'] : 0;
    $jumlah_ambil = isset($_POST['jumlah_ambil']) ? (int)$_POST['jumlah_ambil'] : 0;

    // VALIDASI LAPIS 3: Form nama warga dan jumlah pengambilan tidak boleh kosong saat disubmit
    if (empty($warga_id) || empty($jumlah_ambil)) {
        $error = "Identitas warga dan jumlah pengambilan pupuk wajib diisi!";
    }
    // VALIDASI LAPIS 1: Jumlah pupuk yang diinput tidak boleh negatif atau nol
    else if ($jumlah_ambil <= 0) {
        $error = "Jumlah pengambilan pupuk harus bernilai lebih besar dari nol (0)!";
    }
    else {
        try {
            // Ambil data warga bersangkutan untuk pengecekan sisa jatah
            $stmtWargaCheck = $pdo->prepare("SELECT nama, sisa_jatah FROM warga WHERE id = :id");
            $stmtWargaCheck->execute(['id' => $warga_id]);
            $warga = $stmtWargaCheck->fetch();

            if (!$warga) {
                $error = "Data warga tidak terdaftar dalam database desa!";
            } else {
                $sisa_jatah_warga = (int)$warga['sisa_jatah'];
                $nama_warga = $warga['nama'];

                // VALIDASI LAPIS 2: Gagal transaksi jika jumlah pengambilan melebihi sisa jatah warga
                if ($jumlah_ambil > $sisa_jatah_warga) {
                    $error = "Transaksi DITOLAK! Jumlah pengambilan ($jumlah_ambil kg) melebihi sisa jatah kuota warga $nama_warga ($sisa_jatah_warga kg).";
                }
                // VALIDASI LAPIS 2: Gagal transaksi jika jumlah pengambilan melebihi sisa ketersediaan stok utama gudang
                else if ($jumlah_ambil > $stok_utama) {
                    $error = "Transaksi DITOLAK! Jumlah pengambilan ($jumlah_ambil kg) melebihi sisa ketersediaan stok utama di gudang pusat desa ($stok_utama kg).";
                }
                else {
                    // Semua validasi ketat terpenuhi, jalankan transaksi database yang aman dan atomic
                    $pdo->beginTransaction();

                    // A. Catat pencatatan ke tabel transaksi secara eksplisit menggunakan waktu rill server yang tersinkronisasi (WITA)
                    $waktu_ambil = date('Y-m-d H:i:s');
                    $stmtInsertTx = $pdo->prepare("INSERT INTO transaksi (warga_id, jumlah_ambil, tanggal_ambil) VALUES (:warga_id, :jumlah_ambil, :tanggal_ambil)");
                    $stmtInsertTx->execute([
                        'warga_id' => $warga_id,
                        'jumlah_ambil' => $jumlah_ambil,
                        'tanggal_ambil' => $waktu_ambil
                    ]);

                    // B. Sinkronisasi: Kurangi Sisa Jatah Warga bersangkutan
                    $stmtDecrWarga = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah - :jumlah_ambil WHERE id = :id");
                    $stmtDecrWarga->execute([
                        'jumlah_ambil' => $jumlah_ambil,
                        'id' => $warga_id
                    ]);

                    // C. Sinkronisasi: Sekaligus kurangi ketersediaan Stok Utama Gudang Pusat
                    $stmtDecrGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :jumlah_ambil WHERE id = 1");
                    $stmtDecrGudang->execute(['jumlah_ambil' => $jumlah_ambil]);

                    // Commit transaksi aman
                    $pdo->commit();

                    // Update local variabel pasca transaksi berhasil untuk rendering UI teraktual
                    $stok_utama -= $jumlah_ambil;
                    $success = "Transaksi SUKSES! Pengambilan pupuk subsidi sebesar $jumlah_ambil kg atas nama $nama_warga berhasil disimpan.";
                    
                    // Refresh opsi warga dropdown
                    $stmtWargaDropdown = $pdo->query("SELECT * FROM warga WHERE sisa_jatah > 0 ORDER BY nama ASC");
                    $warga_options = $stmtWargaDropdown->fetchAll();
                }
            }
        } catch (PDOException $e) {
            $pdo->rollBack();
            $error = "Gagal memproses transaksi database (Rollback): " . $e->getMessage();
        }
    }
}

// Ambil riwayat penyaluran pupuk desa terbaru
$stmtTxHistory = $pdo->query("SELECT t.*, w.nama as nama_warga, w.nik as nik_warga FROM transaksi t JOIN warga w ON t.warga_id = w.id ORDER BY t.tanggal_ambil DESC");
$transaksi_riwayat = $stmtTxHistory->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaksi Pengambilan - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition">
                Kembali ke Dasbor 🏠
            </a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        
        <?php if (!empty($error)): ?>
            <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm">
                ⚠️ <strong>Transaksi Gagal:</strong> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm">
                ✅ <strong>Transaksi Berhasil:</strong> <?php echo htmlspecialchars($success); ?>
            </div>
        <?php endif; ?>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Sisi Kiri: Form Transaksi -->
            <div class="space-y-6">
                <!-- Status Stok Center -->
                <div class="bg-slate-800 p-5 rounded-2xl text-white">
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Ketersediaan Stok Gudang Pusat</span>
                    <h4 class="text-3xl font-extrabold mt-1 text-green-400"><?php echo number_format($stok_utama); ?> <span class="text-sm font-medium text-slate-300">kg</span></h4>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">🧾 Catat Transaksi Pengambilan</h2>
                    
                    <form action="transaksi.php" method="POST" class="space-y-5">
                        
                        <div>
                            <label for="warga_id" class="block text-sm font-semibold text-slate-700 mb-2">Nama Penerima (Warga)</label>
                            <select id="warga_id" name="warga_id" required
                                    class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50">
                                <option value="">-- Pilih Warga Penerima Jatah --</option>
                                <?php foreach ($warga_options as $opt): ?>
                                    <option value="<?php echo $opt['id']; ?>" <?php echo $opt['id'] == $preselected_warga_id ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($opt['nama']); ?> - [NIK: <?php echo $opt['nik']; ?>] (Sisa: <?php echo $opt['sisa_jatah']; ?> kg)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div>
                            <label for="jumlah_ambil" class="block text-sm font-semibold text-slate-700 mb-2">Jumlah Pengambilan (kg)</label>
                            <input type="number" id="jumlah_ambil" name="jumlah_ambil" required min="1"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Contoh: 50">
                            <span class="text-xs text-slate-400 mt-1.5 block leading-relaxed">Admin dapat mencatat pengambilan sebagian (bertahap) dari sisa jatah kuota warga.</span>
                        </div>

                        <button type="submit" name="submit_transaksi"
                                class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-sm shadow-green-100">
                            Simpan & Sinkronisasi Data ⚡
                        </button>
                    </form>
                </div>
            </div>

            <!-- Sisi Kanan: Log Riwayat Transaksi -->
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">📋 Seluruh Riwayat Penyaluran Pupuk Desa</h2>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-150 text-slate-400 font-semibold">
                                <th class="py-3 px-2">Tanggal & Jam Ambil</th>
                                <th class="py-3 px-2">Nama Warga</th>
                                <th class="py-3 px-2">NIK</th>
                                <th class="py-3 px-2 text-right">Jumlah Pengambilan</th>
                                <th class="py-3 px-2 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (count($transaksi_riwayat) > 0): ?>
                                <?php foreach ($transaksi_riwayat as $tx): ?>
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="py-3 px-2 text-slate-500 font-medium text-xs">
                                            <?php echo date('d M Y, H:i', strtotime($tx['tanggal_ambil'])); ?> WITA
                                        </td>
                                        <td class="py-3 px-2 font-bold text-slate-800">
                                            <?php echo htmlspecialchars($tx['nama_warga']); ?>
                                        </td>
                                        <td class="py-3 px-2 font-mono text-xs text-slate-400">
                                            <?php echo htmlspecialchars($tx['nik_warga']); ?>
                                        </td>
                                        <td class="py-3 px-2 text-right font-extrabold text-green-700 text-base">
                                            -<?php echo $tx['jumlah_ambil']; ?> kg
                                        </td>
                                        <td class="py-3 px-2 text-center space-x-1 whitespace-nowrap">
                                            <a href="edit_transaksi.php?id=<?php echo $tx['id']; ?>" class="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Edit ✏️
                                            </a>
                                            <a href="hapus_transaksi.php?id=<?php echo $tx['id']; ?>" 
                                               onclick="return confirm('Apakah Anda yakin ingin menghapus transaksi pengambilan pupuk <?php echo htmlspecialchars($tx['nama_warga']); ?> sebesar <?php echo $tx['jumlah_ambil']; ?> kg? Sisa jatah kuota warga dan total stok utama gudang akan dikembalikan otomatis!')"
                                               class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Hapus 🗑️
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" class="py-8 text-center text-slate-400">Belum ada riwayat transaksi pengambilan terdaftar.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </main>

</body>
</html>`
  },
  {
    filename: "pengaturan.php",
    language: "php",
    description: "Halaman pengaturan akun admin untuk mengedit Username, Nama Lengkap, dan Password dengan proteksi sesi ketat di baris teratas serta kueri SQL UPDATE yang divalidasi penuh di server-side.",
    code: `<?php
/**
 * Modul Pengaturan Akun Admin (Kredensial)
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin (Session Security)
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";
$admin_id = $_SESSION['admin_id'];

// Ambil data admin saat ini untuk mengisi form default
try {
    $stmt = $pdo->prepare("SELECT * FROM admin WHERE id = :id");
    $stmt->execute(['id' => $admin_id]);
    $admin = $stmt->fetch();
    
    if (!$admin) {
        // Jika data admin tidak ditemukan, paksa logout
        header("Location: logout.php");
        exit;
    }
} catch (PDOException $e) {
    $error = "Gagal mengambil data akun: " . $e->getMessage();
}

// Proses Pembaruan Akun (UPDATE & Kueri SQL dengan Validasi Form Ketat)
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_pengaturan'])) {
    $username = trim($_POST['username'] ?? '');
    $nama_lengkap = trim($_POST['nama_lengkap'] ?? '');
    $password_baru = $_POST['password_baru'] ?? '';
    $konfirmasi_password = $_POST['konfirmasi_password'] ?? '';

    // Validasi Input Ketat
    if (empty($username) || empty($nama_lengkap)) {
        $error = "Kolom Username dan Nama Lengkap tidak boleh dibiarkan kosong!";
    } elseif (!empty($password_baru) && $password_baru !== $konfirmasi_password) {
        $error = "Input konfirmasi password baru tidak cocok dengan password baru!";
    } else {
        try {
            // Cek keunikan username agar tidak bentrok dengan admin lain
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM admin WHERE username = :username AND id != :id");
            $stmt_check->execute(['username' => $username, 'id' => $admin_id]);
            if ($stmt_check->fetchColumn() > 0) {
                $error = "Username '$username' sudah terdaftar pada akun lain!";
            } else {
                if (!empty($password_baru)) {
                    // Jika password baru diisi, enkripsi menggunakan bcrypt aman
                    $password_hash = password_hash($password_baru, PASSWORD_BCRYPT);
                    $stmt_update = $pdo->prepare("UPDATE admin SET username = :username, nama_lengkap = :nama_lengkap, password = :password WHERE id = :id");
                    $stmt_update->execute([
                        'username' => $username,
                        'nama_lengkap' => $nama_lengkap,
                        'password' => $password_hash,
                        'id' => $admin_id
                    ]);
                } else {
                    // Jika password baru dikosongkan, hanya perbarui username dan nama lengkap
                    $stmt_update = $pdo->prepare("UPDATE admin SET username = :username, nama_lengkap = :nama_lengkap WHERE id = :id");
                    $stmt_update->execute([
                        'username' => $username,
                        'nama_lengkap' => $nama_lengkap,
                        'id' => $admin_id
                    ]);
                }

                // Sinkronisasikan data session yang aktif agar tampilan admin langsung terupdate
                $_SESSION['admin_username'] = $username;
                $_SESSION['admin_nama'] = $nama_lengkap;

                $success = "Kredensial akun administrator berhasil diperbarui!";
                
                // Perbarui nilai lokal untuk form rendering teraktual
                $admin['username'] = $username;
                $admin['nama_lengkap'] = $nama_lengkap;
            }
        } catch (PDOException $e) {
            $error = "Gagal memperbarui data akun: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pengaturan Akun - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    
    <!-- Navbar / Header -->
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold tracking-tight text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-right">
                    <p class="text-sm font-semibold text-slate-700"><?php echo htmlspecialchars($_SESSION['admin_nama']); ?></p>
                    <p class="text-xs text-green-600 font-semibold">Administrator</p>
                </div>
                <a href="logout.php" onclick="return confirm('Apakah Anda yakin ingin keluar?')"
                   class="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2 rounded-xl text-sm transition">
                    Keluar 🚪
                </a>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        
        <!-- Menu Navigasi Modul -->
        <nav class="flex flex-wrap gap-3 mb-8">
            <a href="dashboard.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                🏠 Dasbor Utama
            </a>
            <a href="warga.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                👥 Kelola Data Warga
            </a>
            <a href="pupuk_masuk.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                📥 Pupuk Masuk (Stok Gudang)
            </a>
            <a href="transaksi.php" class="bg-white text-slate-600 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-sm hover:bg-slate-50 transition">
                🧾 Transaksi Pengambilan
            </a>
            <a href="pengaturan.php" class="bg-green-600 text-white font-semibold px-5 py-3 rounded-xl shadow-sm text-sm hover:bg-green-700 transition">
                ⚙️ Pengaturan Akun
            </a>
        </nav>

        <!-- Form Status Alerts -->
        <?php if (!empty($error)): ?>
            <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm">
                ⚠️ <strong>Pembaruan Gagal:</strong> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm">
                ✅ <strong>Berhasil:</strong> <?php echo htmlspecialchars($success); ?>
            </div>
        <?php endif; ?>

        <!-- Form Layout -->
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
                <span class="text-2xl">⚙️</span>
                <div>
                    <h2 class="text-lg font-bold text-slate-900">Pengaturan Kredensial Admin</h2>
                    <p class="text-xs text-slate-400">Perbarui username, nama lengkap, dan password untuk mengamankan akses sistem.</p>
                </div>
            </div>

            <form action="pengaturan.php" method="POST" class="space-y-6">
                
                <div>
                    <label for="nama_lengkap" class="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap Administrator</label>
                    <input type="text" id="nama_lengkap" name="nama_lengkap" required
                           value="<?php echo htmlspecialchars($admin['nama_lengkap']); ?>"
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 font-medium"
                           placeholder="Masukkan nama lengkap admin">
                </div>

                <div>
                    <label for="username" class="block text-sm font-semibold text-slate-700 mb-2">Username Baru</label>
                    <input type="text" id="username" name="username" required
                           value="<?php echo htmlspecialchars($admin['username']); ?>"
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 font-medium"
                           placeholder="Masukkan username baru">
                    <span class="text-xs text-slate-400 mt-1 block">Username digunakan untuk login ke dalam dasbor sistem.</span>
                </div>

                <div class="border-t border-slate-100 pt-5 mt-5">
                    <h3 class="text-sm font-bold text-slate-800 mb-4">Ganti Password (Opsional)</h3>
                    <p class="text-xs text-slate-400 mb-4">Kosongkan kolom di bawah ini jika Anda tidak ingin memperbarui password saat ini.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="password_baru" class="block text-sm font-semibold text-slate-700 mb-2">Password Baru</label>
                            <input type="password" id="password_baru" name="password_baru"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Password baru">
                        </div>

                        <div>
                            <label for="konfirmasi_password" class="block text-sm font-semibold text-slate-700 mb-2">Konfirmasi Password</label>
                            <input type="password" id="konfirmasi_password" name="konfirmasi_password"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Konfirmasi password baru">
                        </div>
                    </div>
                </div>

                <div class="pt-4 flex justify-end">
                    <button type="submit" name="submit_pengaturan"
                            class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-sm shadow-green-100 flex items-center gap-2">
                        Simpan Perubahan Kredensial 💾
                    </button>
                </div>

            </form>
        </div>

    </main>

    <footer class="bg-white border-t border-slate-100 mt-16 py-8 text-center text-xs text-slate-400">
        <p>&copy; <?php echo date('Y'); ?> SIMPUDI Desa. Hak Cipta Dilindungi.</p>
    </footer>

</body>
</html>`
  },
  {
    filename: "hapus_warga.php",
    language: "php",
    description: "Skrip PHP murni pengeksekusi penghapusan data warga secara aman dari database berdasarkan parameter ID, lengkap dengan pengalihan halaman (redirect) otomatis.",
    code: `<?php
date_default_timezone_set('Asia/Makassar');
/**
 * Skrip Pengeksekusi Hapus Data Warga secara Aman
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin - Hanya yang sudah masuk yang diizinkan melakukan penghapusan
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

// Pastikan parameter id tersedia dan valid
if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    
    try {
        // Mulai transaksi database untuk menjamin integritas data (atomic operation)
        $pdo->beginTransaction();

        // 1. Ambil nama warga terlebih dahulu untuk keperluan notifikasi pesan sukses
        $stmtWarga = $pdo->prepare("SELECT nama FROM warga WHERE id = :id");
        $stmtWarga->execute(['id' => $id]);
        $warga = $stmtWarga->fetch();

        if ($warga) {
            $nama_warga = $warga['nama'];

            // 2. Hapus data transaksi terkait terlebih dahulu (simulasi CASCADE delete demi integritas relasi)
            $stmtDelTx = $pdo->prepare("DELETE FROM transaksi WHERE warga_id = :warga_id");
            $stmtDelTx->execute(['warga_id' => $id]);

            // 3. Jalankan kueri DELETE FROM untuk menghapus data utama warga
            $stmtDelWarga = $pdo->prepare("DELETE FROM warga WHERE id = :id");
            $stmtDelWarga->execute(['id' => $id]);

            // Commit transaksi jika seluruh tahapan sukses
            $pdo->commit();

            $_SESSION['success_msg'] = "Data warga bernama '" . $nama_warga . "' beserta riwayat transaksinya berhasil dihapus secara permanen dari sistem.";
        } else {
            $pdo->rollBack();
            $_SESSION['error_msg'] = "Data warga tidak ditemukan di sistem.";
        }
    } catch (PDOException $e) {
        // Rollback jika terjadi kesalahan database
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION['error_msg'] = "Gagal menghapus data warga: " . $e->getMessage();
    }
} else {
    $_SESSION['error_msg'] = "ID warga tidak valid atau tidak ditemukan.";
}

// Alihkan (redirect) secara instan kembali ke halaman kelola data warga
header("Location: warga.php");
exit;`
  },
  {
    filename: "hapus_pupuk_masuk.php",
    language: "php",
    description: "Skrip PHP murni pengeksekusi penghapusan riwayat pengadaan pupuk masuk secara aman dari database, otomatis menyelaraskan kembali Total Stok Utama di gudang.",
    code: `<?php
date_default_timezone_set('Asia/Makassar');
/**
 * Skrip Pengeksekusi Hapus Riwayat Pupuk Masuk
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

// Pastikan parameter id tersedia dan valid
if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    
    try {
        $pdo->beginTransaction();

        // 1. Ambil data pupuk masuk rill untuk memeriksa jumlah yang akan dikurangi dari gudang
        $stmtCheck = $pdo->prepare("SELECT jumlah_masuk, keterangan FROM pupuk_masuk WHERE id = :id");
        $stmtCheck->execute(['id' => $id]);
        $pm = $stmtCheck->fetch();

        if ($pm) {
            $jumlah_masuk = (int)$pm['jumlah_masuk'];
            $keterangan = $pm['keterangan'];

            // 2. Ambil total stok gudang saat ini untuk memastikan pengurangan tidak membuat stok di bawah nol
            $stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
            $stok_sekarang = (int)$stmtStok->fetchColumn();

            if (($stok_sekarang - $jumlah_masuk) < 0) {
                // Batalkan transaksi karena stok akan menjadi negatif (melanggar constraint database)
                $pdo->rollBack();
                $_SESSION['error_msg'] = "Gagal menghapus! Penghapusan ini akan memotong stok gudang sebesar $jumlah_masuk kg, sedangkan stok gudang saat ini hanya tersisa $stok_sekarang kg. Stok gudang tidak boleh negatif.";
            } else {
                // 3. Kurangi stok gudang utama secara sinkron
                $stmtSubStok = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :jumlah_masuk WHERE id = 1");
                $stmtSubStok->execute(['jumlah_masuk' => $jumlah_masuk]);

                // 4. Hapus riwayat masuk dari database
                $stmtDelete = $pdo->prepare("DELETE FROM pupuk_masuk WHERE id = :id");
                $stmtDelete->execute(['id' => $id]);

                $pdo->commit();
                $_SESSION['success_msg'] = "Riwayat pengadaan pupuk masuk sebesar " . number_format($jumlah_masuk) . " kg (" . htmlspecialchars($keterangan) . ") berhasil dihapus dan stok utama gudang telah disesuaikan.";
            }
        } else {
            $pdo->rollBack();
            $_SESSION['error_msg'] = "Data riwayat pupuk masuk tidak ditemukan di sistem.";
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION['error_msg'] = "Gagal memproses penghapusan database: " . $e->getMessage();
    }
} else {
    $_SESSION['error_msg'] = "ID pengadaan pupuk masuk tidak valid atau tidak ditemukan.";
}

header("Location: pupuk_masuk.php");
exit;`
  },
  {
    filename: "edit_pupuk_masuk.php",
    language: "php",
    description: "Formulir interaktif dan skrip pemroses pembaruan data riwayat pengadaan pupuk masuk, lengkap dengan penyelarasan kalkulasi stok utama gudang secara real-time.",
    code: `<?php
date_default_timezone_set('Asia/Makassar');
/**
 * Modul Edit Riwayat Pupuk Masuk
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$error = "";
$success = "";

// Ambil data lama dari database
$stmtGet = $pdo->prepare("SELECT * FROM pupuk_masuk WHERE id = :id");
$stmtGet->execute(['id' => $id]);
$pm = $stmtGet->fetch();

if (!$pm) {
    $_SESSION['error_msg'] = "Riwayat pengadaan pupuk masuk tidak ditemukan.";
    header("Location: pupuk_masuk.php");
    exit;
}

// PROSES EDIT DATA
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_edit_pm'])) {
    $jumlah_baru = isset($_POST['jumlah_masuk']) ? (int)$_POST['jumlah_masuk'] : 0;
    $keterangan_baru = trim($_POST['keterangan'] ?? '');

    // VALIDASI INPUT KETAT
    if (empty($_POST['jumlah_masuk'])) {
        $error = "Jumlah kuantitas pupuk masuk tidak boleh kosong!";
    } else if ($jumlah_baru <= 0) {
        $error = "Jumlah ketersediaan wajib bernilai lebih besar dari nol (0)!";
    } else {
        try {
            $pdo->beginTransaction();

            $jumlah_lama = (int)$pm['jumlah_masuk'];
            $diff = $jumlah_baru - $jumlah_lama;

            // Periksa ketersediaan stok gudang jika perubahan mengurangi stok
            $stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
            $stok_sekarang = (int)$stmtStok->fetchColumn();

            if (($stok_sekarang + $diff) < 0) {
                $pdo->rollBack();
                $error = "Gagal memperbarui! Perubahan ini akan mengubah stok gudang menjadi negatif (" . ($stok_sekarang + $diff) . " kg). Stok gudang saat ini: $stok_sekarang kg.";
            } else {
                // 1. Perbarui data stok di gudang utama dengan selisih kuantitas baru dan lama
                $stmtUpdateStok = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang + :diff WHERE id = 1");
                $stmtUpdateStok->execute(['diff' => $diff]);

                // 2. Perbarui baris log pupuk masuk, tanggal diperbarui otomatis ke waktu real-time WITA saat edit disimpan
                $waktu_sekarang = date('Y-m-d H:i:s');
                $stmtUpdatePM = $pdo->prepare("UPDATE pupuk_masuk SET jumlah_masuk = :jumlah_masuk, keterangan = :keterangan, tanggal = :tanggal WHERE id = :id");
                $stmtUpdatePM->execute([
                    'jumlah_masuk' => $jumlah_baru,
                    'keterangan' => empty($keterangan_baru) ? 'Pengadaan Stok Tambahan (Diedit)' : $keterangan_baru,
                    'tanggal' => $waktu_sekarang,
                    'id' => $id
                ]);

                $pdo->commit();
                $_SESSION['success_msg'] = "Riwayat pengadaan pupuk masuk berhasil diperbarui dari " . number_format($jumlah_lama) . " kg menjadi " . number_format($jumlah_baru) . " kg.";
                header("Location: pupuk_masuk.php");
                exit;
            }
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = "Gagal memperbarui database: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Pengadaan Pupuk - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800 flex flex-col justify-between">
    
    <header class="bg-white border-b border-slate-100 shadow-sm">
        <div class="max-w-xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-2xl">🌾</span>
                <h1 class="text-lg font-bold text-slate-900">SIMPUDI DESA</h1>
            </div>
            <a href="pupuk_masuk.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition">
                Kembali
            </a>
        </div>
    </header>

    <main class="flex-grow flex items-center justify-center py-12 px-6">
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl max-w-md w-full">
            <div class="text-center mb-6">
                <span class="text-4xl">✏️</span>
                <h2 class="text-xl font-extrabold text-slate-900 mt-2">Edit Pengadaan Pupuk</h2>
                <p class="text-xs text-slate-400 mt-1">Perbarui kuantitas pengadaan stok utama di gudang desa</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-xs leading-relaxed">
                    ⚠️ <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <form action="edit_pupuk_masuk.php?id=<?php echo $id; ?>" method="POST" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Catat Awal</label>
                    <input type="text" disabled value="<?php echo date('d M Y - H:i', strtotime($pm['tanggal'])); ?> WITA"
                           class="w-full px-4 py-3 border border-slate-150 rounded-xl bg-slate-50 text-slate-400 text-sm font-semibold focus:outline-none">
                </div>

                <div>
                    <label for="jumlah_masuk" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jumlah Masuk (kg)</label>
                    <input type="number" id="jumlah_masuk" name="jumlah_masuk" required min="1"
                           value="<?php echo htmlspecialchars($pm['jumlah_masuk']); ?>"
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 font-bold text-slate-800">
                </div>

                <div>
                    <label for="keterangan" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keterangan Sumber Pengadaan</label>
                    <input type="text" id="keterangan" name="keterangan"
                           value="<?php echo htmlspecialchars($pm['keterangan']); ?>"
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 text-slate-700">
                </div>

                <div class="pt-2 flex gap-3">
                    <a href="pupuk_masuk.php" class="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-center text-sm transition">
                        Batal
                    </a>
                    <button type="submit" name="submit_edit_pm"
                            class="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm shadow-green-100">
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </div>
    </main>

    <footer class="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>&copy; 2026 SIMPUDI Desa. Hak Cipta Dilindungi.</p>
    </footer>

</body>
</html>`
  },
  {
    filename: "hapus_transaksi.php",
    language: "php",
    description: "Skrip PHP murni pengeksekusi penghapusan transaksi pengambilan pupuk subsidi secara aman dari database, otomatis memulihkan sisa jatah kuota warga dan total stok utama gudang.",
    code: `<?php
date_default_timezone_set('Asia/Makassar');
/**
 * Skrip Pengeksekusi Hapus Transaksi Penyaluran Pupuk
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

// Pastikan parameter id tersedia dan valid
if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    
    try {
        $pdo->beginTransaction();

        // 1. Ambil detail transaksi terlebih dahulu
        $stmtCheck = $pdo->prepare("SELECT t.jumlah_ambil, t.warga_id, w.nama FROM transaksi t JOIN warga w ON t.warga_id = w.id WHERE t.id = :id");
        $stmtCheck->execute(['id' => $id]);
        $tx = $stmtCheck->fetch();

        if ($tx) {
            $jumlah_ambil = (int)$tx['jumlah_ambil'];
            $warga_id = (int)$tx['warga_id'];
            $nama_warga = $tx['nama'];

            // 2. Pulihkan Sisa Jatah kuota warga yang bersangkutan
            $stmtRestoreWarga = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah + :jumlah_ambil WHERE id = :warga_id");
            $stmtRestoreWarga->execute([
                'jumlah_ambil' => $jumlah_ambil,
                'warga_id' => $warga_id
            ]);

            // 3. Pulihkan Stok Utama di Gudang Pusat
            $stmtRestoreGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang + :jumlah_ambil WHERE id = 1");
            $stmtRestoreGudang->execute(['jumlah_ambil' => $jumlah_ambil]);

            // 4. Hapus data transaksi utama
            $stmtDeleteTx = $pdo->prepare("DELETE FROM transaksi WHERE id = :id");
            $stmtDeleteTx->execute(['id' => $id]);

            $pdo->commit();
            $_SESSION['success_msg'] = "Penyaluran pupuk subsidi sebesar $jumlah_ambil kg atas nama $nama_warga berhasil dihapus. Kuota warga dan stok gudang otomatis dikembalikan.";
        } else {
            $pdo->rollBack();
            $_SESSION['error_msg'] = "Data transaksi pengambilan tidak ditemukan di sistem.";
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $_SESSION['error_msg'] = "Gagal memproses penghapusan database: " . $e->getMessage();
    }
} else {
    $_SESSION['error_msg'] = "ID transaksi tidak valid atau tidak ditemukan.";
}

header("Location: transaksi.php");
exit;`
  },
  {
    filename: "edit_transaksi.php",
    language: "php",
    description: "Formulir interaktif dan skrip pemroses pembaruan data transaksi pengambilan pupuk subsidi, lengkap dengan otomatisasi penyesuaian kuota sisa jatah warga dan total stok gudang.",
    code: `<?php
date_default_timezone_set('Asia/Makassar');
/**
 * Modul Edit Transaksi Penyaluran Pupuk
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$error = "";
$success = "";

// Ambil detail transaksi lama beserta info warga
$stmtGet = $pdo->prepare("SELECT t.*, w.nama as nama_warga FROM transaksi t JOIN warga w ON t.warga_id = w.id WHERE t.id = :id");
$stmtGet->execute(['id' => $id]);
$tx = $stmtGet->fetch();

if (!$tx) {
    $_SESSION['error_msg'] = "Data transaksi tidak ditemukan.";
    header("Location: transaksi.php");
    exit;
}

// Ambil semua daftar warga untuk pilihan jika ingin mengganti penerima jatah
$stmtWargaList = $pdo->query("SELECT * FROM warga ORDER BY nama ASC");
$warga_options = $stmtWargaList->fetchAll();

// Ambil Stok Gudang Utama saat ini
$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_utama = (int)$stmtStok->fetchColumn();

// PROSES SIMPAN PERUBAHAN
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_edit_tx'])) {
    $warga_id_baru = isset($_POST['warga_id']) ? (int)$_POST['warga_id'] : 0;
    $jumlah_baru = isset($_POST['jumlah_ambil']) ? (int)$_POST['jumlah_ambil'] : 0;

    // VALIDASI INPUT KETAT
    if (empty($warga_id_baru) || empty($jumlah_baru)) {
        $error = "Identitas warga dan jumlah pengambilan pupuk wajib diisi!";
    } else if ($jumlah_baru <= 0) {
        $error = "Jumlah pengambilan pupuk harus bernilai lebih besar dari nol (0)!";
    } else {
        try {
            $pdo->beginTransaction();

            $warga_id_lama = (int)$tx['warga_id'];
            $jumlah_lama = (int)$tx['jumlah_ambil'];

            // Skenario A: Penerima Warga SAMA, hanya merubah kuantitas kg
            if ($warga_id_baru === $warga_id_lama) {
                $diff = $jumlah_baru - $jumlah_lama;

                // Ambil sisa jatah terbaru warga
                $stmtWarga = $pdo->prepare("SELECT nama, sisa_jatah FROM warga WHERE id = :id");
                $stmtWarga->execute(['id' => $warga_id_baru]);
                $warga = $stmtWarga->fetch();
                $sisa_jatah_warga = (int)$warga['sisa_jatah'];

                // Batas kuantitas maksimum yang diperbolehkan (sisa jatah + jumlah lama)
                $max_jatah_allowed = $sisa_jatah_warga + $jumlah_lama;
                $max_stok_allowed = $stok_utama + $jumlah_lama;

                if ($jumlah_baru > $max_jatah_allowed) {
                    $error = "Transaksi DITOLAK! Jumlah pengambilan baru ($jumlah_baru kg) melebihi jatah yang tersisa untuk " . $warga['nama'] . " (Maksimum diperbolehkan: $max_jatah_allowed kg).";
                } else if ($jumlah_baru > $max_stok_allowed) {
                    $error = "Transaksi DITOLAK! Jumlah pengambilan baru ($jumlah_baru kg) melebihi ketersediaan stok utama di gudang (Maksimum diperbolehkan: $max_stok_allowed kg).";
                } else {
                    // Update Sisa Jatah Warga (kurangi dengan selisihnya)
                    $stmtUpdateWarga = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah - :diff WHERE id = :id");
                    $stmtUpdateWarga->execute(['diff' => $diff, 'id' => $warga_id_baru]);

                    // Update Stok Utama Gudang (kurangi dengan selisihnya)
                    $stmtUpdateGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :diff WHERE id = 1");
                    $stmtUpdateGudang->execute(['diff' => $diff]);

                    // Perbarui baris log transaksi, tanggal diperbarui otomatis ke waktu real-time WITA saat edit disimpan
                    $waktu_sekarang = date('Y-m-d H:i:s');
                    $stmtUpdateTx = $pdo->prepare("UPDATE transaksi SET jumlah_ambil = :jumlah_ambil, tanggal_ambil = :tanggal_ambil WHERE id = :id");
                    $stmtUpdateTx->execute([
                        'jumlah_ambil' => $jumlah_baru,
                        'tanggal_ambil' => $waktu_sekarang,
                        'id' => $id
                    ]);

                    $pdo->commit();
                    $_SESSION['success_msg'] = "Transaksi atas nama " . $warga['nama'] . " berhasil diperbarui dari $jumlah_lama kg menjadi $jumlah_baru kg.";
                    header("Location: transaksi.php");
                    exit;
                }
            }
            // Skenario B: Mengubah Penerima Warga sekaligus kuantitas kg
            else {
                // 1. Ambil sisa jatah terbaru warga baru
                $stmtWargaBaru = $pdo->prepare("SELECT nama, sisa_jatah FROM warga WHERE id = :id");
                $stmtWargaBaru->execute(['id' => $warga_id_baru]);
                $warga_baru = $stmtWargaBaru->fetch();

                if (!$warga_baru) {
                    $error = "Penerima warga baru tidak valid.";
                } else {
                    $sisa_jatah_baru = (int)$warga_baru['sisa_jatah'];

                    // Pastikan warga baru memiliki kuota yang cukup untuk kuantitas baru
                    if ($jumlah_baru > $sisa_jatah_baru) {
                        $error = "Transaksi DITOLAK! Jumlah pengambilan ($jumlah_baru kg) melebihi sisa jatah warga baru " . $warga_baru['nama'] . " ($sisa_jatah_baru kg).";
                    } 
                    // Pastikan stok gudang setelah dipulihkan dari jumlah lama cukup untuk jumlah baru
                    else if ($jumlah_baru > ($stok_utama + $jumlah_lama)) {
                        $error = "Transaksi DITOLAK! Jumlah pengambilan ($jumlah_baru kg) melebihi ketersediaan stok di gudang.";
                    }
                    else {
                        // A. Kembalikan jatah ke warga LAMA
                        $stmtRestoreLama = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah + :jumlah_lama WHERE id = :id");
                        $stmtRestoreLama->execute(['jumlah_lama' => $jumlah_lama, 'id' => $warga_id_lama]);

                        // B. Kurangi jatah warga BARU
                        $stmtDeductBaru = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah - :jumlah_baru WHERE id = :id");
                        $stmtDeductBaru->execute(['jumlah_baru' => $jumlah_baru, 'id' => $warga_id_baru]);

                        // C. Sesuaikan stok gudang (kembalikan jumlah lama, kurangi jumlah baru)
                        $diff_gudang = $jumlah_baru - $jumlah_lama;
                        $stmtUpdateGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :diff WHERE id = 1");
                        $stmtUpdateGudang->execute(['diff' => $diff_gudang]);

                        // D. Perbarui detail transaksi di database
                        $waktu_sekarang = date('Y-m-d H:i:s');
                        $stmtUpdateTx = $pdo->prepare("UPDATE transaksi SET warga_id = :warga_id, jumlah_ambil = :jumlah_ambil, tanggal_ambil = :tanggal_ambil WHERE id = :id");
                        $stmtUpdateTx->execute([
                            'warga_id' => $warga_id_baru,
                            'jumlah_ambil' => $jumlah_baru,
                            'tanggal_ambil' => $waktu_sekarang,
                            'id' => $id
                        ]);

                        $pdo->commit();
                        $_SESSION['success_msg'] = "Penerima transaksi berhasil dialihkan ke " . $warga_baru['nama'] . " dengan kuantitas $jumlah_baru kg.";
                        header("Location: transaksi.php");
                        exit;
                    }
                }
            }
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = "Gagal menyimpan transaksi database: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Transaksi Penyaluran - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800 flex flex-col justify-between">
    
    <header class="bg-white border-b border-slate-100 shadow-sm">
        <div class="max-w-xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-2xl">🌾</span>
                <h1 class="text-lg font-bold text-slate-900">SIMPUDI DESA</h1>
            </div>
            <a href="transaksi.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition">
                Kembali
            </a>
        </div>
    </header>

    <main class="flex-grow flex items-center justify-center py-12 px-6">
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl max-w-md w-full">
            <div class="text-center mb-6">
                <span class="text-4xl">✏️</span>
                <h2 class="text-xl font-extrabold text-slate-900 mt-2">Edit Transaksi Penyaluran</h2>
                <p class="text-xs text-slate-400 mt-1">Perbarui detail transaksi dan jatah penyaluran warga desa</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-xs leading-relaxed">
                    ⚠️ <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <form action="edit_transaksi.php?id=<?php echo $id; ?>" method="POST" class="space-y-5">
                <div>
                    <label for="warga_id" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Penerima (Warga)</label>
                    <select id="warga_id" name="warga_id" required
                            class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50">
                        <?php foreach ($warga_options as $opt): ?>
                            <option value="<?php echo $opt['id']; ?>" <?php echo $opt['id'] == $tx['warga_id'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($opt['nama']); ?> - [NIK: <?php echo $opt['nik']; ?>] (Sisa Jatah: <?php echo $opt['sisa_jatah']; ?> kg)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label for="jumlah_ambil" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jumlah Pengambilan (kg)</label>
                    <input type="number" id="jumlah_ambil" name="jumlah_ambil" required min="1"
                           value="<?php echo htmlspecialchars($tx['jumlah_ambil']); ?>"
                           class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50 font-bold text-slate-800">
                </div>

                <div class="pt-2 flex gap-3">
                    <a href="transaksi.php" class="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-center text-sm transition">
                        Batal
                    </a>
                    <button type="submit" name="submit_edit_tx"
                            class="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm shadow-green-100">
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </div>
    </main>

    <footer class="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>&copy; 2026 SIMPUDI Desa. Hak Cipta Dilindungi.</p>
    </footer>

</body>
</html>`
  }
];

