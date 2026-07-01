<?php
/**
 * Modul Pengaturan Akun Admin (Kredensial)
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";
$admin_id = $_SESSION['admin_id'];

try {
    $stmt = $pdo->prepare("SELECT * FROM admin WHERE id = :id");
    $stmt->execute(['id' => $admin_id]);
    $admin = $stmt->fetch();
    if (!$admin) {
        header("Location: logout.php");
        exit;
    }
} catch (PDOException $e) {
    $error = "Gagal mengambil data akun: " . $e->getMessage();
}

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_pengaturan'])) {
    $username = trim($_POST['username'] ?? '');
    $nama_lengkap = trim($_POST['nama_lengkap'] ?? '');
    $password_baru = $_POST['password_baru'] ?? '';
    $konfirmasi_password = $_POST['konfirmasi_password'] ?? '';

    if (empty($username) || empty($nama_lengkap)) {
        $error = "Kolom Username dan Nama Lengkap tidak boleh dibiarkan kosong!";
    } elseif (!empty($password_baru) && $password_baru !== $konfirmasi_password) {
        $error = "Input konfirmasi password baru tidak cocok dengan password baru!";
    } else {
        try {
            $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM admin WHERE username = :username AND id != :id");
            $stmt_check->execute(['username' => $username, 'id' => $admin_id]);
            if ($stmt_check->fetchColumn() > 0) {
                $error = "Username '$username' sudah terdaftar pada akun lain!";
            } else {
                if (!empty($password_baru)) {
                    $password_hash = password_hash($password_baru, PASSWORD_BCRYPT);
                    $stmt_update = $pdo->prepare("UPDATE admin SET username = :username, nama_lengkap = :nama_lengkap, password = :password WHERE id = :id");
                    $stmt_update->execute([
                        'username' => $username,
                        'nama_lengkap' => $nama_lengkap,
                        'password' => $password_hash,
                        'id' => $admin_id
                    ]);
                } else {
                    $stmt_update = $pdo->prepare("UPDATE admin SET username = :username, nama_lengkap = :nama_lengkap WHERE id = :id");
                    $stmt_update->execute([
                        'username' => $username,
                        'nama_lengkap' => $nama_lengkap,
                        'id' => $admin_id
                    ]);
                }
                $_SESSION['admin_username'] = $username;
                $_SESSION['admin_nama'] = $nama_lengkap;
                $success = "Kredensial akun administrator berhasil diperbarui!";
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
    <title>Pengaturan Akun - SIMPUD Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">SIMPUD DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm">Kembali ke Dasbor 🏠</a>
        </div>
    </header>
    <main class="max-w-7xl mx-auto px-6 py-8">
        <?php if (!empty($error)): ?><div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm">⚠️ Pembaruan Gagal: <?php echo htmlspecialchars($error); ?></div><?php endif; ?>
        <?php if (!empty($success)): ?><div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm">✅ Berhasil: <?php echo htmlspecialchars($success); ?></div><?php endif; ?>
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900 border-b pb-4 mb-6">⚙️ Pengaturan Kredensial Admin</h2>
            <form action="pengaturan.php" method="POST" class="space-y-6">
                <div>
                    <label for="nama_lengkap" class="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap</label>
                    <input type="text" id="nama_lengkap" name="nama_lengkap" required value="<?php echo htmlspecialchars($admin['nama_lengkap']); ?>" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50">
                </div>
                <div>
                    <label for="username" class="block text-sm font-semibold text-slate-700 mb-2">Username Baru</label>
                    <input type="text" id="username" name="username" required value="<?php echo htmlspecialchars($admin['username']); ?>" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50">
                </div>
                <div class="border-t pt-5">
                    <h3 class="text-sm font-bold text-slate-800 mb-2">Ganti Password (Opsional)</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="password" name="password_baru" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50" placeholder="Password baru">
                        <input type="password" name="konfirmasi_password" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50" placeholder="Konfirmasi password baru">
                    </div>
                </div>
                <div class="pt-4 flex justify-end">
                    <button type="submit" name="submit_pengaturan" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-sm">Simpan Perubahan Kredensial 💾</button>
                </div>
            </form>
        </div>
    </main>
</body>
</html>