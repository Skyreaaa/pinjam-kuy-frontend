import React, { useState } from 'react';
import './AdminDashboard.css';
import { FaCheckCircle, FaTimesCircle, FaUpload, FaTimes, FaImage, FaEye } from 'react-icons/fa';

interface FinePayment {
	id: number;
	username: string;
	npm: string;
	method: string;
	amount_total: number;
	status?: string;
	created_at: string;
	proof_url?: string;
	loan_ids?: string;
	account_name?: string;
	bank_name?: string;
}

interface AdminFinePaymentsPageProps {
	finePayments: FinePayment[];
	isLoading: boolean;
	error: string | null;
	onVerify: (id: number, action: 'approve' | 'reject', proofFile?: File, notes?: string) => void;
}

// Modal Verifikasi Pembayaran Denda
const PaymentDetailModal: React.FC<{
	payment: FinePayment;
	onClose: () => void;
	onApprove: (proofFile?: File, notes?: string) => void;
	onReject: () => void;
}> = ({ payment, onClose, onApprove, onReject }) => {
	const [showCashUpload, setShowCashUpload] = useState(false);
	const [proofFile, setProofFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string>('');
	const [notes, setNotes] = useState('');

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setProofFile(file);
			setPreview(URL.createObjectURL(file));
		}
	};

	const handleCashApprove = () => {
		if (!proofFile) {
			alert('Bukti pembayaran wajib diupload!');
			return;
		}
		onApprove(proofFile, notes);
	};

	const getMethodLabel = (method: string) => {
		if (method === 'qris') return 'QRIS';
		if (method === 'bank_transfer') return 'Transfer Bank';
		if (method === 'cash') return 'Bayar di Tempat';
		return method;
	};

	// Get full proof URL
	const getProofUrl = (url?: string) => {
		if (!url) return null;
		// Already a full URL (http/https or cloudinary)
		if (url.startsWith('http')) return url;
		
		const backendUrl = process.env.REACT_APP_API_URL || 'https://pinjam-kuy-backend-production.up.railway.app';
		
		// Handle various formats:
		// - "/uploads/fine-proofs/filename" -> backendUrl + url
		// - "fine-proofs/filename" -> backendUrl + /uploads/ + url  
		// - "uploads/fine-proofs/filename" -> backendUrl + / + url
		if (url.startsWith('/uploads/')) {
			return `${backendUrl}${url}`;
		} else if (url.startsWith('uploads/')) {
			return `${backendUrl}/${url}`;
		} else if (url.startsWith('/')) {
			return `${backendUrl}${url}`;
		} else {
			// Assume it's just filename or "fine-proofs/filename"
			return `${backendUrl}/uploads/${url}`;
		}
	};

	const proofImageUrl = getProofUrl(payment.proof_url);

	return (
		<div style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			background: 'rgba(0,0,0,0.7)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			zIndex: 10000
		}} onClick={onClose}>
			<div style={{
				background: '#fff',
				borderRadius: 16,
				padding: 32,
				maxWidth: 700,
				width: '90%',
				maxHeight: '90vh',
				overflow: 'auto',
				position: 'relative',
				boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
			}} onClick={(e) => e.stopPropagation()}>
				<button 
					onClick={onClose}
					style={{
						position: 'absolute',
						top: 16,
						right: 16,
						background: 'transparent',
						border: 'none',
						fontSize: 24,
						cursor: 'pointer',
						color: '#999'
					}}
				>
					<FaTimes />
				</button>

				<h2 style={{marginBottom: 24, color: '#333'}}>Verifikasi Pembayaran Denda</h2>
				
				{/* Info Ringkas */}
				<div style={{marginBottom: 24, background: '#f9f9f9', padding: 16, borderRadius: 8}}>
					<div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
						<span style={{color: '#666'}}>User:</span>
						<span style={{fontWeight: 700}}>{payment.username} ({payment.npm})</span>
					</div>
					<div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
						<span style={{color: '#666'}}>Metode:</span>
						<span style={{fontWeight: 700}}>{getMethodLabel(payment.method)}</span>
					</div>
					<div style={{display: 'flex', justifyContent: 'space-between'}}>
						<span style={{color: '#666'}}>Total:</span>
						<span style={{fontWeight: 700, color: '#ff4d4f', fontSize: 18}}>
							{payment.amount_total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
						</span>
					</div>
				</div>

				{/* Bukti Pembayaran dari User */}
				{proofImageUrl && payment.method !== 'cash' && (
					<div style={{marginBottom: 24}}>
						<h3 style={{marginBottom: 12, color: '#333', fontSize: 16}}>📷 Bukti Pembayaran dari User:</h3>
						<div style={{
							background: '#f5f5f5',
							padding: 16,
							borderRadius: 8,
							textAlign: 'center'
						}}>
							<img 
								src={proofImageUrl} 
								alt="Bukti Pembayaran" 
								style={{
									maxWidth: '100%',
									maxHeight: 400,
									objectFit: 'contain',
									borderRadius: 8,
									border: '2px solid #e8e8e8'
								}}
								onError={(e) => {
									console.log('Image load error:', proofImageUrl);
									(e.target as HTMLImageElement).style.display = 'none';
								}}
							/>
						</div>
					</div>
				)}

				{/* Pembayaran Tunai - Admin perlu upload bukti */}
				{payment.method === 'cash' && !showCashUpload && (
					<div style={{marginBottom: 24, padding: 16, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffa940'}}>
						<p style={{color: '#d46b08', margin: 0}}>
							<strong>💵 Pembayaran Tunai</strong> - Upload bukti setelah user membayar.
						</p>
					</div>
				)}

				{payment.method === 'cash' && showCashUpload && (
					<div style={{marginBottom: 24}}>
						<h3 style={{marginBottom: 12}}>Upload Bukti Pembayaran Tunai:</h3>
						<input 
							type="file" 
							accept="image/*"
							onChange={handleFileChange}
							style={{marginBottom: 12, display: 'block', width: '100%'}}
						/>
						{preview && (
							<img 
								src={preview} 
								alt="Preview" 
								style={{
									width: '100%',
									maxHeight: 300,
									objectFit: 'contain',
									borderRadius: 8,
									border: '2px solid #f0f0f0',
									marginBottom: 12
								}}
							/>
						)}
						<textarea 
							placeholder="Catatan (opsional)"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							style={{
								width: '100%',
								minHeight: 80,
								padding: 12,
								borderRadius: 8,
								border: '1px solid #d9d9d9',
								fontFamily: 'inherit',
								fontSize: 14
							}}
						/>
					</div>
				)}

				<div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
					{payment.method === 'cash' && !showCashUpload ? (
						<button
							onClick={() => setShowCashUpload(true)}
							style={{
								background: 'linear-gradient(135deg, #52c41a, #73d13d)',
								color: '#fff',
								border: 'none',
								padding: '12px 24px',
								borderRadius: 8,
								cursor: 'pointer',
								fontWeight: 600,
								fontSize: 15
							}}
						>
							<FaUpload style={{marginRight: 8}} />
							Upload & Verifikasi
						</button>
					) : payment.method === 'cash' && showCashUpload ? (
						<>
							<button
								onClick={() => setShowCashUpload(false)}
								style={{
									background: '#f5f5f5',
									color: '#666',
									border: '1px solid #d9d9d9',
									padding: '12px 24px',
									borderRadius: 8,
									cursor: 'pointer',
									fontWeight: 600
								}}
							>
								Batal
							</button>
							<button
								onClick={handleCashApprove}
								style={{
									background: 'linear-gradient(135deg, #52c41a, #73d13d)',
									color: '#fff',
									border: 'none',
									padding: '12px 24px',
									borderRadius: 8,
									cursor: 'pointer',
									fontWeight: 600
								}}
							>
								<FaCheckCircle style={{marginRight: 8}} />
								Verifikasi Pembayaran
							</button>
						</>
					) : (
						<>
							<button
								onClick={onReject}
								style={{
									background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
									color: '#fff',
									border: 'none',
									padding: '12px 24px',
									borderRadius: 8,
									cursor: 'pointer',
									fontWeight: 600
								}}
							>
								<FaTimesCircle style={{marginRight: 8}} />
								Tolak
							</button>
							<button
								onClick={() => onApprove()}
								style={{
									background: 'linear-gradient(135deg, #52c41a, #73d13d)',
									color: '#fff',
									border: 'none',
									padding: '12px 24px',
									borderRadius: 8,
									cursor: 'pointer',
									fontWeight: 600
								}}
							>
								<FaCheckCircle style={{marginRight: 8}} />
								Setujui
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

// Modal Reject Reason
const RejectReasonModal: React.FC<{
	onClose: () => void;
	onSubmit: (reason: string) => void;
}> = ({ onClose, onSubmit }) => {
	const [reason, setReason] = useState('');

	const handleSubmit = () => {
		if (!reason.trim()) {
			alert('Alasan penolakan wajib diisi!');
			return;
		}
		onSubmit(reason);
	};

	return (
		<div style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			background: 'rgba(0,0,0,0.7)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			zIndex: 10001
		}} onClick={onClose}>
			<div style={{
				background: '#fff',
				borderRadius: 16,
				padding: 32,
				maxWidth: 500,
				width: '90%',
				boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
			}} onClick={(e) => e.stopPropagation()}>
				<h2 style={{marginBottom: 16, color: '#ff4d4f'}}>Alasan Penolakan</h2>
				<p style={{color: '#666', marginBottom: 16}}>
					Mohon berikan alasan mengapa pembayaran ini ditolak:
				</p>
				<textarea 
					placeholder="Contoh: Bukti pembayaran tidak jelas..."
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					autoFocus
					style={{
						width: '100%',
						minHeight: 120,
						padding: 12,
						borderRadius: 8,
						border: '2px solid #ff4d4f',
						fontFamily: 'inherit',
						fontSize: 14,
						marginBottom: 16
					}}
				/>
				<div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
					<button
						onClick={onClose}
						style={{
							background: '#f5f5f5',
							color: '#666',
							border: '1px solid #d9d9d9',
							padding: '12px 24px',
							borderRadius: 8,
							cursor: 'pointer',
							fontWeight: 600
						}}
					>
						Batal
					</button>
					<button
						onClick={handleSubmit}
						style={{
							background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
							color: '#fff',
							border: 'none',
							padding: '12px 24px',
							borderRadius: 8,
							cursor: 'pointer',
							fontWeight: 600
						}}
					>
						<FaTimesCircle style={{marginRight: 8}} />
						Tolak Pembayaran
					</button>
				</div>
			</div>
		</div>
	);
};

const AdminFinePaymentsPage: React.FC<AdminFinePaymentsPageProps> = ({ finePayments, isLoading, error, onVerify }) => {
	const [selectedPayment, setSelectedPayment] = useState<FinePayment | null>(null);
	const [showRejectModal, setShowRejectModal] = useState(false);

	const handleApprove = (proofFile?: File, notes?: string) => {
		if (selectedPayment) {
			onVerify(selectedPayment.id, 'approve', proofFile, notes);
			setSelectedPayment(null);
		}
	};

	const handleRejectClick = () => {
		setShowRejectModal(true);
	};

	const handleRejectSubmit = (reason: string) => {
		if (selectedPayment) {
			onVerify(selectedPayment.id, 'reject', undefined, reason);
			setSelectedPayment(null);
			setShowRejectModal(false);
		}
	};

	return (
		<div className="admin-sub-view">
			<h2>Pembayaran Denda</h2>
			{isLoading ? <p className="loading-bar">Memuat data...</p> : null}
			{error ? <div className="status-container error"><p className="status-message error">{error}</p></div> : null}
			
			{!isLoading && !error && finePayments.length === 0 && (
				<div style={{padding: '40px 20px', textAlign: 'center', color: '#666'}}>
					<p style={{fontSize: 16}}>✅ Tidak ada pembayaran denda menunggu verifikasi.</p>
				</div>
			)}
			
			{!isLoading && finePayments.length > 0 && (
				<div className="table-responsive">
					<table className="admin-list-table">
					<thead>
						<tr>
							<th>Tanggal</th>
							<th>User</th>
							<th>Jumlah</th>
							<th>Metode</th>
							<th>Loan IDs</th>
							<th>Aksi</th>
						</tr>
					</thead>
					<tbody>
						{finePayments.map(item => (
							<tr key={item.id} style={{cursor: 'pointer'}} onClick={() => setSelectedPayment(item)}>
								<td>{new Date(item.created_at).toLocaleString('id-ID')}</td>
								<td><strong>{item.username}</strong><p className="sub-text">{item.npm}</p></td>
								<td><strong style={{color: '#ff4d4f'}}>{item.amount_total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</strong></td>
								<td>
									{item.method === 'cash' ? '💵 Tunai' : 
									 item.method === 'qris' ? '📱 QRIS' : 
									 '🏦 Transfer Bank'}
								</td>
								<td>{(() => { try { const arr = JSON.parse(item.loan_ids || '[]'); return Array.isArray(arr) ? arr.join(', ') : item.loan_ids; } catch { return item.loan_ids; } })()}</td>
								<td style={{display:'flex',gap:8,justifyContent:'center'}} onClick={(e) => e.stopPropagation()}>
									<button 
										className="btn btn-action-small btn-primary" 
										title="Lihat Detail" 
										onClick={(e) => {
											e.stopPropagation();
											setSelectedPayment(item);
										}}
										style={{
											background: 'linear-gradient(135deg, #1890ff, #096dd9)',
											border: 'none',
											color: '#fff',
											padding: '8px 16px',
											borderRadius: 6,
											cursor: 'pointer',
											fontWeight: 600
										}}
									>
										<FaEye style={{marginRight:4}}/> Detail
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			)}

			{selectedPayment && !showRejectModal && (
				<PaymentDetailModal 
					payment={selectedPayment}
					onClose={() => setSelectedPayment(null)}
					onApprove={handleApprove}
					onReject={handleRejectClick}
				/>
			)}

			{showRejectModal && (
				<RejectReasonModal 
					onClose={() => {
						setShowRejectModal(false);
						setSelectedPayment(null);
					}}
					onSubmit={handleRejectSubmit}
				/>
			)}
		</div>
	);
};

export default AdminFinePaymentsPage;
