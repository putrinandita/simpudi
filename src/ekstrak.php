<?php
// Trik Otomatisasi Ekstraksi File Proyek SIMPUD
// Cukup jalankan file ini sekali di browser

$folder_tujuan = __DIR__ . '/';

// Mengubah setelan database ke 'simpud' di dalam string koneksi.php secara otomatis
$koneksi_code = '<?php
date_default_timezone_set(\'Asia/Makassar\');
$host = "localhost";
$username = "root";
$password = "";
$database = "simpudi";
try {
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
?>';

// Daftar file yang akan dibuat secara otomatis
$files = [
    'koneksi.php' => $koneksi_code,
    'index.php' => '<?php session_start(); if (isset($_SESSION[\'admin_logged_in\']) && $_SESSION[\'admin_logged_in\'] === true) { header("Location: dashboard.php"); exit; } else { header("Location: login.php"); exit; } ?>',
    'logout.php' => '<?php session_start(); session_unset(); $_SESSION = array(); if (ini_get("session.use_cookies")) { $params = session_get_cookie_params(); setcookie(session_name(), \'\', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]); } session_destroy(); header("Location: login.php"); exit; ?>'
];

// Menulis file ke dalam folder
$berhasil = 0;
foreach ($files as $name => $content) {
    if (file_put_contents($folder_tujuan . $name, $content) !== false) {
        $berhasil++;
    }
}

echo "<h2>🔥 Pemisahan File Selesai Otomatis! 🔥</h2>";
echo "Berhasil membuat file inti sistem lokal tanpa repot split manual.<br>";
echo "Silakan lanjutkan menyalin file tampilan utama (dashboard.php, warga.php, transaksi.php, pupuk_masuk.php) dari teks AI Studio kamu.";
?>