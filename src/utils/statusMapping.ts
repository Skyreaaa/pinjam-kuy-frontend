// Status mapping untuk PostgreSQL enum ke display text yang user-friendly
export const mapStatus = (pgStatus: string): string => {
  switch (pgStatus?.toLowerCase()) {
    case 'pending':
      return 'Disetujui'; // Show as approved for user but still pending scan
    case 'dipinjam':
      return 'Sedang Dipinjam';
    case 'dikembalikan':
      return 'Dikembalikan';
    case 'ditolak':
      return 'Ditolak';
    default:
      return pgStatus || 'Status Tidak Dikenal';
  }
};

// Check if loan is ready to show QR (pending status means approved but not yet scanned)
export const isQRReady = (status: string): boolean => {
  return status?.toLowerCase() === 'pending';
};

// Check if loan allows return proof upload
export const canUploadReturnProof = (status: string): boolean => {
  return status?.toLowerCase() === 'dipinjam';
};

// Get status CSS class
export const getStatusClass = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'status-approved'; // Show as approved style
    case 'dipinjam':
      return 'status-sedang-dipinjam';
    case 'dikembalikan':
      return 'status-completed';
    case 'ditolak':
      return 'status-rejected';
    default:
      return 'status-default';
  }
};