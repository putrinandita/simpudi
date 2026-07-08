<?php
/**
 * Modul Kelola Data Warga (CRUD)
 * Sistem Manajemen Pupuk Desa
 */
session_start();
require_once "koneksi.php";

// Proteksi Session Admin
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$error = "";
$success = "";

// Ambil pesan flash jika ada dari file eksekutor eksternal seperti hapus_warga.php
if (isset($_SESSION['success_msg'])) {
    $success = $_SESSION['success_msg'];
    unset($_SESSION['success_msg']);
}
if (isset($_SESSION['error_msg'])) {
    $error = $_SESSION['error_msg'];
    unset($_SESSION['error_msg']);
}

// Mengatur status pengeditan
$is_edit = false;
$edit_data = [
    'id' => '',
    'nik' => '',
    'nama' => '',
    'jatah_awal' => 100,
    'sisa_jatah' => 100
];

// 1. PROSES SIMPAN / EDIT WARGA (CREATE & UPDATE)
if (isset($_POST['submit_warga'])) {
    $id = trim($_POST['id'] ?? '');
    $nik = trim($_POST['nik'] ?? '');
    $nama = trim($_POST['nama'] ?? '');
    $jatah_awal = isset($_POST['jatah_awal']) ? (int)$_POST['jatah_awal'] : 0;
    $sisa_jatah = isset($_POST['sisa_jatah']) ? (int)$_POST['sisa_jatah'] : 0;

    // VALIDASI LAPIS 3: Form pengisian tidak boleh kosong
    if (empty($nik) || empty($nama)) {
        $error = "NIK dan Nama warga tidak boleh dibiarkan kosong!";
    }
    // VALIDASI LAPIS 1: Jatah Awal dan Sisa tidak boleh negatif atau nol
    else if ($jatah_awal <= 0 || $sisa_jatah < 0) {
        $error = "Jatah awal harus lebih besar dari 0, dan sisa jatah tidak boleh bernilai negatif!";
    }
    // VALIDASI LAPIS 2: Sisa jatah tidak boleh melebihi jatah kuota awal warga tersebut
    else if ($is_edit && $sisa_jatah > $jatah_awal) {
        $error = "Sisa jatah saat ini tidak boleh melebihi total kuota jatah awal warga!";
    } 
    else {
        try {
            if (!empty($id)) {
                // UPDATE Data Warga
                $stmt = $pdo->prepare("UPDATE warga SET nik = :nik, nama = :nama, jatah_awal = :jatah_awal, sisa_jatah = :sisa_jatah WHERE id = :id");
                $stmt->execute([
                    'nik' => $nik,
                    'nama' => $nama,
                    'jatah_awal' => $jatah_awal,
                    'sisa_jatah' => $sisa_jatah,
                    'id' => $id
                ]);
                $success = "Data warga berhasil diperbarui!";
            } else {
                // INSERT Data Warga Baru (Sisa jatah otomatis diatur sama dengan jatah awal saat pendaftaran awal)
                // Cek NIK duplikat
                $checkNik = $pdo->prepare("SELECT COUNT(*) FROM warga WHERE nik = :nik");
                $checkNik->execute(['nik' => $nik]);
                if ($checkNik->fetchColumn() > 0) {
                    $error = "Warga dengan NIK $nik sudah terdaftar sebelumnya!";
                } else {
                    // Perbaikan parameter SQL agar pas dan tidak memicu 'Invalid parameter number'
                    $stmt = $pdo->prepare("INSERT INTO warga (nik, nama, jatah_awal, sisa_jatah) VALUES (:nik, :nama, :jatah_awal, :sisa_jatah)");
                    $stmt->execute([
                        'nik' => $nik,
                        'nama' => $nama,
                        'jatah_awal' => $jatah_awal,
                        'sisa_jatah' => $jatah_awal
                    ]);
                    $success = "Warga baru berhasil didaftarkan!";
                }
            }
        } catch (PDOException $e) {
            $error = "Gagal memproses data: " . $e->getMessage();
        }
    }
}

// 2. PROSES AKTIFKAN FORM EDIT
if (isset($_GET['edit_id'])) {
    $edit_id = (int)$_GET['edit_id'];
    try {
        $stmt = $pdo->prepare("SELECT * FROM warga WHERE id = :id");
        $stmt->execute(['id' => $edit_id]);
        $row = $stmt->fetch();
        if ($row) {
            $is_edit = true;
            $edit_data = $row;
        }
    } catch (PDOException $e) {
        $error = "Gagal mengambil data untuk edit: " . $e->getMessage();
    }
}

// 3. PROSES HAPUS WARGA (DELETE)
if (isset($_GET['delete_id'])) {
    $delete_id = (int)$_GET['delete_id'];
    try {
        $stmt = $pdo->prepare("DELETE FROM warga WHERE id = :id");
        $stmt->execute(['id' => $delete_id]);
        $success = "Data warga berhasil dihapus dari sistem.";
    } catch (PDOException $e) {
        $error = "Gagal menghapus warga: " . $e->getMessage();
    }
}

// Ambil semua daftar warga
$stmtWarga = $pdo->query("SELECT * FROM warga ORDER BY nama ASC");
$all_warga = $stmtWarga->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kelola Data Warga - SIMPUDI Desa</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-800">
    
    <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-3xl">🌾</span>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">SIMPUDI DESA</h1>
                    <p class="text-xs text-slate-400 font-medium">Sistem Informasi Manajemen Pupuk Subsidi Desa</p>
                </div>
            </div>
            <a href="dashboard.php" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition">
                Kembali ke Dasbor 🏠
            </a>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
        
        <?php if (!empty($error)): ?>
            <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm flex justify-between items-center shadow-sm">
                <span>⚠️ <strong>Error:</strong> <?php echo htmlspecialchars($error); ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($success)): ?>
            <div class="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm flex justify-between items-center shadow-sm">
                <span>✅ <strong>Sukses:</strong> <?php echo htmlspecialchars($success); ?></span>
            </div>
        <?php endif; ?>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <?php echo $is_edit ? '✏️ Edit Data Warga' : '➕ Tambah Data Warga'; ?>
                </h2>

                <form action="warga.php" method="POST" class="space-y-5">
                    <input type="hidden" name="id" value="<?php echo htmlspecialchars($edit_data['id']); ?>">

                    <div>
                        <label for="nik" class="block text-sm font-semibold text-slate-700 mb-2">NIK Warga</label>
                        <input type="text" id="nik" name="nik" required maxlength="16" minlength="16"
                               value="<?php echo htmlspecialchars($edit_data['nik']); ?>"
                               <?php echo $is_edit ? 'readonly class="bg-slate-100 cursor-not-allowed"' : 'class="bg-slate-50"'; ?>
                               class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                               placeholder="Masukkan 16 digit NIK">
                    </div>

                    <div>
                        <label for="nama" class="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap Warga</label>
                        <input type="text" id="nama" name="nama" required
                               value="<?php echo htmlspecialchars($edit_data['nama']); ?>"
                               class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                               placeholder="Nama warga penerima">
                    </div>

                    <div>
                        <label for="jatah_awal" class="block text-sm font-semibold text-slate-700 mb-2">Jatah Awal Pupuk (kg)</label>
                        <input type="number" id="jatah_awal" name="jatah_awal" required min="1"
                               value="<?php echo htmlspecialchars($edit_data['jatah_awal']); ?>"
                               class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                               placeholder="Contoh: 100">
                    </div>

                    <?php if ($is_edit): ?>
                        <div>
                            <label for="sisa_jatah" class="block text-sm font-semibold text-slate-700 mb-2">Sisa Jatah Saat Ini (kg)</label>
                            <input type="number" id="sisa_jatah" name="sisa_jatah" required min="0"
                                   value="<?php echo htmlspecialchars($edit_data['sisa_jatah']); ?>"
                                   class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-slate-50"
                                   placeholder="Contoh: 80">
                            <p class="text-xs text-amber-600 mt-1.5 font-medium">⚠️ Sisa jatah tidak boleh melebihi Jatah Awal.</p>
                        </div>
                    <?php endif; ?>

                    <div class="flex gap-2 pt-2">
                        <button type="submit" name="submit_warga"
                                class="flex-grow bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-sm">
                            <?php echo $is_edit ? 'Simpan Perubahan' : 'Daftarkan Warga'; ?>
                        </button>
                        <?php if ($is_edit): ?>
                            <a href="warga.php" class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl text-sm transition text-center">
                                Batal
                            </a>
                        <?php endif; ?>
                    </div>
                </form>
            </div>

            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">👥 Daftar Warga Penerima Subsidi</h2>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="border-b border-slate-150 text-slate-400 font-semibold">
                                <th class="py-3 px-2">NIK</th>
                                <th class="py-3 px-2">Nama Warga</th>
                                <th class="py-3 px-2 text-center">Jatah Awal</th>
                                <th class="py-3 px-2 text-center">Sisa Jatah</th>
                                <th class="py-3 px-2 text-right">Opsi Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (count($all_warga) > 0): ?>
                                <?php foreach ($all_warga as $w): ?>
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="py-3 px-2 font-mono text-xs text-slate-500"><?php echo htmlspecialchars($w['nik']); ?></td>
                                        <td class="py-3 px-2 font-semibold text-slate-800"><?php echo htmlspecialchars($w['nama']); ?></td>
                                        <td class="py-3 px-2 text-center font-medium"><?php echo $w['jatah_awal']; ?> kg</td>
                                        <td class="py-3 px-2 text-center font-bold">
                                            <span class="<?php echo $w['sisa_jatah'] <= 20 ? 'text-red-600 bg-red-50 px-2.5 py-1 rounded-lg' : 'text-green-700 bg-green-50 px-2.5 py-1 rounded-lg'; ?>">
                                                <?php echo $w['sisa_jatah']; ?> kg
                                            </span>
                                        </td>
                                        <td class="py-3 px-2 text-right space-x-2">
                                            <a href="warga.php?edit_id=<?php echo $w['id']; ?>" class="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Edit
                                            </a>
                                            <a href="warga.php?delete_id=<?php echo $w['id']; ?>" 
                                               onclick="return confirm('Apakah Anda yakin ingin menghapus data warga <?php echo htmlspecialchars($w['nama']); ?>? Seluruh riwayat transaksi terkait juga akan terhapus secara permanen.')"
                                               class="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition inline-block">
                                                Hapus
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" class="py-8 text-center text-slate-400">Belum ada data warga terdaftar.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

    </main>

    <footer class="bg-white border-t border-slate-100 mt-16 py-8 text-center text-xs text-slate-400">
        <p>&copy; <?php echo date('Y'); ?> SIMPUDI Desa. Hak Cipta Dilindungi.</p>
    </footer>

</body>
</html>