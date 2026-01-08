// File: src/components/DashboardAdmin/BookModal.tsx (BARU - FULL CODE SIAP PAKAI)

import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSave, FaBook, FaInfoCircle, FaImage, FaBarcode, FaMapMarkerAlt } from 'react-icons/fa';
import './AdminDashboard.css'; 
import { adaptiveCompress, formatBytes } from '../../utils/imageProcessing';

// --- INTERFACES ---
interface BookData {
    id: number;
    // API format fields
    title: string;
    author: string;
    kodeBuku: string;
    publisher?: string;
    publicationYear?: number;
    totalStock: number;
    availableStock: number;
    category: string;
    image_url?: string;
    location: string;
    description?: string;
    programStudi?: string;
    bahasa?: string;
    jenisKoleksi?: string;
    lampiran?: string;
    pemusatanMateri?: string;
    pages?: number;
    attachment_url?: string;
    // Normalized format fields (for compatibility)
    judul?: string;
    penulis?: string;
    kode_buku?: string;
    penerbit?: string;
    year?: string | number;
    tahun?: string | number;
    total_stock?: number;
    available_stock?: number;
    kategori?: string;
    lokasi?: string;
    deskripsi?: string;
    program_studi?: string;
    jenis_koleksi?: string;
    pemusatan_materi?: string;
    jumlah_halaman?: number;
    imageUrl?: string;
}

interface BookModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookToEdit: BookData | null;
    onSave: (id: number, formData: FormData) => Promise<void>;
    error: string | null;
    isLoading: boolean;
}

// Konfigurasi Kategori Buku
const BOOK_CATEGORIES = [
    'Filsafat',
    'Teknik',
    'Sains & Teknologi',
    'Ekonomi & Bisnis',
    'Hukum',
    'Pendidikan',
    'Sastra & Bahasa',
    'Sejarah',
    'Agama',
    'Kesehatan',
    'Komputer & IT',
    'Seni & Budaya',
    'Fiksi',
    'Non-Fiksi',
    'Referensi',
    'Lainnya'
];

// Program Studi Options
const PROGRAM_STUDI = [
    'Doktor Ilmu Manajemen',
    'S1 - Teknik',
    'S1 - Hukum',
    'S1 - Ekonomi',
    'S1 - Kedokteran',
    'S1 - Matematika',
    'S1 - Biologi',
    'S1 - Komputer',
    'S1 - Psikologi',
    'S1 - Sastra',
    'S1 - Agama',
    'S1 - Sejarah',
    'S1 - Seni',
    'S1 - Musik'
];

// Bahasa Options
const BAHASA_OPTIONS = [
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'Bahasa Jepang',
    'Bahasa Arab',
    'Bahasa Mandarin',
    'Bahasa Korea',
    'Lainnya'
];

// Jenis Koleksi Options
const JENIS_KOLEKSI = [
    'Buku Asli',
    'Buku Salinan',
    'E-Book',
    'Jurnal',
    'Majalah',
    'DVD',
    'Referensi'
];

// Lampiran Options
const LAMPIRAN_OPTIONS = [
    'Tidak Ada',
    'PDF',
    'Video',
    'Audio',
    'Presentasi'
];

// Pemusatan Materi Options
const PEMUSATAN_MATERI = [
    'Teknik',
    'Manajemen',
    'Ekonomi',
    'Hukum',
    'Kedokteran',
    'Matematika',
    'Biologi',
    'Komputer',
    'Psikologi',
    'Sastra',
    'Agama',
    'Sejarah',
    'Seni',
    'Musik',
    'Jurnal Nasional',
    'Jurnal Internasional',
    'Bahan Referensi',
    'Buku Ilmiah',
    'Buku Populer',
    'Buku Pendidikan',
    'Buku Penelitian',
    'Buku Teks',
    'Lainnya'
];

const BookModal: React.FC<BookModalProps> = ({ isOpen, onClose, bookToEdit, onSave, error, isLoading }) => {
    const [formData, setFormData] = useState<Partial<BookData>>({});
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [imageInfo, setImageInfo] = useState<string | null>(null);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        console.log('📘 BookModal opened - isOpen:', isOpen, 'bookToEdit:', bookToEdit);
        if (bookToEdit) {
            console.log('📖 Loading book for edit:', JSON.stringify(bookToEdit, null, 2));
            
            // Support both normalized (judul/penulis) and API format (title/author)
            const loadedData = {
                title: bookToEdit.title || bookToEdit.judul || '',
                author: bookToEdit.author || bookToEdit.penulis || '',
                kodeBuku: bookToEdit.kodeBuku || bookToEdit.kode_buku || '',
                publisher: bookToEdit.publisher || bookToEdit.penerbit || '',
                publicationYear: Number(bookToEdit.publicationYear || bookToEdit.year || bookToEdit.tahun || new Date().getFullYear()),
                totalStock: Number(bookToEdit.totalStock || bookToEdit.total_stock || 1),
                availableStock: Number(bookToEdit.availableStock || bookToEdit.available_stock || 0),
                category: bookToEdit.category || bookToEdit.kategori || 'Lainnya',
                location: bookToEdit.location || bookToEdit.lokasi || '',
                description: bookToEdit.description || bookToEdit.deskripsi || '',
                programStudi: bookToEdit.programStudi || bookToEdit.program_studi || '',
                bahasa: bookToEdit.bahasa || 'Bahasa Indonesia',
                jenisKoleksi: bookToEdit.jenisKoleksi || bookToEdit.jenis_koleksi || 'Buku Asli',
                lampiran: bookToEdit.lampiran || 'Tidak Ada',
                pemusatanMateri: bookToEdit.pemusatanMateri || bookToEdit.pemusatan_materi || '',
                pages: bookToEdit.pages || bookToEdit.jumlah_halaman || undefined,
            };
            console.log('✅ Form data loaded:', JSON.stringify(loadedData, null, 2));
            setFormData(loadedData);
            setImagePreview(bookToEdit.image_url || bookToEdit.imageUrl || null);
            setAttachmentUrl(bookToEdit.attachment_url || null);
            setCoverImage(null);
            setAttachmentFile(null);
        } else {
            console.log('➕ Opening form for new book');
            setFormData({ 
                title: '', author: '', kodeBuku: '', publisher: '', category: 'Fiksi', location: '',
                totalStock: 1, publicationYear: new Date().getFullYear(), availableStock: 1, description: '',
                programStudi: '', bahasa: 'Bahasa Indonesia', jenisKoleksi: 'Buku Asli', 
                lampiran: 'Tidak Ada', pemusatanMateri: '', pages: undefined
            });
            setImagePreview(null);
            setAttachmentUrl(null);
            setCoverImage(null);
            setAttachmentFile(null);
        }
    }, [bookToEdit, isOpen]);

    if (!isOpen) return null;

    const isEditMode = bookToEdit !== null && bookToEdit.id !== undefined && bookToEdit.id !== 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImageInfo(null);
        if (!file) {
            setCoverImage(null);
            setImagePreview(isEditMode ? bookToEdit?.image_url || null : null);
            return;
        }
        // Basic upfront checks
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar.');
            return;
        }
        // Start processing (max 800x800, adaptive compress to <= 400KB preferred)
        setProcessing(true);
        try {
            const processed = await adaptiveCompress(file, {
                maxWidth: 800,
                maxHeight: 800,
                outputType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                preserveTransparency: file.type === 'image/png',
                maxBytes: 400 * 1024
            });
            setCoverImage(processed);
            const url = URL.createObjectURL(processed);
            setImagePreview(url);
            setImageInfo(`Ukuran setelah kompresi: ${formatBytes(processed.size)} (asal ${formatBytes(file.size)})`);
        } catch (err) {
            console.warn('Gagal memproses gambar, gunakan original:', err);
            setCoverImage(file);
            setImagePreview(URL.createObjectURL(file));
            setImageInfo(`Ukuran asli: ${formatBytes(file.size)}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveImage = () => {
        setCoverImage(null);
        setImagePreview(null);
        setImageInfo(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) {
            setAttachmentFile(null);
            return;
        }
        // Validasi file berdasarkan jenis lampiran
        const lampiranType = formData.lampiran || 'Tidak Ada';
        if (lampiranType === 'PDF' && file.type !== 'application/pdf') {
            alert('File harus berupa PDF.');
            if (attachmentInputRef.current) attachmentInputRef.current.value = '';
            return;
        }
        if (lampiranType === 'Audio' && !file.type.startsWith('audio/')) {
            alert('File harus berupa audio.');
            if (attachmentInputRef.current) attachmentInputRef.current.value = '';
            return;
        }
        if (lampiranType === 'Video' && !file.type.startsWith('video/')) {
            alert('File harus berupa video.');
            if (attachmentInputRef.current) attachmentInputRef.current.value = '';
            return;
        }
        if (lampiranType === 'Presentasi' && !['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type)) {
            alert('File harus berupa presentasi (PPT/PPTX).');
            if (attachmentInputRef.current) attachmentInputRef.current.value = '';
            return;
        }
        setAttachmentFile(file);
    };

    const handleRemoveAttachment = () => {
        setAttachmentFile(null);
        setAttachmentUrl(null);
        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.title || !formData.author || !formData.kodeBuku || !formData.totalStock || !formData.category || !formData.location) {
            return alert('Harap isi semua kolom wajib (*)!');
        }

        const dataToSend = new FormData();
        dataToSend.append('title', formData.title || '');
        dataToSend.append('author', formData.author || '');
        dataToSend.append('kodeBuku', formData.kodeBuku || '');
        dataToSend.append('publisher', formData.publisher || '');
        dataToSend.append('publicationYear', String(formData.publicationYear || new Date().getFullYear()));
        dataToSend.append('totalStock', String(formData.totalStock || 1));
        dataToSend.append('category', formData.category || 'Lainnya');
        dataToSend.append('location', formData.location || '');
        if (typeof formData.description === 'string') {
            dataToSend.append('description', formData.description);
        }
        if (formData.programStudi) dataToSend.append('programStudi', formData.programStudi);
        if (formData.bahasa) dataToSend.append('bahasa', formData.bahasa);
        if (formData.jenisKoleksi) dataToSend.append('jenisKoleksi', formData.jenisKoleksi);
        if (formData.lampiran) dataToSend.append('lampiran', formData.lampiran);
        if (formData.pemusatanMateri) dataToSend.append('pemusatanMateri', formData.pemusatanMateri);
        if (formData.pages) dataToSend.append('pages', String(formData.pages));
        
        // Hanya tambahkan file jika ada perubahan/file baru
        if (coverImage) {
            dataToSend.append('coverImage', coverImage);
        }
        
        // Tambahkan attachment file jika ada
        if (attachmentFile) {
            dataToSend.append('attachmentFile', attachmentFile);
        }
        
        // Untuk mode edit, kirim nama file lama jika tidak ada upload baru
        if (isEditMode && bookToEdit?.image_url) {
            const fileName = bookToEdit.image_url.split('/').pop();
             dataToSend.append('currentImageFileName', fileName || '');
        }

        try {
            await onSave(isEditMode ? bookToEdit!.id : 0, dataToSend);
        } catch (err) {
            // Error sudah ditangani di parent (AdminDashboard)
        }
    };

    return (
        // Tambahkan class 'open' agar sesuai dengan CSS yang mensyaratkan .modal-overlay.open untuk visible
        <div className="modal-overlay open">
            <div className="modal-content large">
                <div className="modal-header">
                    <h2><FaBook /> {isEditMode ? 'Edit Data Buku' : 'Tambah Buku Baru'}</h2>
                    <button className="close-button" onClick={onClose} aria-label="Tutup Modal"><FaTimes /></button>
                </div>
                {error && <p className="error-message"><FaInfoCircle /> {error}</p>}
                
                <form onSubmit={handleSubmit}>
                    <div className="modal-body-grid">
                        
                        {/* Kolom Kiri: Info Dasar */}
                        <div className="form-column">
                            <div className="form-group">
                                <label htmlFor="title">Judul Buku <span className="required">*</span></label>
                                <input type="text" id="title" name="title" value={formData.title || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="author">Penulis <span className="required">*</span></label>
                                <input type="text" id="author" name="author" value={formData.author || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="kodeBuku"><FaBarcode /> Kode Buku <span className="required">*</span></label>
                                <input type="text" id="kodeBuku" name="kodeBuku" value={formData.kodeBuku || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="location"><FaMapMarkerAlt /> Lokasi Rak/Penyimpanan <span className="required">*</span></label>
                                <input type="text" id="location" name="location" value={formData.location || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group half-group">
                                <div className="half-item">
                                    <label htmlFor="totalStock">Total Stok <span className="required">*</span></label>
                                    <input type="number" id="totalStock" name="totalStock" value={formData.totalStock || 1} onChange={handleChange} min="1" required />
                                </div>
                                <div className="half-item">
                                    <label htmlFor="category">Kategori <span className="required">*</span></label>
                                    <select id="category" name="category" value={formData.category || 'Fiksi'} onChange={handleChange} required>
                                        {BOOK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group half-group">
                                <div className="half-item">
                                    <label htmlFor="publisher">Penerbit</label>
                                    <input type="text" id="publisher" name="publisher" value={formData.publisher || ''} onChange={handleChange} />
                                </div>
                                <div className="half-item">
                                    <label htmlFor="publicationYear">Tahun Terbit</label>
                                    <input type="number" id="publicationYear" name="publicationYear" value={formData.publicationYear || new Date().getFullYear()} onChange={handleChange} min="1900" max={new Date().getFullYear()} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="programStudi">Program Studi</label>
                                <select id="programStudi" name="programStudi" value={formData.programStudi || ''} onChange={handleChange} className="dropdown-bottom">
                                    <option value="">-- Pilih Program Studi --</option>
                                    {PROGRAM_STUDI.map(prodi => <option key={prodi} value={prodi}>{prodi}</option>)}
                                </select>
                            </div>
                            <div className="form-group half-group">
                                <div className="half-item">
                                    <label htmlFor="bahasa">Bahasa</label>
                                    <select id="bahasa" name="bahasa" value={formData.bahasa || 'Bahasa Indonesia'} onChange={handleChange} className="dropdown-bottom">
                                        {BAHASA_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="half-item">
                                    <label htmlFor="jenisKoleksi">Jenis Koleksi</label>
                                    <select id="jenisKoleksi" name="jenisKoleksi" value={formData.jenisKoleksi || 'Buku Asli'} onChange={handleChange} className="dropdown-bottom">
                                        {JENIS_KOLEKSI.map(jk => <option key={jk} value={jk}>{jk}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group half-group">
                                <div className="half-item">
                                    <label htmlFor="lampiran">Lampiran</label>
                                    <select id="lampiran" name="lampiran" value={formData.lampiran || 'Tidak Ada'} onChange={handleChange} className="dropdown-bottom">
                                        {LAMPIRAN_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="half-item">
                                    <label htmlFor="pages">Jumlah Halaman</label>
                                    <input type="number" id="pages" name="pages" value={formData.pages || ''} onChange={handleChange} min="1" placeholder="Opsional" />
                                </div>
                            </div>
                            
                            {/* Upload Lampiran - Conditional berdasarkan jenis lampiran */}
                            {formData.lampiran && formData.lampiran !== 'Tidak Ada' && (
                                <div className="form-group">
                                    <label htmlFor="attachmentFile">
                                        Upload File {formData.lampiran}
                                        {formData.lampiran === 'PDF' && ' (.pdf)'}
                                        {formData.lampiran === 'Audio' && ' (.mp3, .wav, dll)'}
                                        {formData.lampiran === 'Video' && ' (.mp4, .avi, dll)'}
                                        {formData.lampiran === 'Presentasi' && ' (.ppt, .pptx)'}
                                    </label>
                                    <input 
                                        type="file" 
                                        id="attachmentFile" 
                                        name="attachmentFile"
                                        accept={
                                            formData.lampiran === 'PDF' ? '.pdf' :
                                            formData.lampiran === 'Audio' ? 'audio/*' :
                                            formData.lampiran === 'Video' ? 'video/*' :
                                            formData.lampiran === 'Presentasi' ? '.ppt,.pptx' : '*'
                                        }
                                        onChange={handleAttachmentChange}
                                        ref={attachmentInputRef}
                                    />
                                    {attachmentFile && (
                                        <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                                            <span style={{fontSize:'0.9em',color:'#27ae60'}}>✓ {attachmentFile.name}</span>
                                            <button type="button" className="btn btn-danger btn-sm" onClick={handleRemoveAttachment} style={{padding:'2px 8px',fontSize:'0.8em'}}>
                                                <FaTimes />
                                            </button>
                                        </div>
                                    )}
                                    {attachmentUrl && !attachmentFile && (
                                        <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.9em',color:'#3498db'}}>
                                                📎 File Lampiran Tersimpan
                                            </a>
                                            <button type="button" className="btn btn-danger btn-sm" onClick={handleRemoveAttachment} style={{padding:'2px 8px',fontSize:'0.8em'}}>
                                                <FaTimes /> Hapus
                                            </button>
                                        </div>
                                    )}
                                    <p className="info-note" style={{fontSize:'0.85em',marginTop:6}}>
                                        {formData.lampiran === 'Tidak Ada' 
                                            ? 'Buku fisik di perpustakaan, tidak perlu upload file.' 
                                            : 'Upload file lampiran sesuai jenis yang dipilih.'}
                                    </p>
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label htmlFor="pemusatanMateri">Pemusatan Materi</label>
                                <select id="pemusatanMateri" name="pemusatanMateri" value={formData.pemusatanMateri || ''} onChange={handleChange} className="dropdown-bottom">
                                    <option value="">-- Pilih Pemusatan Materi --</option>
                                    {PEMUSATAN_MATERI.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                                </select>
                            </div>
                            {isEditMode && (
                                <div className="form-group">
                                    <p className="info-available">Stok Tersedia Saat Ini: <strong>{bookToEdit?.availableStock}</strong></p>
                                    <p className="info-note">Perubahan Total Stok akan menyesuaikan Stok Tersedia (Stok Tersedia = Stok Tersedia Lama + (Total Stok Baru - Total Stok Lama)).</p>
                                </div>
                            )}
                            <div className="form-group">
                                <label htmlFor="description">Deskripsi</label>
                                <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={5} placeholder="Deskripsi buku, ringkasan, atau catatan." />
                            </div>
                        </div>
                        
                        {/* Kolom Kanan: Upload Gambar */}
                        <div className="form-column">
                            <div className="form-group">
                                <label htmlFor="coverImage">Cover Buku (≤ 5MB sebelum kompresi, otomatis dikompresi)</label>
                                <input 
                                    type="file" 
                                    id="coverImage" 
                                    name="coverImage" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    ref={fileInputRef}
                                />
                                {processing && <p className="info-note">Memproses gambar...</p>}
                                {imageInfo && <p className="info-note small">{imageInfo}</p>}
                            </div>
                            <div className="image-preview-container">
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Cover Preview" className="cover-preview" />
                                        <button type="button" className="btn btn-danger btn-remove-image" onClick={handleRemoveImage}>
                                            <FaTimes /> Hapus Gambar
                                        </button>
                                    </>
                                ) : (
                                    <div className="cover-placeholder">
                                        <FaImage size={50} />
                                        <p>Pratinjau Cover</p>
                                    </div>
                                )}
                            </div>
                            <p className="info-note">Hanya upload jika ingin menambah/mengganti cover.</p>
                        </div>
                        
                    </div>
                    
                    <button type="submit" className="btn btn-primary btn-save" disabled={isLoading}>
                        {isLoading ? 'Menyimpan...' : <><FaSave /> Simpan Buku</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookModal;