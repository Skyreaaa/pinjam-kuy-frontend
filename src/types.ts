// src/types.ts

// Standarisasi tipe Book agar konsisten dengan API normalisasi
export interface Book {
  id: number | string;
  judul?: string; // versi user
  penulis?: string; // versi user
  title?: string; // versi admin
  author?: string; // versi admin
  year?: string | number;
  totalStock?: number;
  availableStock?: number;
  stock?: number; // fallback legacy
  description?: string;
  imageUrl?: string;
  kodeBuku?: string;
  location?: string;
  category?: string;
  borrowCount?: number; // opsional, untuk filter populer
}

// Tipe unified untuk Loan (menggabungkan kebutuhan user & admin)
export interface Loan {
  id: number | string;
  kodePinjam: string | null;
  bookTitle: string;
  kodeBuku?: string;
  loanDate: string;
  returnDate: string;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Diambil' | 'Sedang Dipinjam' | 'Ditolak' | 'Selesai' | 'Terlambat' | 'Siap Dikembalikan' | 'Dikembalikan' | 'Pending Approval' | 'Confirmed' | 'Dibatalkan User';
  penaltyAmount?: number;
  actualReturnDate?: string | null;
  borrowerName?: string; // legacy front-end usage
  location?: string;
  lampiran?: string; // Tipe lampiran (PDF, Audio, Video, dll)
  attachment_url?: string; // URL file digital
}