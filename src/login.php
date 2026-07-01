<?php
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
            <h1 class="text-2xl font-bold text-slate-800 tracking-tight">SIMPUD DESA</h1>
            <p class="text-sm text-slate-500 mt-1">Sistem Manajemen Pupuk Subsidi Desa</p>
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
</html>