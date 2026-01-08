import React, { useRef, useState, useEffect } from 'react';
import { FaCamera, FaUpload, FaTimes, FaMapMarkerAlt, FaClock, FaImage, FaRedo } from 'react-icons/fa';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: { lat: number; lng: number; accuracy: number; time: string }) => void;
  uploading?: boolean;
  uploadProgress?: number;
  uploadSuccess?: boolean;
}

// Function to add watermark to image
const addWatermarkToImage = async (
  imageFile: File,
  location: { lat: number; lng: number; accuracy: number } | null,
  time: string,
  address: string
): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      if (ctx) {
        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Watermark styling
        const padding = 20;
        const lineHeight = 30;
        const fontSize = Math.max(24, img.width * 0.025);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;

        // Draw watermark background
        const watermarkHeight = lineHeight * (location ? 4 : 2) + padding * 2;
        ctx.fillRect(0, img.height - watermarkHeight, img.width, watermarkHeight);

        // Draw text with outline
        ctx.textAlign = 'left';
        ctx.fillStyle = 'white';
        let yPos = img.height - watermarkHeight + padding + lineHeight;

        // Date & Time
        const dateTimeText = `📅 ${time}`;
        ctx.strokeText(dateTimeText, padding, yPos);
        ctx.fillText(dateTimeText, padding, yPos);
        yPos += lineHeight;

        // Location
        if (location) {
          const locationText = `📍 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
          ctx.strokeText(locationText, padding, yPos);
          ctx.fillText(locationText, padding, yPos);
          yPos += lineHeight;

          // Address (truncated if too long)
          if (address) {
            const maxAddressLength = Math.floor(img.width / (fontSize * 0.5));
            const truncatedAddress = address.length > maxAddressLength 
              ? address.substring(0, maxAddressLength - 3) + '...' 
              : address;
            ctx.font = `${fontSize * 0.8}px Arial`;
            ctx.strokeText(truncatedAddress, padding, yPos);
            ctx.fillText(truncatedAddress, padding, yPos);
          }
        } else {
          const noLocationText = '⚠️ Lokasi tidak tersedia';
          ctx.strokeText(noLocationText, padding, yPos);
          ctx.fillText(noLocationText, padding, yPos);
        }
      }

      // Convert canvas to blob and create new file
      canvas.toBlob((blob) => {
        if (blob) {
          const watermarkedFile = new File([blob], `proof_${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve(watermarkedFile);
        } else {
          resolve(imageFile);
        }
      }, 'image/jpeg', 0.92);
    };

    img.src = URL.createObjectURL(imageFile);
  });
};

const getLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(err.message),
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
    );
  });
};

const UploadReturnProofModal: React.FC<Props> = ({ open, onClose, onUpload, uploading: externalUploading, uploadProgress: externalProgress, uploadSuccess: externalSuccess }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [watermarkedFile, setWatermarkedFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [time, setTime] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'camera' | 'preview' | 'uploading' | 'success'>('select');
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use external uploading state if provided
  const uploading = externalUploading !== undefined ? externalUploading : false;
  const uploadProgress = externalProgress !== undefined ? externalProgress : 0;
  const uploadSuccess = externalSuccess !== undefined ? externalSuccess : false;

  const handleFile = async (f: File) => {
    setLoading(true);
    setFile(f);
    
    // Show preview immediately without watermark first
    const tempPreview = URL.createObjectURL(f);
    setPreview(tempPreview);
    setStep('preview');
    
    const captureTime = new Date().toLocaleString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setTime(captureTime);
    
    // Get location in background
    let loc: { lat: number; lng: number; accuracy: number } | null = null;
    let addr = '';
    
    try {
      loc = await getLocation();
      setLocation(loc);
      setLocationError(null);
      
      // Reverse geocoding
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.lat}&lon=${loc.lng}`);
        const data = await resp.json();
        if (data && data.display_name) {
          addr = data.display_name;
          setAddress(addr);
        } else {
          setAddress('Alamat tidak ditemukan');
        }
      } catch {
        setAddress('Gagal mengambil alamat');
      }
    } catch (err: any) {
      setLocation(null);
      setLocationError(typeof err === 'string' ? err : (err?.message || 'Gagal mendapatkan lokasi'));
    }

    // Add watermark in background
    setTimeout(async () => {
      const watermarked = await addWatermarkToImage(f, loc, captureTime, addr);
      setWatermarkedFile(watermarked);
      setPreview(URL.createObjectURL(watermarked));
      setLoading(false);
    }, 100);
  };

  const startCamera = async () => {
    setStep('camera');
    setShowCamera(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current && videoRef.current.play();
        };
      }
    } catch (err) {
      setCameraError('Tidak dapat mengakses kamera.');
    }
  };

  const handleGallery = () => {
    stopCamera();
    setStep('select');
    inputRef.current?.click();
  };

  const handleTakePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const f = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleFile(f);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleRetake = () => {
    setPreview(null);
    setFile(null);
    setWatermarkedFile(null);
    setStep('select');
  };

  const handleSubmitUpload = async () => {
    if (!watermarkedFile) {
      alert('Silakan ambil foto terlebih dahulu');
      return;
    }
    
    setStep('uploading');
    
    try {
      // Langsung panggil callback onUpload yang sudah disiapkan parent
      await onUpload(watermarkedFile, { 
        lat: location?.lat || 0, 
        lng: location?.lng || 0, 
        accuracy: location?.accuracy || 0, 
        time 
      });
    } catch (e) {
      console.error('Upload error:', e);
      alert('Gagal upload bukti');
      setStep('preview');
    }
  };
  
  // Monitor uploadSuccess from parent
  useEffect(() => {
    if (uploadSuccess && step === 'uploading') {
      setStep('success');
    }
  }, [uploadSuccess, step]);

  const resetModal = () => {
    setStep('select');
    setPreview(null);
    setFile(null);
    setWatermarkedFile(null);
    setLocation(null);
    setLocationError(null);
    setTime('');
    setAddress('');
    setLoading(false);
    stopCamera();
  };

  useEffect(() => {
    if (!open) {
      resetModal();
    }
    // eslint-disable-next-line
  }, [open]);
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  if (!open) return null;

  return (
    <div className="fullscreen-upload-modal">
      <div className="modal-container">
        <button className="close-button-fullscreen" onClick={onClose}>
          <FaTimes />
        </button>

        {/* SELECT STEP - Choose between camera or upload */}
        {step === 'select' && (
          <div className="step-select">
            <div className="modal-header">
              <h2>Bukti Pengembalian Buku</h2>
              <p>Ambil foto atau upload bukti pengembalian buku</p>
            </div>
            <div className="button-group">
              <button className="action-button camera-button" onClick={startCamera}>
                <FaCamera size={32} />
                <span>Ambil Foto</span>
                <small>Gunakan kamera untuk mengambil foto langsung</small>
              </button>
              <button className="action-button upload-button" onClick={handleGallery}>
                <FaImage size={32} />
                <span>Upload File</span>
                <small>Pilih foto dari galeri atau file manager</small>
              </button>
            </div>
            <input 
              ref={inputRef} 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleInput} 
            />
          </div>
        )}

        {/* CAMERA STEP - Live camera view */}
        {step === 'camera' && (
          <div className="step-camera">
            {cameraError ? (
              <div className="camera-error">
                <p>{cameraError}</p>
                <button className="retry-button" onClick={startCamera}>Coba Lagi</button>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="camera-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="camera-controls">
                  <button className="camera-action-button" onClick={handleTakePhoto} disabled={loading}>
                    <FaCamera size={28} />
                    <span>Ambil Foto</span>
                  </button>
                  <button className="camera-secondary-button" onClick={handleGallery}>
                    <FaUpload size={24} />
                    <span>Upload File</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* PREVIEW STEP - Show captured/uploaded image with watermark */}
        {step === 'preview' && (
          <div className="step-preview">
            <div className="modal-header">
              <h2>Preview Bukti Pengembalian</h2>
              <p>Pastikan foto sudah jelas dan informasi lengkap</p>
            </div>
            <div className="preview-container">
              {preview && <img src={preview} alt="Preview" className="preview-image" />}
              {loading && <div className="loading-overlay">Memproses foto...</div>}
            </div>
            <div className="preview-info">
              {location ? (
                <>
                  <div className="info-item">
                    <FaClock /> <span>{time}</span>
                  </div>
                  <div className="info-item">
                    <FaMapMarkerAlt /> 
                    <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
                  </div>
                  {address && <div className="info-address">{address}</div>}
                </>
              ) : (
                <div className="info-error">
                  ⚠️ Lokasi tidak tersedia. Pastikan izin lokasi diaktifkan.
                  {locationError && <small>{locationError}</small>}
                </div>
              )}
            </div>
            <div className="preview-actions">
              <button className="retake-button" onClick={handleRetake} disabled={uploading}>
                <FaRedo /> Ambil Ulang
              </button>
              <button 
                className="submit-button" 
                onClick={handleSubmitUpload} 
                disabled={uploading || !watermarkedFile}
              >
                {uploading ? 'Mengupload...' : <><FaUpload /> Upload ke Admin</>}
              </button>
            </div>
          </div>
        )}

        {/* UPLOADING STEP - Show progress */}
        {step === 'uploading' && (
          <div className="step-uploading">
            <div className="upload-icon-container">
              <div className="upload-icon">📤</div>
            </div>
            <h2>Mengupload Bukti...</h2>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <div className="progress-text">{uploadProgress}%</div>
            </div>
            <p>Mohon tunggu, jangan tutup halaman ini</p>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === 'success' && (
          <div className="step-success">
            <div className="success-icon">✓</div>
            <h2>Berhasil!</h2>
            <p>Bukti pengembalian berhasil dikirim ke admin</p>
          </div>
        )}
      </div>

      <style>{`
        .fullscreen-upload-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          width: 100%;
          height: 100%;
          max-width: 900px;
          background: #fff;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .close-button-fullscreen {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 100;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 24px;
          color: #333;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }

        .close-button-fullscreen:hover {
          background: #fff;
          transform: scale(1.1);
        }

        /* SELECT STEP */
        .step-select {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px 20px;
        }

        .modal-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .modal-header h2 {
          font-size: 28px;
          color: #1a3263;
          margin: 0 0 12px 0;
        }

        .modal-header p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .button-group {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .action-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px 60px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 280px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .action-button span {
          font-size: 20px;
          font-weight: 700;
        }

        .action-button small {
          font-size: 14px;
          opacity: 0.8;
        }

        .camera-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .camera-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
        }

        .upload-button {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .upload-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(245, 87, 108, 0.4);
        }

        /* CAMERA STEP */
        .step-camera {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #1a1a1a;
        }

        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .camera-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: white;
          padding: 20px;
        }

        .camera-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 32px;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          display: flex;
          gap: 16px;
          justify-content: center;
          align-items: center;
        }

        .camera-action-button {
          background: #fff;
          color: #1a3263;
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }

        .camera-action-button:hover {
          transform: scale(1.1);
        }

        .camera-action-button:active {
          transform: scale(0.95);
        }

        .camera-action-button span {
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }

        .camera-secondary-button {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .camera-secondary-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* PREVIEW STEP */
        .step-preview {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .step-preview .modal-header {
          padding: 24px 20px 16px;
          border-bottom: 1px solid #eee;
        }

        .preview-container {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          position: relative;
          padding: 20px;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          transition: opacity 0.3s ease;
        }

        .loading-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.95);
          color: #1a3263;
          padding: 20px 40px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
        }
        
        .loading-overlay::after {
          content: '';
          width: 40px;
          height: 40px;
          border: 4px solid #e0e0e0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-top: 12px;
        }
        rotate(360deg); }ter;
          justify-content: center;
          font-size: 18px;
        }

        .preview-info {
          padding: 20px;
          background: #fff;
          border-top: 1px solid #eee;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #333;
        }

        .info-address {
          font-size: 13px;
          color: #666;
          margin-top: 8px;
          padding-left: 24px;
        }

        .info-error {
          color: #e74c3c;
          font-size: 14px;
          padding: 12px;
          background: #ffebee;
          border-radius: 8px;
        }

        .info-error small {
          display: block;
          margin-top: 8px;
          font-size: 12px;
        }

        .preview-actions {
          display: flex;
          gap: 12px;
          padding: 20px;
          background: #fff;
          border-top: 1px solid #eee;
        }

        .retake-button {
          flex: 1;
          padding: 16px;
          background: #f5f5f5;
          border: 2px solid #ddd;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .retake-button:hover {
          background: #eee;
          border-color: #ccc;
        }

        .submit-button {
          flex: 2;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* UPLOADING STEP */
        .step-uploading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px;
          animation: fadeIn 0.3s ease;
        }

        .upload-icon-container {
          margin-bottom: 24px;
        }

        .upload-icon {
          font-size: 80px;
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .step-uploading h2 {
          font-size: 28px;
          color: #1a3263;
          margin: 0 0 32px 0;
        }

        .progress-container {
          width: 100%;
          max-width: 400px;
          margin-bottom: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
          text-align: center;
        }

        .step-uploading p {
          font-size: 14px;
          color: #666;
          margin-top: 16px;
        }

        /* SUCCESS STEP */
        .step-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px;
          animation: successPop 0.5s ease;
        }

        @keyframes successPop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .success-icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          margin-bottom: 24px;
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
        }

        .step-success h2 {
          font-size: 32px;
          color: #1a3263;
          margin: 0 0 12px 0;
        }

        .step-success p {
          font-size: 16px;
          color: #666;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
          .modal-container {
            max-width: 100%;
          }

          .button-group {
            flex-direction: column;
            width: 100%;
            padding: 0 20px;
          }

          .action-button {
            width: 100%;
            min-width: 0;
            padding: 32px 40px;
          }

          .modal-header h2 {
            font-size: 24px;
          }

          .camera-action-button {
            width: 70px;
            height: 70px;
          }

          .close-button-fullscreen {
            width: 42px;
            height: 42px;
            top: 12px;
            right: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadReturnProofModal;
