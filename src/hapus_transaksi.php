<?php
session_start();
require_once "koneksi.php";

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    try {
        $pdo->beginTransaction();
        $stmtCheck = $pdo->prepare("SELECT t.jumlah_ambil, t.warga_id, w.nama FROM transaksi t JOIN warga w ON t.warga_id = w.id WHERE t.id = :id");
        $stmtCheck->execute(['id' => $id]);
        $tx = $stmtCheck->fetch();

        if ($tx) {
            $jumlah_ambil = (int)$tx['jumlah_ambil'];
            $warga_id = (int)$tx['warga_id'];
            $nama_warga = $tx['nama'];

            $stmtRestoreWarga = $pdo->prepare("UPDATE warga SET sisa_jatah = sisa_jatah + :jumlah_ambil WHERE id = :warga_id");
            $stmtRestoreWarga->execute(['jumlah_ambil' => $jumlah_ambil, 'warga_id' => $warga_id]);

            $stmtRestoreGudang = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang + :jumlah_ambil WHERE id = 1");
            $stmtRestoreGudang->execute(['jumlah_ambil' => $jumlah_ambil]);

            $stmtDeleteTx = $pdo->prepare("DELETE FROM transaksi WHERE id = :id");
            $stmtDeleteTx->execute(['id' => $id]);

            $pdo->commit();
            $_SESSION['success_msg'] = "Penyaluran pupuk subsidi atas nama $nama_warga berhasil dihapus. Kuota dikembalikan otomatis.";
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        $_SESSION['error_msg'] = "Gagal memproses penghapusan database: " . $e->getMessage();
    }
}
header("Location: transaksi.php");
exit;