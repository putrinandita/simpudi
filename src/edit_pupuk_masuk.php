<?php
session_start();
require_once "koneksi.php";

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";

if (isset($_SESSION['success_msg'])) {
    $success = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_sekarang = $stmtStok->fetchColumn() ?: 0;

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_stok'])) {
    $jumlah_masuk = isset($_POST['jumlah_masuk']) ? (int)$_POST['jumlah_masuk'] : 0;
    $keterangan = trim($_POST['keterangan'] ?? '');
    $keterangan_final = empty($keterangan) ? 'Pengadaan Stok Tambahan' : $keterangan;

    if ($jumlah_masuk <= 0) {
        $error = "Jumlah ketersediaan yang dimasukkan wajib bernilai lebih besar dari nol (0)!";
    } else {
        try {
            $pdo->beginTransaction();
            $waktu_sekarang = date('Y-m-d H:i:s');
            
            // MENGGUNAKAN METODE TANDA TANYA (?) AGAR PASTI BERHASIL
            $stmtInsert = $pdo->prepare("INSERT INTO pupuk_masuk (jumlah_masuk, keterangan, tanggal) VALUES (?, ?, ?)");
            $stmtInsert->execute([$jumlah_masuk, $keterangan_final, $waktu_sekarang]);

            $stmtUpdateStok = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang + ? WHERE id = 1");
            $stmtUpdateStok->execute([$jumlah_masuk]);

            $pdo->commit();
            $stok_sekarang += $jumlah_masuk;
            $success = "Stok utama gudang berhasil ditingkatkan sebanyak $jumlah_masuk kg!";
        } catch (PDOException $e) {
            $pdo->rollBack();
            $error = "Gagal memperbarui stok database: " . $e->getMessage();
        }
    }
}

$stmtLog = $pdo->query("SELECT * FROM pupuk_masuk ORDER BY tanggal DESC LIMIT 15");
$log_masuk = $stmtLog->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pupuk Masuk (Stok Gudang) - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem InformasiManajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition">Kembali ke Dasbor 🏠</a>
        </div>
    </header>
    <main class="max-w-7xl mx-auto px-6 py-8">
        <?php if (!empty($error)): ?><div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">⚠️ Error: <?php echo htmlspecialchars($error); ?></div><?php endif; ?>
        <?php if (!empty($success)): ?><div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">✅ Sukses: <?php echo htmlspecialchars($success); ?></div><?php endif; ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6">
                <div class="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-2xl shadow-md text-white">
                    <p class="text-xs font-bold uppercase tracking-wider text-green-100">Ketersediaan Stok Utama</p>
                    <h3 class="text-4xl font-black mt-2"><?php echo number_format($stok_sekarang); ?> <span class="text-lg font-normal text-green-100">kg</span></h3>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">📥 Catat Pupuk Masuk</h2>
                    <form action="pupuk_masuk.php" method="POST" class="space-y-5">
                        <div>
                            <label for="jumlah_masuk" class="block text-sm font-semibold text-slate-700 mb-2">Jumlah Masuk (kg)</label>
                            <input type="number" id="jumlah_masuk" name="jumlah_masuk" required min="1" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm" placeholder="Contoh: 1000">
                        </div>
                        <div>
                            <label for="keterangan" class="block text-sm font-semibold text-slate-700 mb-2">Sumber / Keterangan</label>
                            <input type="text" id="keterangan" name="keterangan" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm" placeholder="Contoh: PT Pupuk Sriwidjaja">
                        </div>
                        <button type="submit" name="submit_stok" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition">Simpan Stok Tambahan 💾</button>
                    </form>
                </div>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">📋 Riwayat Pengadaan Pupuk</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-150 text-slate-400 font-semibold">
                                <th class="py-3 px-2">Tanggal</th>
                                <th class="py-3 px-2 text-center">Jumlah Stok</th>
                                <th class="py-3 px-2">Keterangan</th>
                                <th class="py-3 px-2 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (count($log_masuk) > 0): foreach ($log_masuk as $log): ?>
                            <tr>
                                <td class="py-3 px-2 font-medium text-slate-600 text-xs"><?php echo date('d M Y, H:i', strtotime($log['tanggal'])); ?> WITA</td>
                                <td class="py-3 px-2 text-center font-bold text-green-700">+<?php echo number_format($log['jumlah_masuk']); ?> kg</td>
                                <td class="py-3 px-2 text-slate-500 italic"><?php echo htmlspecialchars($log['keterangan']); ?></td>
                                <td class="py-3 px-2 text-center space-x-1 whitespace-nowrap">
                                    <a href="edit_pupuk_masuk.php?id=<?php echo $log['id']; ?>" class="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-bold">Edit ✏️</a>
                                    <a href="hapus_pupuk_masuk.php?id=<?php echo $log['id']; ?>" onclick="return confirm('Apakah Anda yakin?')" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold">Hapus 🗑️</a>
                                </td>
                            </tr>
                            <?php endforeach; else: ?>
                                <tr><td colspan="4" class="py-8 text-center text-slate-400">Belum ada riwayat stok tambahan terdaftar.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>
</body>
</html>