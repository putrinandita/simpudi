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
        $stmtCheck = $pdo->prepare("SELECT jumlah_masuk, keterangan FROM pupuk_masuk WHERE id = :id");
        $stmtCheck->execute(['id' => $id]);
        $pm = $stmtCheck->fetch();

        if ($pm) {
            $jumlah_masuk = (int)$pm['jumlah_masuk'];
            $stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
            $stok_sekarang = (int)$stmtStok->fetchColumn();

            if (($stok_sekarang - $jumlah_masuk) < 0) {
                $pdo->rollBack();
                $_SESSION['error_msg'] = "Gagal menghapus! Stok gudang tidak boleh bernilai negatif.";
            } else {
                $stmtSubStok = $pdo->prepare("UPDATE stok_gudang SET stok_sekarang = stok_sekarang - :jumlah_masuk WHERE id = 1");
                $stmtSubStok->execute(['jumlah_masuk' => $jumlah_masuk]);

                $stmtDelete = $pdo->prepare("DELETE FROM pupuk_masuk WHERE id = :id");
                $stmtDelete->execute(['id' => $id]);

                $pdo->commit();
                $_SESSION['success_msg'] = "Riwayat pengadaan pupuk berhasil dihapus dan stok disesuaikan.";
            }
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        $_SESSION['error_msg'] = "Gagal memproses penghapusan: " . $e->getMessage();
    }
}
header("Location: pupuk_masuk.php");
exit;