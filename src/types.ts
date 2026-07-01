/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Warga {
  id: string;
  nama: string;
  nik: string;
  jatahAwal: number; // in kg
  sisaJatah: number; // in kg
  createdAt: string;
}

export interface PupukMasuk {
  id: string;
  jumlahMasuk: number; // in kg
  tanggal: string;
  keterangan: string;
}

export interface Transaksi {
  id: string;
  wargaId: string;
  wargaNama: string;
  jumlahAmbil: number; // in kg
  tanggalAmbil: string;
}

export interface AdminSession {
  isLoggedIn: boolean;
  username: string;
  loginTime: string;
}
