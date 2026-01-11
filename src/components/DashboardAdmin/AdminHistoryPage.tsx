import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaClock, FaTimes } from 'react-icons/fa';
import DateRangeModal from './DateRangeModal';
import EmptyState from '../common/EmptyState';
import './AdminDashboard.css';
import { FaHistory, FaCheckCircle, FaTimesCircle, FaMoneyBillWave, FaUndo } from 'react-icons/fa';
import { adminApi } from '../../services/api';

interface HistoryItem {
	id: number;
	loanDate: string;
	expectedReturnDate?: string;
	actualReturnDate?: string;
	status: string;
	fineAmount?: number;
	finePaid?: number;
	fineAmountRupiah?: string;
	finePaidRupiah?: string;
	returnProofUrl?: string | null;
	returnProofMetadata?: string | null;
	readyReturnDate?: string | null;
	approvedAt?: string | null;
	returnDecision?: string | null;
	rejectionReason?: string | null;
	createdAt?: string | null;
	title: string;
	kodeBuku: string;
	author: string;
	username: string;
	npm: string;
	fakultas: string;
	angkatan?: string;
}

interface AdminHistoryPageProps {
	onShowProof?: (url: string, context?: any) => void;
}

const AdminHistoryPage: React.FC<AdminHistoryPageProps> = ({ onShowProof }) => {
	const [proofModal, setProofModal] = useState<{ url: string, meta?: any, context?: any } | null>(null);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	// Filter states
	const [search, setSearch] = useState('');
	const [kategori, setKategori] = useState<'all'|'pengembalian'|'denda'>('all');
	const [dateFilter, setDateFilter] = useState<'all'|'today'|'thisMonth'|'thisYear'>('all');
	const [angkatan, setAngkatan] = useState('');
	const [npmSearch, setNpmSearch] = useState('');
	const [showDateModal, setShowDateModal] = useState(false);
	
	// Fetch history with filters
	const fetchHistory = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (dateFilter !== 'all') params.append('dateFilter', dateFilter);
			if (angkatan) params.append('angkatan', angkatan);
			if (npmSearch.trim()) params.append('npm', npmSearch.trim());
			
			console.log('[ADMIN HISTORY] Fetching with params:', params.toString());
			const data = await adminApi.get(`/history-all?${params.toString()}`);
			setHistory(data || []);
		} catch (e: any) {
			console.error('[ADMIN HISTORY] Error:', e);
			setError(e.response?.data?.message || e.message || 'Gagal memuat riwayat');
		} finally {
			setIsLoading(false);
		}
	};
	
	// Initial fetch
	useEffect(() => {
		fetchHistory();
	}, []);
	
	// Refetch when filters change
	const handleApplyFilters = () => {
		fetchHistory();
	};

	// Client-side filter for kategori and username search
	const filtered = history.filter(item => {
		// Filter kategori
		if (kategori === 'pengembalian' && item.fineAmount && item.fineAmount > 0) return false;
		if (kategori === 'denda' && (!item.fineAmount || item.fineAmount === 0)) return false;
		// Filter search (username)
		const searchLower = search.trim().toLowerCase();
		if (searchLower && !item.username.toLowerCase().includes(searchLower)) return false;
		return true;
	});

	return (
		<div className="admin-sub-view">
			<h2><FaHistory /> Riwayat Aktivitas Pengguna</h2>
			<p className="info-text">Semua aktivitas pengembalian dan pembayaran denda yang sudah selesai. Klik bukti untuk melihat foto.</p>
			
			{/* Server-side filters */}
			<div style={{display:'flex',gap:12,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
				<div style={{flex:'1 1 200px',minWidth:200}}>
					<label style={{display:'block',fontSize:13,marginBottom:4,fontWeight:500}}>Tanggal:</label>
					<select className="date-filter-input" style={{width:'100%'}} value={dateFilter} onChange={e=>setDateFilter(e.target.value as any)}>
						<option value="all">Semua</option>
						<option value="today">Hari ini</option>
						<option value="thisMonth">Bulan ini</option>
						<option value="thisYear">Tahun ini</option>
					</select>
				</div>
				<div style={{flex:'1 1 150px',minWidth:150}}>
					<label style={{display:'block',fontSize:13,marginBottom:4,fontWeight:500}}>Angkatan:</label>
					<input 
						type="text" 
						className="admin-search-input" 
						style={{width:'100%'}} 
						placeholder="e.g. 2020" 
						value={angkatan} 
						onChange={e=>setAngkatan(e.target.value)} 
					/>
				</div>
				<div style={{flex:'1 1 200px',minWidth:200}}>
					<label style={{display:'block',fontSize:13,marginBottom:4,fontWeight:500}}>Cari NPM:</label>
					<input 
						type="text" 
						className="admin-search-input" 
						style={{width:'100%'}} 
						placeholder="Masukkan NPM..." 
						value={npmSearch} 
						onChange={e=>setNpmSearch(e.target.value)} 
					/>
				</div>
				<button className="btn btn-primary" onClick={handleApplyFilters} style={{flex:'0 0 auto'}}>
					Terapkan Filter
				</button>
			</div>
			
			{/* Client-side filters */}
			<div style={{display:'flex',gap:16,alignItems:'center',marginBottom:12}}>
				<input 
					className="admin-search-input" 
					style={{flex:1,maxWidth:300}} 
					type="text" 
					placeholder="Cari nama user..." 
					value={search} 
					onChange={e=>setSearch(e.target.value)} 
				/>
			</div>
			<div className="tab-filter-group" style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
				<button className={`btn btn-tab${kategori==='all'?' btn-tab-active':''}`} onClick={()=>setKategori('all')} aria-pressed={kategori==='all'}>Semua Kategori</button>
				<button className={`btn btn-tab${kategori==='pengembalian'?' btn-tab-active':''}`} onClick={()=>setKategori('pengembalian')} aria-pressed={kategori==='pengembalian'}>Pengembalian Buku</button>
				<button className={`btn btn-tab${kategori==='denda'?' btn-tab-active':''}`} onClick={()=>setKategori('denda')} aria-pressed={kategori==='denda'}>Pembayaran Denda</button>
			</div>
				{isLoading ? <p className="loading-bar">Memuat data...</p> : null}
				{error ? <div className="status-container error"><p className="status-message error">{error}</p></div> : null}
				<div className="table-responsive">
					<table className="admin-list-table">
						<thead>
							<tr>
								<th>Status</th>
								<th>Buku</th>
								<th>User</th>
								<th>Username</th>
								<th>NPM</th>
								<th>Tgl. Pinjam</th>
								<th>Tgl. Kembali</th>
								<th>Denda</th>
								<th>Bukti</th>
							</tr>
						</thead>
						<tbody>
							{filtered.length === 0 && !isLoading ? (
							<tr><td colSpan={9} style={{padding: 0}}>
								<EmptyState
									icon="📋"
									title="Belum ada riwayat"
									description="Riwayat peminjaman dan pengembalian akan muncul di sini"
								/>
							</td></tr>
							) : filtered.map(item => (
								<tr key={item.id}>
									<td>
										<span className={`status-badge status-${item.status === 'Dikembalikan' ? 'returned' : item.status === 'Ditolak' ? 'rejected' : ''}`}>
											{item.status === 'Dikembalikan' ? <FaCheckCircle style={{marginRight:4}}/> : item.status === 'Ditolak' ? <FaTimesCircle style={{marginRight:4}}/> : null}
											{item.status}
										</span>
									</td>
									<td>
										<strong>{item.title}</strong>
										<p className="sub-text">{item.kodeBuku}</p>
									</td>
									<td>
										<strong>{item.username}</strong>
										<p className="sub-text">{item.fakultas}</p>
									</td>
									<td>{item.username}</td>
									<td>{item.npm}</td>
									<td>{item.loanDate ? new Date(item.loanDate).toLocaleDateString('id-ID') : '-'}</td>
									<td>{item.actualReturnDate ? new Date(item.actualReturnDate).toLocaleString('id-ID') : (item.approvedAt ? new Date(item.approvedAt).toLocaleString('id-ID') : '-')}</td>
									<td>
										{item.fineAmount && item.fineAmount > 0 ? (
											<div>
												<strong>{item.fineAmountRupiah}</strong>
												<p className="sub-text">Dibayar: {item.finePaidRupiah}</p>
											</div>
										) : '-'}
									</td>
									<td>
										 {item.returnProofUrl ? (
												 <button className="btn btn-outline btn-compact" onClick={() => {
													 let meta = null;
													 try {
														 if (item.returnProofMetadata && typeof item.returnProofMetadata === 'string') {
															 meta = JSON.parse(item.returnProofMetadata);
														 }
													 } catch {}
													 setProofModal({ url: item.returnProofUrl!, meta, context: item });
												 }}>
														 Lihat Bukti
												 </button>
										 ) : <span className="text-muted">-</span>}
										{/* Modal Bukti Pengembalian */}
										{proofModal && (
											<div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
												<div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 6px 32px #0003', padding: 28, minWidth: 320, maxWidth: '95vw', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
													<button onClick={() => setProofModal(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }}><FaTimes /></button>
													<h3 style={{ marginBottom: 12, color: '#1a3263' }}>Bukti Pengembalian</h3>
													<img src={proofModal.url} alt="Bukti Pengembalian" style={{ maxWidth: 260, maxHeight: 260, borderRadius: 10, boxShadow: '0 2px 8px #0001', marginBottom: 12 }} />
													{proofModal.meta && (
														<div style={{ marginTop: 8, fontSize: 15, color: '#1a3263', textAlign: 'left', width: '100%' }}>
															<div><FaMapMarkerAlt style={{marginRight:4}}/> Lokasi: {proofModal.meta.lat && proofModal.meta.lng ? `${proofModal.meta.lat.toFixed(5)}, ${proofModal.meta.lng.toFixed(5)}` : '-'}</div>
															<div><FaClock style={{marginRight:4}}/> Waktu: {proofModal.meta.time || '-'}</div>
															{proofModal.meta.accuracy && <div>Akurasi: ±{proofModal.meta.accuracy}m</div>}
														</div>
													)}
												</div>
											</div>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
};

export default AdminHistoryPage;
