// File: src/components/DashboardAdmin/ReturnProcessModal.tsx (BARU - FULL CODE SIAP PAKAI)

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { FaTimes, FaUndo, FaMoneyBillWave, FaClock, FaCalendarAlt, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import './AdminDashboard.css'; 

// --- KONSTANTA & HELPER --
// API base & token sudah dihandle oleh adminApi interceptor

// Helper untuk format Rupiah
const formatRupiah = (amount: number) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
};

// --- INTERFACES (Diambil dari AdminDashboard) ---
interface Loan {
    id: number;
    expectedReturnDate: string;
    status: 'Menunggu Persetujuan' | 'Sedang Dipinjam' | 'Terlambat' | 'Siap Dikembalikan' | 'Dikembalikan' | 'Ditolak';
    title: string;
    kodeBuku: string;
    username: string;
    npm: string;
    calculatedPenalty?: number;
    calculatedPenaltyRupiah?: string;
    userDenda: number;
}

interface ReturnProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    loanData: Loan | null;
    onProcess: () => void; // Fungsi untuk refresh data di parent
    showStatus: (msg: string | null, err: string | null) => void;
}

const ReturnProcessModal: React.FC<ReturnProcessModalProps> = ({ isOpen, onClose, loanData, onProcess, showStatus }) => {
    const [manualFineAmount, setManualFineAmount] = useState<number>(0);
    const [totalFine, setTotalFine] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    // Hilangkan notifikasi toast admin sesuai permintaan

    useEffect(() => {
        if (loanData) {
            // Denda Otomatis dari server (sudah dihitung di loanController.getReturnsForReview)
            const autoFine = loanData.calculatedPenalty || 0; 
            setTotalFine(autoFine + manualFineAmount);
        }
    }, [loanData, manualFineAmount]);

    if (!isOpen || !loanData) return null;

    const handleManualFineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value === '' ? 0 : Number(e.target.value);
        setManualFineAmount(value >= 0 ? value : 0);
    };

    const handleProcessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await adminApi.processReturn(loanData.id, manualFineAmount);
            showStatus(response.message || 'Pengembalian diproses', null);
            onProcess(); // Refresh data di parent
            onClose();

        } catch (err) {
            const errMsg = (err as any)?.response?.data?.message || 'Gagal memproses pengembalian.';
            showStatus(null, errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',zIndex:1000}}>
            <div className="modal-content large" style={{background:'#fff',borderRadius:16,padding:'32px 32px 24px 32px',boxShadow:'0 8px 32px rgba(0,0,0,0.13)',maxWidth:480,width:'100%'}}>
                <div className="modal-header" style={{borderBottom:'1px solid #e0e0e0',marginBottom:20,paddingBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <h2 style={{fontWeight:700,display:'flex',alignItems:'center',gap:8,fontSize:22,margin:0}}><FaUndo /> Proses Pengembalian</h2>
                    <button className="close-button" onClick={onClose} disabled={isLoading} title="Tutup" style={{fontSize:22,background:'none',border:'none',color:'#888',cursor:'pointer'}}><FaTimes /></button>
                </div>
                <form onSubmit={handleProcessSubmit}>
                    <div className="modal-body" style={{display:'grid',gap:18}}>
                        <div className="loan-info-box" style={{background:'#f8fafc',borderRadius:10,padding:'18px 18px 10px 18px',marginBottom:0}}>
                            <div style={{fontWeight:600,marginBottom:8,display:'flex',alignItems:'center',gap:6}}><FaInfoCircle /> Detail Pinjaman</div>
                            <div style={{marginBottom:4}}><span style={{fontWeight:500}}>Buku:</span> <span style={{fontWeight:700}}>{loanData.title}</span> <span style={{color:'#888'}}>(Kode: {loanData.kodeBuku})</span></div>
                            <div style={{marginBottom:4}}><span style={{fontWeight:500}}>Peminjam:</span> <span style={{fontWeight:700}}>{loanData.username}</span> <span style={{color:'#888'}}>({loanData.npm})</span></div>
                            <div style={{marginBottom:4}}><span style={{fontWeight:500}}>Tgl. Kembali (Estimasi):</span> <span style={{fontWeight:700}}>{format(new Date(loanData.expectedReturnDate), 'dd MMM yyyy')}</span></div>
                            <div style={{marginBottom:4}}><span style={{fontWeight:500}}>Status Pinjaman:</span> <span className={`status-badge ${loanData.status === 'Terlambat' ? 'danger' : loanData.status === 'Siap Dikembalikan' ? 'warning' : 'info'}`} style={{fontWeight:600,padding:'2px 10px',borderRadius:6,background:loanData.status==='Terlambat'?'#ffeaea':loanData.status==='Siap Dikembalikan'?'#fffbe6':'#eaf6ff',color:loanData.status==='Terlambat'?'#c00':loanData.status==='Siap Dikembalikan'?'#b38b00':'#0056b3',marginLeft:8}}>{loanData.status}</span></div>
                            <div style={{marginBottom:0}}><span style={{fontWeight:500}}>Denda Akun User Saat Ini:</span> <span style={{fontWeight:700}}>{formatRupiah(loanData.userDenda)}</span></div>
                        </div>
                        <div className="form-group mt-3" style={{marginBottom:0}}>
                            <label style={{fontWeight:600,marginBottom:4,display:'block'}}><FaClock /> Denda Keterlambatan (Otomatis):</label>
                            <div className="auto-fine-display" style={{fontSize:16,fontWeight:700}}>
                                {loanData.calculatedPenalty && loanData.calculatedPenalty > 0 ? (
                                    <span style={{ color: '#dc3545' }}>{loanData.calculatedPenaltyRupiah}</span>
                                ) : (
                                    <span style={{ color: '#28a745' }}>{formatRupiah(0)} (Tepat Waktu)</span>
                                )}
                            </div>
                        </div>
                        <div className="form-group mt-3" style={{marginBottom:0}}>
                            <label htmlFor="manualFineAmount" style={{fontWeight:600,marginBottom:4,display:'block'}}><FaMoneyBillWave /> Denda Manual (Kerusakan/Lainnya):</label>
                            <input 
                                type="number" 
                                id="manualFineAmount" 
                                name="manualFineAmount" 
                                value={manualFineAmount} 
                                onChange={handleManualFineChange} 
                                min="0" 
                                disabled={isLoading}
                                placeholder="Masukkan jumlah denda manual (opsional)"
                                style={{width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid #ccc',fontSize:15,marginTop:2}}
                            />
                        </div>
                        <div className="total-fine-summary mt-4" style={{background:'#f4f6fa',borderRadius:10,padding:'16px 14px',marginTop:8}}>
                            <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Total Denda yang Akan Ditambahkan ke Akun User</div>
                            <div style={{fontSize:15}}>Denda Otomatis + Denda Manual = <span style={{fontWeight:700}}>{formatRupiah(totalFine)}</span></div>
                            {totalFine > 0 && (
                                <div className="warning-text" style={{marginTop:8,background:'#fffbe6',color:'#b38b00',borderRadius:6,padding:'7px 10px',fontSize:14,display:'flex',alignItems:'center',gap:6}}><FaInfoCircle /> Total denda ini akan <b>ditambahkan</b> ke saldo denda user. Status pinjaman akan berubah menjadi 'Dikembalikan'.</div>
                            )}
                        </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'center',marginTop:28}}>
                        <button type="submit" className="btn btn-primary btn-save" disabled={isLoading} style={{fontSize:17,padding:'12px 28px',borderRadius:8,boxShadow:'0 2px 8px #0056b31a',fontWeight:700,display:'flex',alignItems:'center',gap:10}}>
                            {isLoading ? 'Memproses...' : <><FaCheckCircle /> Konfirmasi Pengembalian & Proses Denda</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReturnProcessModal;