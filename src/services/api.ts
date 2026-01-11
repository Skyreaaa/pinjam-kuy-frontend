// ---- LOAN API ----
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
// ---- LOAN API ----
export const loanApi = {
    request: (data: { bookId: number; loanDate?: string; returnDate: string; purpose?: string; }) => userApi.post('/loans/request', data).then(r => r.data as { success: boolean; message: string; loan?: { id: number; kodePinjam: string; bookTitle: string; loanDate: string; expectedReturnDate: string; status: string; purpose?: string|null; }; }),
    userLoans: () => userApi.get<LoanDto[]>(`/loans/user`).then(r => r.data),
    markReadyToReturn: (loanId: number, file?: File, metadata?: any) => {
      const fd = new FormData();
      if (file) fd.append('proofPhoto', file);
      if (metadata) fd.append('metadata', JSON.stringify(metadata));
      return userApi.post(`/loans/ready-to-return/${loanId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data as { success: boolean; message: string; proofUrl?: string });
    },
    uploadReturnProof: (data: { loanId: number; imageUrl: string; meta: any }) =>
      userApi.post('/loans/upload-return-proof', data).then(r => r.data),
    notifications: () => userApi.get(`/loans/notifications`).then(r => r.data as { success:boolean; notifications: Array<{id:number; kodePinjam?:string; approvedAt:string; status:string}> }),
    ackNotifications: (ids: number[]) => userApi.post(`/loans/notifications/ack`, { ids }).then(r => r.data as { success:boolean }),
    returnNotifications: () => userApi.get(`/loans/return-notifications`).then(r => r.data as { success:boolean; notifications: Array<{id:number; status:string; returnDecision:'approved'|'rejected'; actualReturnDate:string; bookTitle:string; fineAmount?: number}> }),
    ackReturnNotifications: (ids: number[]) => userApi.post(`/loans/return-notifications/ack`, { ids }).then(r => r.data as { success:boolean }),
    rejectionNotifications: () => userApi.get(`/loans/rejection-notifications`).then(r => r.data as { success:boolean; notifications: Array<{id:number; status:string; rejectionDate:string; bookTitle:string}> }),
    ackRejectionNotifications: (ids: number[]) => userApi.post(`/loans/rejection-notifications/ack`, { ids }).then(r => r.data as { success:boolean }),
    notificationHistory: () => userApi.get(`/loans/notifications/history`).then(r => r.data as { success:boolean; items: Array<{ id:number; bookTitle:string; status:string; approvedAt?:string; actualReturnDate?:string; returnDecision?:'approved'|'rejected'; rejectionDate?:string; returnProofUrl?:string; returnProofMetadata?:string|any }> }),
};


// ---- USER NOTIFICATIONS ----
export const userNotificationApi = {
    list: () => userApi.get('/user/notifications').then(r => r.data),
    broadcasts: () => userApi.get('/user/notifications?broadcast=1').then(r => r.data),
};

// Basic axios instance for user
export const userApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});
// Basic axios instance for admin
export const adminApiAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

// Attach user token automatically if exists
userApi.interceptors.request.use((config) => {
  // Use sessionStorage for per-tab session
  const token = sessionStorage.getItem('token');
  if (token && config.headers) {
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});
// Attach admin token automatically if exists
adminApiAxios.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token');
  if (token && config.headers) {
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
    console.log('[ADMIN API] Authorization header set:', (config.headers as any)["Authorization"]);
  } else {
    console.warn('[ADMIN API] No admin_token found in sessionStorage!');
  }
  return config;
});

// Global response interceptor: auto-logout & redirect if 401 Unauthorized (user)
userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);
// Global response interceptor: auto-logout & redirect if 401 Unauthorized (admin)
adminApiAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

// ---- TYPES ----
export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  userData: any; // You can refine later
}

export interface BookDto {
  id: number;
  title?: string; // admin list version
  judul?: string; // user borrowing version naming mismatch
  author?: string;
  penulis?: string;
  kodeBuku: string;
  publisher?: string;
  publicationYear?: number | string;
  totalStock: number;
  availableStock: number;
  category?: string;
  image_url?: string;
  imageUrl?: string; // front component uses imageUrl
  location?: string;
  year?: string;
  description?: string;
  programStudi?: string;
  bahasa?: string;
  jenisKoleksi?: string;
  lampiran?: string;
  pemusatanMateri?: string;
  pages?: number;
  attachment_url?: string;
}

export interface LoanDto {
  id: number;
  kodePinjam?: string;
  bookTitle?: string;
  kodeBuku: string;
  loanDate: string;
  expectedReturnDate?: string;
  returnDate?: string;
  status: string;
  fineAmount?: number;
  finePaid?: number;
  finePaymentStatus?: string;
  finePaymentMethod?: string;
  finePaymentProof?: string;
  actualReturnDate?: string | null;
  penaltyAmount?: number;
  location?: string;
  returnProofUrl?: string | null;
  readyReturnDate?: string | null;
}

// ---- AUTH ----
export const authApi = {
  login: (npm: string, password: string) => userApi.post<LoginResponse>('/auth/login', { npm, password }).then(r => r.data),
};

// ---- PROFILE ----
export const profileApi = {
  updateBiodata: (data: any) => userApi.put('/profile/update-biodata', data).then(r => r.data),
  uploadPhoto: (file: File | null) => {
    const fd = new FormData();
    if (file) fd.append('profile_photo', file);
    return userApi.post('/profile/upload-photo', fd).then(r => r.data);
  },
  deletePhoto: () => userApi.delete('/profile/delete-photo').then(r => r.data),
  me: () => userApi.get('/profile/me').then(r => r.data),
  activeFine: () => userApi.get('/profile/active-fine').then(r => r.data as { success:boolean; activeFine:number; runningFine:number; unpaidReturnedFine:number }),
  payFines: (loanIds?: number[]) => userApi.post('/profile/pay-fines', loanIds && loanIds.length ? { loanIds } : {}).then(r => r.data as { success:boolean; paidCount:number; paidTotal:number; remainingUnpaid:number; message?:string }),
  initiateFines: (loanIds: number[], method: 'bank'|'qris'|'cash') => userApi.post('/profile/initiate-fines', { loanIds, method }).then(r => r.data as { success:boolean; updatedIds:number[]; status:string; method:string }),
  uploadFineProof: (loanIds: number[], file: File) => {
    const fd = new FormData();
    fd.append('loanIds', JSON.stringify(loanIds));
    fd.append('proof', file);
    return userApi.post('/profile/upload-fine-proof', fd, { headers:{ 'Content-Type':'multipart/form-data' }}).then(r=> r.data as { success:boolean; proofUrl:string; updatedIds:number[]; status:string });
  },
};

// ---- BOOKS ----
export const bookApi = {
  list: (search?: string, opts?: { sort?: 'popular'|'newest' }) => {
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (opts?.sort) params.push(`sort=${opts.sort === 'popular' ? 'popular' : opts.sort === 'newest' ? 'newest' : ''}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return userApi.get<BookDto[]>(`/books${qs}`).then(r => r.data);
  },
  // Public endpoint - no authentication required
  listPublic: (search?: string, category?: string) => {
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return userApi.get<BookDto[]>(`/books/public${qs}`).then(r => r.data);
  },
  detail: (id: number | string) => userApi.get<BookDto>(`/books/${id}`).then(r => r.data),
  detailPublic: (id: number | string) => userApi.get<BookDto>(`/books/public/${id}`).then(r => r.data),
  create: (formData: FormData) => userApi.post('/books', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  update: (id: number, formData: FormData) => userApi.put(`/books/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  remove: (id: number) => userApi.delete(`/books/${id}`).then(r => r.data),
};

// ---- LOANS (User) ----


// ---- ADMIN ----
export const adminApi = {
  users: () => adminApiAxios.get('/admin/users').then(r => r.data),
  createUser: (data: any) => adminApiAxios.post('/admin/users', data).then(r => r.data),
  updateUser: (id: number, data: any) => {
    console.log('[API] adminApi.updateUser called with:', { id, data });
    return adminApiAxios.put(`/admin/users/${id}`, data).then(r => r.data);
  },
  deleteUser: (id: number) => adminApiAxios.delete(`/admin/users/${id}`).then(r => r.data),
  resetPenalty: (id: number) => adminApiAxios.post(`/admin/penalty/reset/${id}`, {}).then(r => r.data),

  pendingLoans: () => adminApiAxios.get('/admin/loans/pending').then(r => r.data),
  approveLoan: (loanId: number) => adminApiAxios.post('/admin/loans/approve', { loanId }).then(r => r.data),
  rejectLoan: (loanId: number) => adminApiAxios.post('/admin/loans/reject', { loanId }).then(r => r.data),

  returnsReview: () => adminApiAxios.get('/admin/returns/review').then(r => r.data),
  processReturn: (loanId: number, manualFineAmount: number) => adminApiAxios.post('/admin/returns/process', { loanId, manualFineAmount }).then(r => r.data),
  rejectReturn: (loanId: number) => adminApiAxios.post('/admin/returns/reject', { loanId }).then(r => r.data),

  // History (Dikembalikan & Ditolak)
  history: () => adminApiAxios.get('/admin/history').then(r => r.data),

  // Fines verification
  pendingFinePayments: () => adminApiAxios.get('/admin/fines/pending').then(r => r.data as { success:boolean; items:any[] }),
  verifyFinePayment: (notificationId:number, action:'approve'|'reject') => adminApiAxios.post('/admin/fines/verify', { notificationId, action }).then(r => r.data as { success:boolean; updated:number; action:string }),

  // QR Scan & Start Loan
  scanLoan: (kodePinjam: string) => adminApiAxios.post('/admin/loans/scan', { kodePinjam }).then(r => r.data as { success:boolean; message:string; loanId?:number }),
  startLoan: (loanId: number) => adminApiAxios.post('/admin/loans/start', { loanId }).then(r => r.data as { success:boolean; message:string; expectedReturnDate?:string }),

  // Books management (admin uses admin token)
  listBooks: () => adminApiAxios.get('/books/public').then(r => r.data as BookDto[]),
  createBook: (formData: FormData) => adminApiAxios.post('/books', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  updateBook: (id: number, formData: FormData) => adminApiAxios.put(`/books/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  deleteBook: (id: number) => adminApiAxios.delete(`/books/${id}`).then(r => r.data),

  // Active loans management
  getActiveLoans: () => adminApiAxios.get('/admin/loans/active').then(r => r.data as { success: boolean; items: any[] }),
  sendLoanReminder: (loanId: number) => adminApiAxios.post('/admin/loans/send-reminder', { loanId }).then(r => r.data),

  // Fine payments management
  get: (path: string) => adminApiAxios.get(`/admin${path}`).then(r => r.data),
  post: (path: string, data: any, config?: any) => adminApiAxios.post(`/admin${path}`, data, config).then(r => r.data),
  
  // Broadcast
  broadcast: (data: { message: string; type?: string; userIds?: number[] }) => 
    adminApiAxios.post('/admin/broadcast', data).then(r => r.data),
};

// Utility mapper for inconsistent naming between endpoints and UI components
export const normalizeBook = (b: BookDto) => ({
  id: b.id,
  // UI Display fields (normalized)
  judul: b.judul || b.title || 'Judul Tidak Tersedia',
  penulis: b.penulis || b.author || 'Penulis Tidak Tersedia',
  kodeBuku: b.kodeBuku,
  totalStock: b.totalStock,
  availableStock: b.availableStock,
  year: (b.publicationYear || b.year || '').toString(),
  imageUrl: (() => {
    const raw = b.imageUrl || b.image_url || '';
    if (!raw) return '';
    // If already absolute (http/https/data blob), return as is
    if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
    // Normalize double leading slashes
    const cleaned = raw.startsWith('//') ? raw.replace(/^\/+/, '') : raw;
    // If starts with /uploads or uploads, prefix with backend host portion of API_BASE_URL
    const hostBase = API_BASE_URL.replace(/\/api\/?$/,'');
    if (/^uploads\//i.test(cleaned)) return `${hostBase}/${cleaned}`;
    if (/^\/uploads\//i.test(cleaned)) return `${hostBase}${cleaned}`;
    // Fallback: just join
    return `${hostBase}/${cleaned.replace(/^\//,'')}`;
  })(),
  description: b.description || '',
  location: b.location || 'Tidak Diketahui',
  category: b.category || '-',
  
  // API fields (for edit form compatibility)
  title: b.title || b.judul || '',
  author: b.author || b.penulis || '',
  publisher: b.publisher || '',
  publicationYear: b.publicationYear || b.year || new Date().getFullYear(),
  image_url: b.image_url || b.imageUrl || '',
  programStudi: b.programStudi || '',
  bahasa: b.bahasa || 'Bahasa Indonesia',
  jenisKoleksi: b.jenisKoleksi || 'Buku Asli',
  lampiran: b.lampiran || 'Tidak Ada',
  pemusatanMateri: b.pemusatanMateri || '',
  pages: b.pages || undefined,
  attachment_url: b.attachment_url || null,
});
