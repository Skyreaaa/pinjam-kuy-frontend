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

interface ScanResult {
  success?: boolean;
  message: string;
  bookTitle?: string;
  borrowerName?: string;
  loanDate?: string;
}

/**
 * Completely rewritten QR Scanner Modal
 * Cleaner implementation with proper cleanup
 */
const QRScanModal: React.FC<QRScanModalProps> = ({ isOpen, onClose }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs
  const scannerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(null);

  // Initialize camera on modal open
  useEffect(() => {
    if (!isOpen) return;

    const initCamera = async () => {
      try {
        setErrorMsg(null);
        const devices = await Html5Qrcode.getCameras();
        console.log('📷 Available cameras:', devices);

        if (devices.length === 0) {
          setErrorMsg('❌ Tidak ada kamera ditemukan');
          return;
        }

        setCameras(devices);

        // Prioritize back camera
        const backCam = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );

        setSelectedCameraId(backCam?.id || devices[0].id);
      } catch (err) {
        console.error('❌ Camera init error:', err);
        setErrorMsg('❌ Tidak dapat mengakses kamera. Berikan izin kamera di pengaturan browser.');
      }
    };

    initCamera();

    return () => {
      setCameras([]);
      setSelectedCameraId(undefined);
    };
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId || !scannerRef.current) return;

    const startScanner = async () => {
      try {
        // Stop existing scanner
        if (qrRef.current && isRunningRef.current) {
          try {
            await qrRef.current.stop();
          } catch (e) {
            console.log('⚠️ Stop error (ignored)');
          }
        }

        // Create new instance
        qrRef.current = new Html5Qrcode(scannerRef.current!.id);
        isRunningRef.current = true;

        console.log('🎬 Starting scanner...');

        await qrRef.current.start(
          { deviceId: selectedCameraId },
          {
            fps: 15,
            qrbox: { width: 400, height: 400 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleQRDetected(decodedText);
          },
          () => {
            // Suppress error logging for QR not found
          }
        );
      } catch (err) {
        console.error('❌ Scanner error:', err);
        setErrorMsg(`❌ Gagal memulai scanner: ${err}`);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  const stopScanner = async () => {
    if (!qrRef.current) return;

    try {
      isRunningRef.current = false;
      await qrRef.current.stop();
      try {
        qrRef.current.clear();
      } catch (e) {
        // Ignore clear errors
      }
      qrRef.current = null;
    } catch (err) {
      console.log('⚠️ Cleanup error (ignored)');
    }
  };

  const handleQRDetected = async (code: string) => {
    if (!isRunningRef.current) return;

    // Debounce: skip if same code scanned within 2 seconds
    const now = Date.now();
    if (
      lastScannedRef.current &&
      lastScannedRef.current.code === code &&
      now - lastScannedRef.current.timestamp < 2000
    ) {
      console.log('⏭️ Duplicate scan skipped');
      return;
    }

    lastScannedRef.current = { code, timestamp: now };

    console.log('✅ QR detected:', code);
    setLoading(true);

    try {
      const response = await adminApiAxios.post('/admin/loans/scan', {
        kodePinjam: code,
      });

      console.log('📦 Response:', response.data);

      setScanResult({
        success: response.data.success,
        message: response.data.message,
        bookTitle: response.data.bookTitle,
        borrowerName: response.data.borrowerName,
        loanDate: response.data.loanDate,
      });
    } catch (err: any) {
      console.error('❌ API error:', err);
      setScanResult({
        success: false,
        message:
          err?.response?.data?.message || 'Gagal memproses pemindaian QR',
        bookTitle: err?.response?.data?.bookTitle,
        borrowerName: err?.response?.data?.borrowerName,
        loanDate: err?.response?.data?.loanDate,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setScanResult(null);
    onClose();
  };

  const handleScanAgain = () => {
    setScanResult(null);
    lastScannedRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          background: '#fff',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          overflow: 'hidden',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 2000,
            fontSize: 28,
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: 8,
            padding: '4px 12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          ×
        </button>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1999,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 16,
                  animation: 'spin 1s linear infinite',
                }}
              >
                ⏳
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
                Memproses pemindaian...
              </div>
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1998,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                maxWidth: 400,
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div
                style={{
                  fontSize: scanResult.success ? 48 : 40,
                  marginBottom: 16,
                }}
              >
                {scanResult.success ? '✅' : '❌'}
              </div>

              <h3
                style={{
                  marginBottom: 12,
                  color: scanResult.success ? '#1890ff' : '#e53935',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {scanResult.message}
              </h3>

              {scanResult.bookTitle && (
                <p style={{ marginBottom: 8, color: '#666', fontSize: 14 }}>
                  <strong>Buku:</strong> {scanResult.bookTitle}
                </p>
              )}

              {scanResult.borrowerName && (
                <p style={{ marginBottom: 8, color: '#666', fontSize: 14 }}>
                  <strong>Peminjam:</strong> {scanResult.borrowerName}
                </p>
              )}

              {scanResult.loanDate && (
                <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
                  <strong>Tanggal:</strong> {scanResult.loanDate}
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={handleScanAgain}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#1890ff',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Scan Lagi
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    color: '#333',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0' }}>
            📷 Scan QR Peminjaman
          </h2>
          <p style={{ color: '#666', margin: 0 }}>
            Arahkan kamera ke kode QR buku
          </p>
        </div>

        {/* Camera Selection */}
        {cameras.length > 1 && (
          <div style={{ marginBottom: 16, width: '100%', maxWidth: 300 }}>
            <select
              value={selectedCameraId || ''}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d9d9d9',
                fontSize: 14,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Kamera ${cam.id.slice(-4)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div
            style={{
              background: '#ffebee',
              color: '#c62828',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              maxWidth: 300,
              fontSize: 14,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* QR Scanner Container */}
        {!errorMsg && (
          <div
            style={{
              width: '80vw',
              height: '45vw',
              maxWidth: 500,
              maxHeight: 500,
              background: '#f5f5f5',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <div
              id="qr-scanner"
              ref={scannerRef}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        )}

        {/* Instructions */}
        <div
          style={{
            fontSize: 13,
            color: '#666',
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          💡 Pastikan pencahayaan cukup untuk hasil pemindaian terbaik
        </div>
      </div>
    </div>
  );
};

export default QRScanModal;
