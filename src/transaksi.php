<?php
/**
 * Modul Transaksi Pengambilan Pupuk Desa
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

if (isset($_SESSION['success_msg'])) {
    $success = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

$preselected_warga_id = isset($_GET['warga_id']) ? (int)$_GET['warga_id'] : 0;

$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_utama = $stmtStok->fetchColumn() ?: 0;

$stmtWargaDropdown = $pdo->query("SELECT * FROM warga WHERE sisa_jatah > 0 ORDER BY nama ASC");
$warga_options = $stmtWargaDropdown->fetchAll();

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_transaksi'])) {
    $warga_id = isset($_POST['warga_id']) ? (int)$_POST['warga_id'] : 0;
    $jumlah_ambil = isset($_POST['jumlah_ambil']) ? (int)$_POST['jumlah_ambil'] : 0;

    if (empty($warga_id) || empty($jumlah_ambil)) {
        $error = "Identitas warga dan jumlah pengambilan pupuk wajib diisi!";
    } else if ($jumlah_ambil <= 0) {
        $error = "Jumlah pengambilan pupuk harus bernilai lebih besar dari nol (0)!";
    } else {
        try {
            $stmtWargaCheck = $pdo->prepare("SELECT nama, sisa_jatah FROM warga WHERE id = :id");
            $stmtWargaCheck->execute(['id' => $warga_id]);
            $warga = $stmtWargaCheck->fetch();

            if (!$warga) {
                $error = "Data warga tidak terdaftar dalam database desa!";
            } else {
                $sisa_jatah_warga = (int)$warga['sisa_jatah'];
                $nama_warga = $warga['nama'];

                if ($jumlah_ambil > $sisa_jatah_warga) {
                    $error = "Transaksi DITOLAK! Jumlah melebihi sisa jatah kuota warga.";
                } else if ($jumlah_ambil > $stok_utama) {
                    $error = "Transaksi DITOLAK! Jumlah melebihi ketersediaan stok di gudang.";
                } else {
                    $pdo->beginTransaction();
                    $waktu_ambil = date('Y-m-d H:i:s');
                    $stmtInsertTx = $pdo->prepare("INSERT INTO transaksi (warga_id, jumlah_ambil, tanggal_ambil) VALUES (:warga_id, :jumlah_ambil, :tanggal_ambil)");
                    $stmtInsertTx->execute([
                        'warga_id' => $warga_id,
                        'jumlah_ambil' => $jumlah_ambil,
                        'tanggal_ambil' => $waktu_ambil
                    ]);

                    $stmtDecrWarga = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah - :jumlah_ambil WHERE id = :id");
                    $stmtDecrWarga->execute(['jumlah_ambil' => $jumlah_ambil, 'id' => $warga_id]);

                    $stmtDecrGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :jumlah_ambil WHERE id = 1");
                    $stmtDecrGudang->execute(['jumlah_ambil' => $jumlah_ambil]);

                    $pdo->commit();
                    $stok_utama -= $jumlah_ambil;
                    $success = "Transaksi SUKSES! Pengambilan pupuk subsidi sebesar $jumlah_ambil kg atas nama $nama_warga berhasil disimpan.";

                    $stmtWargaDropdown = $pdo->query("SELECT * FROM warga WHERE sisa_jatah > 0 ORDER BY nama ASC");
                    $warga_options = $stmtWargaDropdown->fetchAll();
                }
            }
        } catch (PDOException $e) {
            $pdo->rollBack();
            $error = "Gagal memproses transaksi database: " . $e->getMessage();
        }
    }
}

$stmtTxHistory = $pdo->query("SELECT t.*, w.nama as nama_warga, w.nik as nik_warga FROM transaksi t JOIN warga w ON t.warga_id = w.id ORDER BY t.tanggal_ambil DESC");
$transaksi_riwayat = $stmtTxHistory->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaksi Pengambilan - SIMPUD Desa</title>
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
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition">Kembali ke Dasbor 🏠</a>
        </div>
    </header>
    <main class="max-w-7xl mx-auto px-6 py-8">
        <?php if (!empty($error)): ?><div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm">⚠️ Transaksi Gagal: <?php echo htmlspecialchars($error); ?></div><?php endif; ?>
        <?php if (!empty($success)): ?><div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm">✅ Transaksi Berhasil: <?php echo htmlspecialchars($success); ?></div><?php endif; ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6">
                <div class="bg-slate-800 p-5 rounded-2xl text-white">
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Ketersediaan Stok Gudang</span>
                    <h4 class="text-3xl font-extrabold mt-1 text-green-400"><?php echo number_format($stok_utama); ?> <span class="text-sm font-medium text-slate-300">kg</span></h4>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">🧾 Catat Transaksi</h2>
                    <form action="transaksi.php" method="POST" class="space-y-5">
                        <div>
                            <label for="warga_id" class="block text-sm font-semibold text-slate-700 mb-2">Nama Warga</label>
                            <select id="warga_id" name="warga_id" required class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm">
                                <option value="">-- Pilih Warga --</option>
                                <?php foreach ($warga_options as $opt): ?>
                                    <option value="<?php echo $opt['id']; ?>" <?php echo $opt['id'] == $preselected_warga_id ? 'selected' : ''; ?>><?php echo htmlspecialchars($opt['nama']); ?> - [Sisa: <?php echo $opt['sisa_jatah']; ?> kg]</option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div>
                            <label for="jumlah_ambil" class="block text-sm font-semibold text-slate-700 mb-2">Jumlah Ambil (kg)</label>
                            <input type="number" id="jumlah_ambil" name="jumlah_ambil" required min="1" class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm" placeholder="Contoh: 50">
                        </div>
                        <button type="submit" name="submit_transaksi" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition">Simpan & Sinkronisasi Data ⚡</button>
                    </form>
                </div>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">📋 Seluruh Riwayat Penyaluran</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-150 text-slate-400 font-semibold">
                                <th class="py-3 px-2">Tanggal & Jam</th>
                                <th class="py-3 px-2">Nama Warga</th>
                                <th class="py-3 px-2">NIK</th>
                                <th class="py-3 px-2 text-right">Jumlah</th>
                                <th class="py-3 px-2 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (count($transaksi_riwayat) > 0): foreach ($transaksi_riwayat as $tx): ?>
                                    <tr class="hover:bg-slate-50">
                                        <td class="py-3 px-2 text-slate-500 text-xs"><?php echo date('d M Y, H:i', strtotime($tx['tanggal_ambil'])); ?> WITA</td>
                                        <td class="py-3 px-2 font-bold text-slate-800"><?php echo htmlspecialchars($tx['nama_warga']); ?></td>
                                        <td class="py-3 px-2 font-mono text-xs text-slate-400"><?php echo htmlspecialchars($tx['nik_warga']); ?></td>
                                        <td class="py-3 px-2 text-right font-extrabold text-green-700">-<?php echo $tx['jumlah_ambil']; ?> kg</td>
                                        <td class="py-3 px-2 text-center space-x-1 whitespace-nowrap">
                                            <a href="edit_transaksi.php?id=<?php echo $tx['id']; ?>" class="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-bold">Edit ✏️</a>
                                            <a href="hapus_transaksi.php?id=<?php echo $tx['id']; ?>" onclick="return confirm('Apakah Anda yakin?')" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold">Hapus 🗑️</a>
                                        </td>
                                    </tr>
                                <?php endforeach; else: ?>
                                <tr><td colspan="5" class="py-8 text-center text-slate-400">Belum ada riwayat transaksi pengambilan terdaftar.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>
</body>
</html>