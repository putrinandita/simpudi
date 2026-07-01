<?php
require_once "koneksi.php";

// Memaksa PHP membuat hash baru yang 100% valid untuk komputer Anda
$password_baru = password_hash('admin123', PASSWORD_DEFAULT);

// Memperbarui database secara otomatis
$pdo->query("UPDATE admin SET username='admin', password='$password_baru' WHERE id=1");

echo "<h1 style='color:green;'>✅ Selesai!</h1>";
echo "<p>Kata sandi administrator berhasil direset paksa menjadi: <b>admin123</b></p>";
echo "<a href='login.php'>Klik di sini untuk kembali ke halaman Login</a>";
?>