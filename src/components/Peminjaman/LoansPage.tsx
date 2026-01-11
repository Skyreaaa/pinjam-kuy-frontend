
import './LoansPage.css';
import sipLogo from '../../assets/sip.png';
import logoApp from '../../assets/Logo.png';
// Modern LoansPage component (restored after accidental deletion)

// Modern LoansPage component (restored after accidental deletion)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt, FaListUl, FaHistory, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaMoneyBillWave } from 'react-icons/fa';
import UploadReturnProofModal from './UploadReturnProofModal';
import { loanApi, userApi } from '../../services/api';
import { Loan } from '../../types';
import QRCodeDisplay from '../common/QRCodeDisplay';
import { getSocket } from '../../services/socket';
import { mapStatus, isQRReady, canUploadReturnProof, getStatusClass } from '../../utils/statusMapping';

const LoansPage: React.FC = () => {
	const [loans, setLoans] = useState<Loan[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
	const [qrModalLoan, setQrModalLoan] = useState<Loan | null>(null);
	const [uploadModalLoan, setUploadModalLoan] = useState<Loan | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [cancelModalLoan, setCancelModalLoan] = useState<Loan | null>(null);
	const [cancelLoading, setCancelLoading] = useState(false);
	const navigate = useNavigate();

	// Live timer for QR validity
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	// Fetch loans on mount
	const fetchLoans = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await loanApi.userLoans();
			// Map LoanDto[] to Loan[]
			setLoans(data.map((item: any) => ({
				id: item.id,
				kodePinjam: item.kodePinjam ?? '',
				bookTitle: item.bookTitle ?? '',
				kodeBuku: item.kodeBuku,
				loanDate: item.loanDate,
				returnDate: item.returnDate || item.expectedReturnDate || '',
				status: item.status,
				penaltyAmount: item.penaltyAmount ?? item.fineAmount,
				actualReturnDate: item.actualReturnDate,
				borrowerName: item.borrowerName,
				location: item.location,
				// Tambahan untuk buku digital
				lampiran: item.lampiran,
				attachment_url: item.attachment_url,
			})));
		} catch (e: any) {
			setError('Gagal memuat data pinjaman');
		}
		setIsLoading(false);
	};
	useEffect(() => {
		fetchLoans();
		
		// Listen for Socket.IO notification events that might update loan status
		const socket = getSocket();
		const handleNotification = (data: any) => {
			console.log('[LOANS PAGE] Socket notification received:', data);
			// If notification is about loan status change, refresh loans
			if (data.loanId || data.message?.includes('diambil') || data.message?.includes('Buku')) {
				console.log('[LOANS PAGE] Refreshing loans due to notification');
				fetchLoans();
			}
		};
		
		socket.on('notification', handleNotification);
		
		return () => {
			socket.off('notification', handleNotification);
		};
		// eslint-disable-next-line
	}, []);

	// Fungsi upload bukti pengembalian - upload ke backend, backend upload ke Cloudinary
	const handleUploadProof = async (file: File, meta: { lat: number; lng: number; accuracy: number; time: string }) => {
		if (!uploadModalLoan) return;
		setUploading(true);
		setUploadProgress(0);
		setUploadSuccess(false);
		
		try {
			console.log('[UPLOAD] Preparing upload to backend...');
			setUploadProgress(10);
			
			// Upload file + metadata ke backend
			const formData = new FormData();
			formData.append('proofPhoto', file);
			formData.append('latitude', meta.lat.toString());
			formData.append('longitude', meta.lng.toString());
			formData.append('accuracy', meta.accuracy.toString());
			formData.append('captureTime', meta.time);
			
			setUploadProgress(30);
			
			console.log('[UPLOAD] Uploading to backend:', {
				loanId: uploadModalLoan.id,
				fileSize: file.size,
				fileType: file.type
			});
			
			// Simulasi progress untuk UX yang lebih baik
			const progressInterval = setInterval(() => {
				setUploadProgress(prev => {
					if (prev < 80) return prev + 10;
					return prev;
				});
			}, 300);
			
			// Use loanApi instead of hardcoded fetch
			const metadata = {
				lat: meta.lat,
				lng: meta.lng,
				accuracy: meta.accuracy,
				time: meta.time
			};
		const data = await loanApi.markReadyToReturn(Number(uploadModalLoan.id), file, metadata);
			
			if (data.success) {
				setUploadProgress(100);
				setUploadSuccess(true);
				
				// Tunggu 2 detik untuk show success modal
				setTimeout(() => {
					setUploadModalLoan(null);
					setUploadSuccess(false);
					setUploadProgress(0);
					fetchLoans();
				}, 2000);
			} else {
				setUploadProgress(0);
				alert(data.message || 'Gagal menyimpan bukti pengembalian');
			}
		} catch (e) {
			console.error('[UPLOAD] Upload error:', e);
			setUploadProgress(0);
			alert('Gagal upload bukti pengembalian');
		}
		setUploading(false);
	};

	// Filter loans for active and history
	// Tab Aktif: Menunggu Persetujuan, Disetujui, Diambil, Sedang Dipinjam, Terlambat
	// Tab Riwayat: Siap Dikembalikan (sudah upload bukti), Dikembalikan, Selesai, Ditolak
	const activeLoans = loans.filter(l => 
		l.status !== 'Selesai' && 
		l.status !== 'Ditolak' && 
		l.status !== 'Siap Dikembalikan' &&
		l.status !== 'Dikembalikan'
	);
	const historyLoans = loans.filter(l => 
		l.status === 'Selesai' || 
		l.status === 'Ditolak' || 
		l.status === 'Siap Dikembalikan' ||
		l.status === 'Dikembalikan'
	);

	// LoanList component (inline for now)
	const LoanList = ({ loans, emptyMsg, onShowQr, setUploadModalLoan, now }: any) => (
		<>
			{loans.length === 0 ? (
				<div style={{ color: '#888', textAlign: 'center', margin: '32px 0' }}>{emptyMsg}</div>
			) : (
				loans.map((loan: Loan & { lampiran?: string; attachment_url?: string }) => {
					// Cek apakah buku digital (harus return boolean)
					const isDigitalBook = !!(loan.lampiran && loan.lampiran !== 'Tidak Ada' && loan.attachment_url);
					console.log('DEBUG: Digital Book Check', {
						id: loan.id,
						lampiran: loan.lampiran,
						attachment_url: loan.attachment_url,
						condition1: !!loan.lampiran,
						condition2: loan.lampiran !== 'Tidak Ada',
						condition3: !!loan.attachment_url,
						isDigitalBook
					});
					
					// DEBUG: Log status untuk debugging
					console.log('DEBUG Loan:', {
						id: loan.id,
						title: loan.bookTitle,
						status: loan.status,
						isDigitalBook,
						isQRReady: isQRReady(loan.status),
						loanDate: loan.loanDate,
						lampiran: loan.lampiran,
						attachment_url: loan.attachment_url,
						qrExpired,
						timeLeft,
						onShowQr: !!onShowQr
					});
					
					// Cek QR expiry untuk auto-cancel
					let qrExpired = false;
					let timeLeft = '';
					if (!isDigitalBook && isQRReady(loan.status) && loan.loanDate) {
						const loanTime = new Date(loan.loanDate).getTime();
						const expiry = loanTime + 24 * 60 * 60 * 1000;
						const msLeft = expiry - now;
						qrExpired = msLeft <= 0;
						
						if (msLeft > 0) {
							const hours = Math.floor(msLeft / (1000 * 60 * 60));
							const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
							const seconds = Math.floor((msLeft % (1000 * 60)) / 1000);
							timeLeft = `${hours}j ${minutes}m ${seconds}s`;
						}
					}
					
					// Handler untuk download file
					const handleDownload = async (url: string, filename: string) => {
						try {
							const response = await fetch(url);
							const blob = await response.blob();
							const blobUrl = window.URL.createObjectURL(blob);
							const link = document.createElement('a');
							link.href = blobUrl;
							link.download = filename;
							document.body.appendChild(link);
							link.click();
							document.body.removeChild(link);
							window.URL.revokeObjectURL(blobUrl);
						} catch (error) {
							window.open(url, '_blank');
						}
					};
					
					return (
						<div key={loan.id} className="loan-card-v5 modern-redesign">
							<div className="loan-card-header">
								<div className="loan-title">
									{loan.bookTitle || <span style={{color:'#bbb'}}>Judul tidak tersedia</span>}
									{isDigitalBook && <span style={{marginLeft:8,fontSize:'0.75rem',background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',color:'#fff',padding:'2px 8px',borderRadius:12,fontWeight:600}}>Digital</span>}
								</div>
								<span className={`loan-status ${getStatusClass(loan.status)}`}>{mapStatus(loan.status)}</span>
							</div>
							<div className="loan-card-body">
								<div className="loan-kode">Kode: <b>{loan.kodePinjam}</b></div>
								<div className="loan-info-row"><FaCalendarAlt style={{marginRight:4}}/> Dipinjam: {loan.loanDate}</div>
								{!isDigitalBook && loan.returnDate && (
									<div className="loan-info-row"><FaClock style={{marginRight:4}}/> Harus Kembali: {loan.returnDate}</div>
								)}
								{loan.location && !isDigitalBook && (
									<div className="loan-info-row"><FaMapMarkerAlt style={{marginRight:4}}/> <span>Lokasi Rak:</span> <span style={{ textDecoration: 'underline', fontWeight: 700 }}>{loan.location}</span></div>
								)}
								{typeof loan.penaltyAmount === 'number' && loan.penaltyAmount > 0 && (
									<div className="loan-info-row"><FaMoneyBillWave style={{marginRight:4}}/> <span>Denda:</span> <b>Rp {loan.penaltyAmount.toLocaleString('id-ID')}</b></div>
								)}
								{/* QR Timer - HANYA untuk buku fisik status pending (Disetujui) */}
								{!isDigitalBook && isQRReady(loan.status) && timeLeft && (
									<div className="qr-validity" style={{background:'#e3f2fd',padding:'8px 12px',borderRadius:8,marginTop:8,fontSize:'0.9rem',fontWeight:600,color:'#1976d2',textAlign:'center'}}>
										⏰ QR berlaku: {timeLeft}
									</div>
								)}
								{!isDigitalBook && isQRReady(loan.status) && qrExpired && (
									<div className="qr-expired" style={{background:'#ffebee',padding:'8px 12px',borderRadius:8,marginTop:8,fontSize:'0.9rem',fontWeight:600,color:'#c62828',textAlign:'center'}}>
										⚠️ QR Expired - Peminjaman dibatalkan
									</div>
								)}
							</div>
							<div className="loan-card-actions" style={{display:'flex',flexDirection:'column',gap:8}}>
								{/* DEBUG: Test buttons - always show for debugging */}
								<button className="loan-action-btn" style={{background:'#2196f3'}}>
									🔍 DEBUG: Tunjukkan QR Test
								</button>
								<button className="loan-action-btn" style={{background:'#e74c3c'}}>
									❌ DEBUG: Batalkan Test  
								</button>
								
								{/* Button untuk buku digital: Download File */}
								{isDigitalBook && loan.attachment_url && (
									<button 
										onClick={() => handleDownload(loan.attachment_url!, `${loan.bookTitle}.${loan.lampiran?.toLowerCase() || 'file'}`)}
										className="loan-action-btn"
										style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}
									>
										📥 Download File ({loan.lampiran})
									</button>
								)}
								
								{/* Buttons untuk buku fisik */}
								{!isDigitalBook && (
									<>
										{console.log('DEBUG: Inside physical book buttons block for loan', loan.id)}
										{/* Button Tunjukkan QR - untuk status pending (Disetujui) dan belum expired */}
										{onShowQr && isQRReady(loan.status) && !qrExpired ? (
											<>
												{console.log('DEBUG: QR button should render for loan', loan.id)}
												<button 
													className="loan-action-btn" 
													style={{background:'#2196f3'}} 
													onClick={() => onShowQr(loan)}
												>
													🔍 Tunjukkan Kode Pinjam
												</button>
											</>
										) : (
											console.log('DEBUG: QR button NOT rendered for loan', loan.id, {
												onShowQr: !!onShowQr,
												isQRReady: isQRReady(loan.status),
												qrExpired
											})
										)}
										
										{/* Button Upload Bukti - untuk status dipinjam (Sedang Dipinjam) */}
										{setUploadModalLoan && canUploadReturnProof(loan.status) && (
											<button 
												className="loan-action-btn" 
												style={{background:'#4caf50'}} 
												onClick={() => setUploadModalLoan(loan)}
											>
												📸 Upload Bukti Pengembalian
											</button>
										)}
										
										{/* Button Cancel - untuk status pending (Disetujui) */}
										{isQRReady(loan.status) ? (
											<>
												{console.log('DEBUG: Cancel button should render for loan', loan.id)}
												<button
													className="loan-action-btn"
													style={{background:'#e74c3c'}}
													onClick={() => setCancelModalLoan(loan)}
												>
													❌ Batalkan Peminjaman
												</button>
											</>
										) : (
											console.log('DEBUG: Cancel button NOT rendered for loan', loan.id, {
												isQRReady: isQRReady(loan.status),
												status: loan.status
											})
										)}
										{/* Modal Konfirmasi Batalkan Peminjaman */}
										{cancelModalLoan && (
											<div className="modal-overlay-v5" style={{zIndex:10001}}>
												<div className="qr-modal-v5" style={{position:'relative',maxWidth:380}}>
													<button className="close-button-v5" onClick={() => setCancelModalLoan(null)} style={{ position: 'absolute', top: 12, right: 12 }}>×</button>
													<h3>Konfirmasi Pembatalan</h3>
													<div style={{margin:'18px 0',fontSize:16}}>Anda yakin ingin membatalkan peminjaman buku <b>{cancelModalLoan.bookTitle}</b>?</div>
													<div style={{display:'flex',gap:12,justifyContent:'center'}}>
														<button
															className="loan-action-btn"
															style={{background:'#e74c3c',minWidth:120,fontWeight:700}}
															disabled={cancelLoading}
															onClick={async () => {
																setCancelLoading(true);
																try {
																	await userApi.post(`/loans/${cancelModalLoan.id}/cancel`);
																	setCancelModalLoan(null);
																	fetchLoans();
																} catch (error) {
																	alert('Gagal membatalkan peminjaman');
																}
																setCancelLoading(false);
															}}
														>
															Ya, Batalkan
														</button>
														<button
															className="loan-action-btn"
															style={{background:'#888',minWidth:100,fontWeight:700}}
															disabled={cancelLoading}
															onClick={() => setCancelModalLoan(null)}
														>
															Tidak Jadi
														</button>
													</div>
												</div>
											</div>
										)}
									</>
								)}
							</div>
						</div>
					);
				})
			)}
		</>
	);

	return (
		<>
			<div className="loans-page-wrapper-v5" style={{ minHeight: '100vh', background: '#f7f8fa' }}>
				{/* BACK BUTTON */}
				<button
					className="back-button-v5"
					style={{ position: 'absolute', top: 24, left: 24, zIndex: 100 }}
					onClick={() => navigate('/borrowing-page')}
					title="Kembali ke Peminjaman"
					aria-label="Kembali"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a3263" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
				</button>
				{/* HEADER */}
				   <div className="loans-header-v5">
					   <img src={sipLogo} alt="Pinjam Kuy" />
					   <h2>Pinjaman Saya</h2>
				   </div>
				<div className="loans-page-container-v5" style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
					{/* TAB + BUTTONS */}
					<div className="loans-tabs-v5" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
						<div style={{display: 'flex', gap: 24}}>
							<button
								className={activeTab === 'aktif' ? 'tab-active-v5' : 'tab-inactive-v5'}
								onClick={() => setActiveTab('aktif')}
								style={{ background: 'none', border: 'none', color: activeTab === 'aktif' ? '#1a3263' : '#888', fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
							>
								<FaListUl /> Aktif ({activeLoans.length})
							</button>
							<button
								className={activeTab === 'riwayat' ? 'tab-active-v5' : 'tab-inactive-v5'}
								onClick={() => setActiveTab('riwayat')}
								style={{ background: 'none', border: 'none', color: activeTab === 'riwayat' ? '#1a3263' : '#888', fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
							>
								<FaHistory /> Riwayat ({historyLoans.length})
							</button>
						</div>
						
						{/* ACTION BUTTONS */}
						<div style={{display: 'flex', gap: 12}}>
							<button 
								style={{ 
									display: 'flex', 
									alignItems: 'center', 
									gap: 8, 
									background: 'linear-gradient(135deg, #ff4d4f, #ff7875)', 
									border: 'none', 
									color: '#fff',
									borderRadius: 8, 
									padding: '8px 16px', 
									fontWeight: 600, 
									cursor: 'pointer',
									boxShadow: '0 2px 8px rgba(255,77,79,0.3)',
									transition: 'all 0.3s'
								}}
								onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
								onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
							>
								<FaSyncAlt /> Refresh
							</button>
						</div>
					</div>
					<hr style={{ border: 'none', borderTop: '3px solid #234', margin: '16px 0' }} />
					{/* LIST */}
					{isLoading ? (
						<p>Memuat data pinjaman...</p>
					) : error ? (
						<p style={{ color: 'red', fontWeight: 600, fontSize: 16, margin: '32px 0' }}>{error}</p>
					) : activeTab === 'aktif' ? (
						<LoanList
							loans={activeLoans}
							emptyMsg={'Tidak ada pinjaman aktif.'}
							onShowQr={setQrModalLoan}
							setUploadModalLoan={setUploadModalLoan}
							now={now}
						/>
					) : (
						<LoanList
							loans={historyLoans}
							emptyMsg={'Belum ada riwayat pinjaman.'}
							onShowQr={setQrModalLoan}
							now={now}
						/>
					)}
				</div>
				{/* Modal Upload Proof */}
				<UploadReturnProofModal
					open={!!uploadModalLoan}
					onClose={() => setUploadModalLoan(null)}
					onUpload={handleUploadProof}
					uploading={uploading}
					uploadProgress={uploadProgress}
					uploadSuccess={uploadSuccess}
				/>
				{/* Modal QR Code Overlay */}
				{qrModalLoan && (
					<div className="modal-overlay-v5" style={{ zIndex: 10001 }}>
						<div className="qr-modal-v5" style={{position:'relative'}}>
							<button className="close-button-v5" onClick={() => setQrModalLoan(null)} style={{ position: 'absolute', top: 12, right: 12 }}>×</button>
							<h3>Kode Peminjaman Anda</h3>
							<div className="qr-content-box">
								<div className="loan-code-display" style={{color:'#e53935',marginBottom:10,fontWeight:700,fontSize:'1.2rem'}}>{qrModalLoan.kodePinjam}</div>
								<QRCodeDisplay value={qrModalLoan.kodePinjam} size={220} />
								<div className="qr-actions">
									<button className="btn-copy-qr" onClick={() => {navigator.clipboard.writeText(qrModalLoan.kodePinjam)}}>Salin Kode</button>
									<button className="btn-download-qr" onClick={async () => {
										try {
											const qrSize = 2400; // Increased size for better quality
											const margin = 200;
											const logoSize = 480;
											const canvas = document.createElement('canvas');
											canvas.width = qrSize;
											canvas.height = qrSize;
											const ctx = canvas.getContext('2d');
											if (!ctx) return;
											
											// White background
											ctx.fillStyle = '#fff';
											ctx.fillRect(0, 0, qrSize, qrSize);
											
											// Get QR canvas - cari canvas di dalam QRCodeDisplay
											const qrCanvas = document.querySelector('.qr-modal-v5 canvas') as HTMLCanvasElement;
											if (!qrCanvas) {
												alert('QR Code tidak ditemukan');
												return;
											}
											
											// Draw QR code
											ctx.drawImage(qrCanvas, margin, margin, qrSize - 2*margin, qrSize - 2*margin);
											
											// Load and draw logo in center
											const logo = new window.Image();
											logo.crossOrigin = 'anonymous';
											logo.src = logoApp;
											
											await new Promise<void>((resolve, reject) => {
												logo.onload = () => resolve();
												logo.onerror = () => reject(new Error('Logo gagal dimuat'));
												setTimeout(() => reject(new Error('Timeout')), 3000);
											});
											
											// Draw white circle background for logo
											ctx.save();
											ctx.beginPath();
											ctx.arc(qrSize/2, qrSize/2, logoSize/2 + 10, 0, 2 * Math.PI);
											ctx.fillStyle = '#fff';
											ctx.fill();
											ctx.closePath();
											
											// Clip to circle and draw logo
											ctx.beginPath();
											ctx.arc(qrSize/2, qrSize/2, logoSize/2, 0, 2 * Math.PI);
											ctx.closePath();
											ctx.clip();
											ctx.drawImage(logo, qrSize/2 - logoSize/2, qrSize/2 - logoSize/2, logoSize, logoSize);
											ctx.restore();
											
											// Download
											const link = document.createElement('a');
											link.download = `QR_${qrModalLoan.kodePinjam}.png`;
											link.href = canvas.toDataURL('image/png', 1.0);
											document.body.appendChild(link);
											link.click();
											document.body.removeChild(link);
										} catch (error) {
											console.error('Error downloading QR:', error);
											alert('Gagal mendownload QR Code');
										}
									}}>Download QR</button>
								</div>
								<div style={{marginTop:10,fontSize:14}}>Scan kode ini di lokasi peminjaman <b>Rak {qrModalLoan.location || '-'}</b> untuk mengambil buku.</div>
							</div>
							<div className="note-v5" style={{marginTop:8}}>Tunjukkan kode ini kepada Admin saat mengambil buku.</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
};

export default LoansPage;



