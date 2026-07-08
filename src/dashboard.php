<?php
/**
 * Dasbor Utama Admin (Final & Lengkap)
 */
session_start();
require_once "koneksi.php";

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

// 1. Ambil Data Statistik
$stmtStok = $pdo->query("SELECT stok_sekarang FROM stok_gudang WHERE id = 1");
$stok_utama = $stmtStok->fetchColumn() ?: 0;

$stmtTotalWarga = $pdo->query("SELECT COUNT(*) FROM warga");
$total_warga = $stmtTotalWarga->fetchColumn();

$stmtTotalSisa = $pdo->query("SELECT SUM(sisa_jatah) FROM warga");
$total_sisa_jatah = $stmtTotalSisa->fetchColumn() ?: 0;

$stmtTotalTx = $pdo->query("SELECT COUNT(*) FROM transaksi");
$total_transaksi = $stmtTotalTx->fetchColumn();

// 2. Fitur Search
$search = trim($_GET['search'] ?? '');
$warga_list = [];

if ($search !== '') {
    $stmtWarga = $pdo->prepare("SELECT * FROM warga WHERE nama LIKE ? OR nik LIKE ? ORDER BY nama ASC");
    $stmtWarga->execute(["%$search%", "%$search%"]);
    $warga_list = $stmtWarga->fetchAll();
} else {
    $stmtWarga = $pdo->query("SELECT * FROM warga ORDER BY created_at DESC LIMIT 5");
    $warga_list = $stmtWarga->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Dasbor SIMPUDI - Sistem Informasi Manajemen Pupuk Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        <div class="flex items-center space-x-3">
            <!-- Ini adalah logo emoji padinya -->
            <span class="text-3xl">🌾</span>
            
            <div class="flex flex-col">
                <h1 class="text-xl font-bold text-slate-900">SIMPUDI DESA</h1>
                <h2 class="text-xs font-semibold text-slate-500 tracking-wider">Sistem Informasi Manajemen Pupuk Subsidi Desa</h2>
            </div>
        </div>

        <a href="logout.php" onclick="return confirm('Keluar?')" class="bg-red-50 text-red-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-red-100 transition">
            Keluar 🚪
        </a>
        
    </div>
</header>
    <main class="max-w-7xl mx-auto px-6 py-8">
        <nav class="flex flex-wrap gap-3 mb-8">
            <a href="dashboard.php" class="bg-green-600 text-white font-semibold px-5 py-3 rounded-xl text-sm">🏠 Dasbor</a>
            <a href="warga.php" class="bg-white border text-slate-600 px-5 py-3 rounded-xl text-sm">👥 Warga</a>
            <a href="pupuk_masuk.php" class="bg-white border text-slate-600 px-5 py-3 rounded-xl text-sm">📥 Stok</a>
            <a href="transaksi.php" class="bg-white border text-slate-600 px-5 py-3 rounded-xl text-sm">🧾 Transaksi</a>
            <a href="pengaturan.php" class="bg-white border text-slate-600 px-5 py-3 rounded-xl text-sm">⚙️ Pengaturan</a>
        </nav>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <span class="text-xs text-slate-400 uppercase font-bold">Stok Gudang</span>
                <h3 class="text-2xl font-black mt-2"><?php echo number_format($stok_utama); ?> kg</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <span class="text-xs text-slate-400 uppercase font-bold">Total Warga</span>
                <h3 class="text-2xl font-black mt-2"><?php echo number_format($total_warga); ?> orang</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <span class="text-xs text-slate-400 uppercase font-bold">Sisa Jatah</span>
                <h3 class="text-2xl font-black mt-2"><?php echo number_format($total_sisa_jatah); ?> kg</h3>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border">
                <span class="text-xs text-slate-400 uppercase font-bold">Transaksi</span>
                <h3 class="text-2xl font-black mt-2"><?php echo number_format($total_transaksi); ?> kali</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
                <h2 class="text-lg font-bold mb-4">🔍 Pencarian Warga</h2>
                <form action="dashboard.php" method="GET" class="flex gap-2">
                    <input type="text" name="search" value="<?php echo htmlspecialchars($search); ?>" class="flex-grow px-4 py-3 border rounded-xl text-sm" placeholder="Ketik nama...">
                    <button type="submit" class="bg-slate-800 text-white px-5 py-3 rounded-xl text-sm">Cari</button>
                </form>
                <table class="w-full mt-6 text-sm">
                    <thead><tr class="border-b text-slate-400"><th class="py-3 px-2">Nama</th><th class="py-3 px-2 text-center">Sisa</th><th class="py-3 px-2 text-right">Aksi</th></tr></thead>
                    <tbody class="divide-y">
                        <?php foreach ($warga_list as $w): ?>
                        <tr>
                            <td class="py-3 px-2 font-bold"><?php echo htmlspecialchars($w['nama']); ?></td>
                            <td class="py-3 px-2 text-center"><?php echo $w['sisa_jatah']; ?> kg</td>
                            <td class="py-3 px-2 text-right"><a href="transaksi.php?warga_id=<?php echo $w['id']; ?>" class="bg-green-600 text-white px-3 py-1 rounded-lg text-xs">Ambil</a></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</body>
</html>