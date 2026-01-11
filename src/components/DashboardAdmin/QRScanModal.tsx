// Hilangkan background putih dan paksa video fullscreen
import './qrscanmodal-override.css';
import './qrscanmodal-video-fullscreen.css';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { adminApiAxios } from '../../services/api';

interface QRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  scanning: boolean;
}

const QRScanModal: React.FC<QRScanModalProps> = ({ isOpen, onClose, onScan, scanning }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{id:string,label:string}[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<Html5Qrcode|null>(null);
  const scannerRunningRef = useRef<boolean>(false);
  const [isStopping, setIsStopping] = useState(false);
  const lastScannedRef = useRef<{code: string; time: number} | null>(null);
  interface ScanResult {
    bookTitle: string;
    borrowerName: string;
    loanDate: string;
    message?: string;
  }
  const [scanResult, setScanResult] = useState<ScanResult|null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch camera list
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    
    // Request camera permission first
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        // Camera permission granted, get cameras
        Html5Qrcode.getCameras().then(devices => {
          console.log('📷 Available cameras:', devices);
          setCameras(devices);
          if (devices.length > 0) {
            // Prefer back camera for mobile, otherwise use first available
            const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
            setSelectedCameraId(backCamera?.id || devices[0].id);
          }
          if (devices.length === 0) {
            setErrorMsg('Tidak ada kamera yang terdeteksi di perangkat ini.');
          }
        }).catch(err => {
          console.error('❌ Error getting cameras:', err);
          setErrorMsg('Tidak dapat mengakses daftar kamera. Pastikan perangkat memiliki kamera.');
        });
      })
      .catch(err => {
        console.error('❌ Camera permission denied:', err);
        setErrorMsg('Izin kamera ditolak. Silakan beri izin kamera di browser Anda untuk melanjutkan scan QR.');
      });
    
    return () => { 
      setCameras([]); 
      setSelectedCameraId(undefined); 
    };
  }, [isOpen]);

  // Start/stop scanner
  useEffect(() => {
    if (!isOpen || !selectedCameraId || !scannerRef.current) return;
    setErrorMsg(null);
    // Selalu bersihkan child div sebelum inisialisasi baru
    while (scannerRef.current.firstChild) {
      try { scannerRef.current.removeChild(scannerRef.current.firstChild); } catch {}
    }
    // Stop/clear instance lama jika ada
    if (html5QrRef.current) {
      try { html5QrRef.current.stop(); } catch (e) {}
      try { html5QrRef.current.clear(); } catch (e) {}
      html5QrRef.current = null;
      scannerRunningRef.current = false;
    }
    html5QrRef.current = new Html5Qrcode(scannerRef.current.id);
    let isActive = true;
    scannerRunningRef.current = true;
    html5QrRef.current
      .start(
        { deviceId: { exact: selectedCameraId } },
        { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (isActive && scannerRunningRef.current) {
            // Jangan stop scanner, biarkan tetap berjalan untuk scan berikutnya
            if (decodedText) {
              // Cek apakah QR code yang sama baru saja di-scan (dalam 3 detik terakhir)
              const now = Date.now();
              if (lastScannedRef.current && 
                  lastScannedRef.current.code === decodedText && 
                  now - lastScannedRef.current.time < 3000) {
                // Skip - QR yang sama baru saja di-scan
                return;
              }
              
              // Update last scanned
              lastScannedRef.current = { code: decodedText, time: now };
              
              setLoadingDetail(true);
              try {
                // Use adminApiAxios to scan kodePinjam
                const res = await adminApiAxios.post(`/admin/loans/scan`, { kodePinjam: decodedText });
                const data = res.data;
                console.log('📦 Scan QR Response:', data);
                // Backend response: { success, message, loanId?, bookTitle?, borrowerName?, loanDate? }
                setScanResult({
                  bookTitle: data.bookTitle || '-',
                  borrowerName: data.borrowerName || '-',
                  loanDate: data.loanDate || '-',
                  message: data.message
                });
              } catch (e: any) {
                console.error('❌ Scan QR Error:', e?.response?.data);
                const errorData = e?.response?.data || {};
                const errorMessage = errorData.message || 'Gagal mengambil detail peminjaman.';
                setScanResult({
                  bookTitle: errorData.bookTitle || '-',
                  borrowerName: errorData.borrowerName || '-',
                  loanDate: errorData.loanDate || '-',
                  message: errorMessage
                });
              } finally {
                setLoadingDetail(false);
              }
            }
          }
        },
        (err) => {
          // ignore scan errors, only show error if camera fails
        }
      )
      .catch((err) => {
        setErrorMsg('Gagal memulai kamera: ' + err);
      });
    return () => {
      if (html5QrRef.current) {
        try { html5QrRef.current.stop(); } catch (e) {}
        try { html5QrRef.current.clear(); } catch (e) {}
        html5QrRef.current = null;
        scannerRunningRef.current = false;
      }
      // Pastikan child div kosong
      if (scannerRef.current) {
        while (scannerRef.current.firstChild) {
          try { scannerRef.current.removeChild(scannerRef.current.firstChild); } catch {}
        }
      }
    };
  }, [isOpen, selectedCameraId]);

  const handleClose = async () => {
    if (isStopping) return;
    setIsStopping(true);
    try {
      if (html5QrRef.current) {
        try { await html5QrRef.current.stop(); } catch {}
        try { await html5QrRef.current.clear(); } catch {}
        html5QrRef.current = null;
        scannerRunningRef.current = false;
      }
      setScanResult(null);
    } finally {
      setIsStopping(false);
      onClose();
    }
  };
  if (!isOpen) return null;
  return (
    <>
      <div className="qrscan-modal-overlay" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.18)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:0,margin:0}}>
        <div className="qrscan-modal" style={{background:'#fff',borderRadius:8,width:'100vw',height:'100vh',maxWidth:'100vw',maxHeight:'100vh',boxShadow:'none',padding:0,position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <button onClick={handleClose} style={{position:'absolute',top:18,right:24,fontSize:32,background:'rgba(255,255,255,0.7)',border:'none',cursor:'pointer',zIndex:2,borderRadius:8,padding:'2px 12px'}} aria-label="Tutup">&times;</button>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:'100vw',height:'100vh',justifyContent:'center',padding:0,margin:0}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginTop:24,marginBottom:8}}>
              <span role="img" aria-label="camera" style={{fontSize:32}}>📷</span>
              <h2 style={{fontWeight:700,fontSize:'2.2rem',margin:0}}>Scan QR Peminjaman</h2>
            </div>
            {cameras.length > 1 && (
              <div style={{marginBottom:12, width:'100vw',maxWidth:400}}>
                <select
                  className="qrscan-device-select"
                  value={selectedCameraId}
                  onChange={e => setSelectedCameraId(e.target.value)}
                  style={{marginBottom:8, width:'100%', padding:'8px', borderRadius:6}}
                >
                  {cameras.map(d => (
                    <option key={d.id} value={d.id}>{d.label || `Kamera ${d.id.slice(-4)}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="qrscan-camera-container" style={{width:'80vw',height:'45vw',maxWidth:'900px',maxHeight:'506px',background:'transparent',borderRadius:'2.5vw',boxShadow:'0 2px 16px #0003',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',margin:'0 auto'}}>
              <div id="qr-html5-video" ref={scannerRef} style={{width:'100%',height:'100%',background:'transparent',borderRadius:'2.5vw',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}} />
            </div>
            {errorMsg && <div className="qrscan-error">{errorMsg}</div>}
            {loadingDetail && (
              <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(255,255,255,0.7)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div>Memuat detail peminjaman...</div>
              </div>
            )}
            {scanResult && (
              <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',zIndex:2100,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{background:'#fff',borderRadius:12,padding:'32px 24px',minWidth:320,maxWidth:450,boxShadow:'0 4px 32px #0003',textAlign:'center'}}>
                  {scanResult.message && (scanResult.message.includes('QR Expired') || scanResult.message.includes('Status sekarang')) ? (
                    <>
                      <h3 style={{color:'#e53935',marginBottom:16}}>
                        {scanResult.message.includes('QR Expired') ? '⏰ QR Expired' : '⚠️ Tidak Dapat Diproses'}
                      </h3>
                      <div style={{margin:'16px 0',color:'#e67e22',fontWeight:500,fontSize:15,lineHeight:1.5}}>{scanResult.message}</div>
                      {scanResult.bookTitle && scanResult.bookTitle !== '-' && (
                        <div style={{marginTop:16,padding:12,background:'#f5f5f5',borderRadius:8,textAlign:'left'}}>
                          <div style={{fontSize:13,marginBottom:4}}><b>Buku:</b> {scanResult.bookTitle}</div>
                          <div style={{fontSize:13,marginBottom:4}}><b>Peminjam:</b> {scanResult.borrowerName}</div>
                        </div>
                      )}
                      <button style={{marginTop:18,padding:'10px 28px',borderRadius:6,background:'#e53935',color:'#fff',border:'none',fontWeight:600,cursor:'pointer',fontSize:14}} onClick={()=>{setScanResult(null);lastScannedRef.current=null;onClose();}}>Tutup</button>
                    </>
                  ) : (
                    <>
                      <h3 style={{color:'#27ae60',marginBottom:16}}>✅ Peminjaman Berhasil!</h3>
                      <div style={{marginTop:16,padding:16,background:'#f0f9ff',borderRadius:8,textAlign:'left'}}>
                        <div style={{fontSize:14,marginBottom:8,display:'flex',justifyContent:'space-between'}}>
                          <span style={{color:'#666'}}>Buku:</span>
                          <b style={{color:'#2c3e50',maxWidth:'60%',textAlign:'right'}}>{scanResult.bookTitle}</b>
                        </div>
                        <div style={{fontSize:14,marginBottom:8,display:'flex',justifyContent:'space-between'}}>
                          <span style={{color:'#666'}}>Peminjam:</span>
                          <b style={{color:'#2c3e50'}}>{scanResult.borrowerName}</b>
                        </div>
                        <div style={{fontSize:14,display:'flex',justifyContent:'space-between'}}>
                          <span style={{color:'#666'}}>Waktu Pinjam:</span>
                          <b style={{color:'#2c3e50'}}>{new Date(scanResult.loanDate).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</b>
                        </div>
                      </div>
                      <div style={{marginTop:12,padding:12,background:'#fff3cd',borderRadius:6,fontSize:13,color:'#856404'}}>
                        📢 Notifikasi telah dikirim ke peminjam
                      </div>
                      <button style={{marginTop:18,padding:'10px 28px',borderRadius:6,background:'#27ae60',color:'#fff',border:'none',fontWeight:600,cursor:'pointer',fontSize:14,marginRight:8}} onClick={()=>{setScanResult(null);lastScannedRef.current=null;}}>Scan Lagi</button>
                      <button style={{marginTop:18,padding:'10px 28px',borderRadius:6,background:'#666',color:'#fff',border:'none',fontWeight:600,cursor:'pointer',fontSize:14}} onClick={()=>{setScanResult(null);onClose();}}>Selesai</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default QRScanModal;
