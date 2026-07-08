<?php
session_start();
require_once "koneksi.php";

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$error = "";

$stmtGet = $pdo->prepare("SELECT t.*, w.nama as nama_warga FROM transaksi t JOIN warga w ON t.warga_id = w.id WHERE t.id = :id");
$stmtGet->execute(['id' => $id]);
$tx = $stmtGet->fetch();

if (!$tx) {
    header("Location: transaksi.php");
    exit;
}

$stmtWargaList = $pdo->query("SELECT * FROM warga ORDER BY nama ASC");
$warga_options = $stmtWargaList->fetchAll();

$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_utama = (int)$stmtStok->fetchColumn();

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['submit_edit_tx'])) {
    $warga_id_baru = isset($_POST['warga_id']) ? (int)$_POST['warga_id'] : 0;
    $jumlah_baru = isset($_POST['jumlah_ambil']) ? (int)$_POST['jumlah_ambil'] : 0;

    if (empty($warga_id_baru) || empty($jumlah_baru) || $jumlah_baru <= 0) {
        $error = "Identitas warga dan jumlah pengambilan pupuk valid wajib diisi!";
    } else {
        try {
            $pdo->beginTransaction();
            $warga_id_lama = (int)$tx['warga_id'];
            $jumlah_lama = (int)$tx['jumlah_ambil'];

            if ($warga_id_baru === $warga_id_lama) {
                $diff = $jumlah_baru - $jumlah_lama;
                $stmtWarga = $pdo->prepare("SELECT nama, sisa_jatah FROM warga WHERE id = :id");
                $stmtWarga->execute(['id' => $warga_id_baru]);
                $warga = $stmtWarga->fetch();
                $sisa_jatah_warga = (int)$warga['sisa_jatah'];

                if ($jumlah_baru > ($sisa_jatah_warga + $jumlah_lama)) {
                    $error = "Transaksi DITOLAK! Jumlah pengambilan melebihi batas jatah kuota warga.";
                } else {
                    $stmtUpdateWarga = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah - :diff WHERE id = :id");
                    $stmtUpdateWarga->execute(['diff' => $diff, 'id' => $warga_id_baru]);

                    $stmtUpdateGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :diff WHERE id = 1");
                    $stmtUpdateGudang->execute(['diff' => $diff]);

                    $stmtUpdateTx = $pdo->prepare("UPDATE transaksi SET jumlah_ambil = :jumlah_ambil, tanggal_ambil = :tanggal WHERE id = :id");
                    $stmtUpdateTx->execute(['jumlah_ambil' => $jumlah_baru, 'tanggal' => date('Y-m-d H:i:s'), 'id' => $id]);

                    $pdo->commit();
                    $_SESSION['success_msg'] = "Transaksi berhasil diperbarui.";
                    header("Location: transaksi.php");
                    exit;
                }
            } else {
                $stmtWargaBaru = $pdo->prepare("SELECT nama, sisa_jatah FROM warga WHERE id = :id");
                $stmtWargaBaru->execute(['id' => $warga_id_baru]);
                $warga_baru = $stmtWargaBaru->fetch();

                if ($jumlah_baru > (int)$warga_baru['sisa_jatah']) {
                    $error = "Transaksi DITOLAK! Jumlah melebihi sisa jatah warga baru.";
                } else {
                    $stmtRestoreLama = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah + :jumlah_lama WHERE id = :id");
                    $stmtRestoreLama->execute(['jumlah_lama' => $jumlah_lama, 'id' => $warga_id_lama]);

                    $stmtDeductBaru = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah - :jumlah_baru WHERE id = :id");
                    $stmtDeductBaru->execute(['jumlah_baru' => $jumlah_baru, 'id' => $warga_id_baru]);

                    $diff_gudang = $jumlah_baru - $jumlah_lama;
                    $stmtUpdateGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :diff WHERE id = 1");
                    $stmtUpdateGudang->execute(['diff' => $diff_gudang]);

                    $stmtUpdateTx = $pdo->prepare("UPDATE transaksi SET warga_id = :warga_id, jumlah_ambil = :jumlah_ambil, tanggal_ambil = :tanggal WHERE id = :id");
                    $stmtUpdateTx->execute(['warga_id' => $warga_id_baru, 'jumlah_ambil' => $jumlah_baru, 'tanggal' => date('Y-m-d H:i:s'), 'id' => $id]);

                    $pdo->commit();
                    $_SESSION['success_msg'] = "Penerima transaksi berhasil dialihkan.";
                    header("Location: transaksi.php");
                    exit;
                }
            }
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            $error = "Gagal memproses pengeditan: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Edit Transaksi Penyaluran - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800 flex flex-col justify-between">
    <main class="flex-grow flex items-center justify-center py-12 px-6">
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl max-w-md w-full">
            <h2 class="text-xl font-extrabold text-slate-900 text-center">Edit Transaksi</h2>
            <?php if (!empty($error)): ?><div class="bg-red-50 text-red-700 p-4 rounded-xl text-xs mt-4">⚠️ <?php echo htmlspecialchars($error); ?></div><?php endif; ?>
            <form action="edit_transaksi.php?id=<?php echo $id; ?>" method="POST" class="space-y-5 mt-4">
                <select name="warga_id" required class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm">
                    <?php foreach ($warga_options as $opt): ?>
                        <option value="<?php echo $opt['id']; ?>" <?php echo $opt['id'] == $tx['warga_id'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($opt['nama']); ?></option>
                    <?php endforeach; ?>
                </select>
                <input type="number" name="jumlah_ambil" value="<?php echo htmlspecialchars($tx['jumlah_ambil']); ?>" required class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm">
                <div class="flex gap-3">
                    <a href="transaksi.php" class="w-1/2 bg-slate-100 py-3 rounded-xl text-center text-sm">Batal</a>
                    <button type="submit" name="submit_edit_tx" class="w-1/2 bg-green-600 text-white font-bold py-3 rounded-xl text-sm">Simpan</button>
                </div>
            </form>
        </div>
    </main>
</body>
</html>