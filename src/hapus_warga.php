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
        $stmtWarga = $pdo->prepare("SELECT nama FROM warga WHERE id = :id");
        $stmtWarga->execute(['id' => $id]);
        $warga = $stmtWarga->fetch();

        if ($warga) {
            $nama_warga = $warga['nama'];
            $stmtDelTx = $pdo->prepare("DELETE FROM transaksi WHERE warga_id = :warga_id");
            $stmtDelTx->execute(['warga_id' => $id]);

            $stmtDelWarga = $pdo->prepare("DELETE FROM warga WHERE id = :id");
            $stmtDelWarga->execute(['id' => $id]);

            $pdo->commit();
            $_SESSION['success_msg'] = "Data warga bernama '" . $nama_warga . "' berhasil dihapus secara permanen.";
        } else {
            $pdo->rollBack();
            $_SESSION['error_msg'] = "Data warga tidak ditemukan di sistem.";
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) { $pdo->rollBack(); }
        $_SESSION['error_msg'] = "Gagal menghapus data warga: " . $e->getMessage();
    }
}
header("Location: warga.php");
exit;