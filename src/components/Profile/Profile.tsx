// File: components/Profile/Profile.tsx 
import React, { useState, useEffect, useRef } from 'react';
import { userApi } from '../../services/api';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop/types';
import QRCodeDisplay from '../common/QRCodeDisplay';
import {
  FaArrowLeft,
  FaCamera,
  FaTrash,
  FaEdit,
  FaTimes,
  FaSave,
  FaHistory
} from 'react-icons/fa';
import './Profile.css';

// --- IMPORT ASSETS (Pastikan path ke folder assets benar) ---
import defaultAvatar from '../../assets/Avatar.jpg'; 
import bingungIcon from '../../assets/bingung.png'; 
import sipIcon from '../../assets/sip.png';       
// ----------------------------------------------------------

// --- DEFINISI INTERFACE PROPS ---
interface ProfileProps {
  userData: {
    username?: string;
    npm?: string;
    angkatan?: string;
    fakultas?: string;
    prodi?: string;
    profile_photo_url?: string | null;
  };
  profilePhoto: string | null;
  setProfilePhoto: (url: string) => void;
  onPhotoUpdate: (photo: File | null, npm: string, onComplete: (success: boolean, message: string) => void) => void; 
  onProfileSave: (updatedData: any) => Promise<{ success: boolean; message: string }>; 
  onBack: () => void;
  onDeletePhoto: (npm: string, onComplete: (success: boolean, message: string) => void) => void;
}

// --- FUNGSI MODAL DASAR ---

// 1. SimpleModal Component (Telah disesuaikan urutan elemennya)
interface SimpleModalProps {
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    showCancelButton?: boolean;
    confirmText: string;
    type: 'confirm' | 'success' | 'error';
}

const SimpleModal: React.FC<SimpleModalProps> = ({ 
    title, message, onClose, onConfirm, showCancelButton, confirmText, type 
}) => {
    const icon = type === 'success' ? sipIcon : type === 'error' ? bingungIcon : bingungIcon; 
    
    return (
        <div className="modal-backdrop">
            <div className={`modal-content ${type}`}>
                {/* URUTAN FINAL: Judul -> Ikon -> Pesan */}
                <h3>{title}</h3> 
                <img src={icon} alt={type} className="modal-icon" />
                <p>{message}</p>
                <div className="modal-actions">
                    {showCancelButton && <button onClick={onClose} className="btn-cancel">Batal</button>}
                    <button 
                        onClick={onConfirm || onClose} 
                        className={`btn-confirm`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 2. CropModal Component (Modal Upload Foto)
interface CropModalProps {
    fileToCrop: File | null;
    onCropComplete: (croppedFile: File) => void;
    onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', error => reject(error));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
};

async function getCroppedImg(imageSrc: string, crop: Area, fileName: string, fileType: string): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(new File([blob], fileName, { type: fileType }));
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, fileType);
  });
}

const CropModal: React.FC<CropModalProps> = ({ fileToCrop, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (fileToCrop) {
      setImageUrl(URL.createObjectURL(fileToCrop));
    }
  }, [fileToCrop]);

  const onCropCompleteHandler = (_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCrop = async () => {
    if (!imageUrl || !croppedAreaPixels || !fileToCrop) return;
    const croppedFile = await getCroppedImg(imageUrl, croppedAreaPixels, fileToCrop.name, fileToCrop.type);
    onCropComplete(croppedFile);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content crop-modal">
        <h3>Potong Foto</h3>
        <div className="crop-area" style={{ position: 'relative', width: 300, height: 300, background: '#333', margin: '0 auto' }}>
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropCompleteHandler}
            />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ width: 200 }}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-cancel">Batal</button>
          <button onClick={handleCrop} className="btn-confirm">Potong & Unggah</button>
        </div>
      </div>
    </div>
  );
};
// --- END MODAL DEFINITIONS ---


const Profile: React.FC<ProfileProps> = ({
  userData, profilePhoto, setProfilePhoto, onPhotoUpdate, onProfileSave, onBack, onDeletePhoto,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(userData.username || '');
  const [editedFakultas, setEditedFakultas] = useState(userData.fakultas || '');
  const [editedProdi, setEditedProdi] = useState(userData.prodi || '');
  const [editedAngkatan, setEditedAngkatan] = useState(userData.angkatan || '');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update URL untuk profile page
  useEffect(() => {
    window.history.replaceState(null, '', '/profile');
  }, []);

  useEffect(() => {
    setEditedUsername(userData.username || '');
    setEditedFakultas(userData.fakultas || '');
    setEditedProdi(userData.prodi || '');
    setEditedAngkatan(userData.angkatan || '');
  }, [userData]);

  const handleEditProfile = () => { setIsEditing(true); setNotification(null); };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedUsername(userData.username || '');
    setEditedFakultas(userData.fakultas || '');
    setEditedProdi(userData.prodi || '');
    setEditedAngkatan(userData.angkatan || '');
    setNotification(null);
  };
  
  const handleSaveProfileConfirmation = () => { setShowConfirmSaveModal(true); };
  
  const handleSaveProfile = async () => { 
    setShowConfirmSaveModal(false); 
    setIsSaving(true);
    setNotification(null);
    
    const updatedData = {
        username: editedUsername,
        fakultas: editedFakultas,
        prodi: editedProdi,
        angkatan: editedAngkatan,
    };

    try {
        const result = await onProfileSave(updatedData); 
        
        setIsSaving(false);

        if (result.success) {
            setNotification({ type: 'success', title: 'Berhasil! Sip!', message: result.message }); 
            setIsEditing(false); 
        } else {
            setNotification({ type: 'error', title: 'Gagal Menyimpan!', message: result.message });
        }
    } catch (e) {
        setIsSaving(false);
        setNotification({ type: 'error', title: 'Kesalahan', message: 'Terjadi kesalahan saat menyimpan data.' });
    }
  };
  
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFileToCrop(file); 
            setShowCropModal(true); 
        }
    };
    
    const handleCropAndUpload = async (croppedFile: File) => {
      setShowCropModal(false);
      setNotification(null);
      setIsUploading(true);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      try {
        const fd = new FormData();
        fd.append('profile_photo', croppedFile);
        const token = sessionStorage.getItem('token');
        const resp = await userApi.post(
          '/profile/upload-photo',
          fd,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
              }
            }
          }
        );
        setIsUploading(false);
        setUploadProgress(0);
        if (resp.data && resp.data.success && resp.data.profile_photo_url) {
          setNotification({ type: 'success', title: 'Berhasil! Sip!', message: resp.data.message });
          setProfilePhoto(resp.data.profile_photo_url);
          // Update localStorage userData jika ada
          const userDataStr = sessionStorage.getItem('userData');
          if (userDataStr) {
            try {
            const userDataObj = JSON.parse(userDataStr);
            userDataObj.profile_photo_url = resp.data.profile_photo_url;
            sessionStorage.setItem('userData', JSON.stringify(userDataObj));
            } catch {}
          }
        } else {
          setNotification({ type: 'error', title: 'Gagal!', message: resp.data.message || 'Gagal upload foto.' });
        }
      } catch (e) {
        setIsUploading(false);
        setUploadProgress(0);
        setNotification({ type: 'error', title: 'Gagal!', message: 'Gagal upload foto.' });
      }
      setFileToCrop(null);
    };
    
    const handleCancelCrop = () => {
        setFileToCrop(null);
        setShowCropModal(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    };

    const handleDeletePhotoConfirmation = () => { setShowConfirmDeleteModal(true); };

    const handleDeletePhotoLocally = async () => {
        setShowConfirmDeleteModal(false); 
        setNotification(null);
        
        onDeletePhoto(userData.npm || '', (success, message) => {
            if (success) {
                setNotification({ type: 'success', title: 'Berhasil! Sip!', message: message });
            } else {
                setNotification({ type: 'error', title: 'Gagal!', message: message });
            }
        });
    };
  
  return (
    <div className="profile-container">
      <header className="profile-header">
        <button onClick={onBack} className="back-btn">
          <FaArrowLeft />
        </button>
        <h2>Profil Pengguna</h2>
      </header>
      
      <div className="profile-content">
        {isUploading && (
          <div className="upload-progress-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'rgba(255,255,255,0.7)' }}>
            <div className="progress-label" style={{ fontWeight: 'bold', marginBottom: 10 }}>Mengunggah foto... {uploadProgress}%</div>
            <div className="progress-bar-bg" style={{ width: 300, height: 20, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, height: '100%', background: '#4caf50', transition: 'width 0.2s' }}></div>
            </div>
          </div>
        )}
        <div className="profile-card">
          <div className="profile-photo-section">
            <img 
              src={profilePhoto && !profilePhoto.startsWith('data:image') ? profilePhoto : (userData.profile_photo_url && !userData.profile_photo_url.startsWith('data:image') ? userData.profile_photo_url : defaultAvatar)}
              alt="Foto Profil"
              className="profile-photo"
            />
            {/* QR Code Anggota */}
            <div className="qr-section-member">
              <h4 className="qr-title">QR Anggota</h4>
              {userData.npm && (
                <QRCodeDisplay value={userData.npm} label={`NPM: ${userData.npm}`} size={220} />
              )}
            </div>
            {isEditing && (
              <div className="photo-actions">
                <button 
                  className="camera-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Ubah Foto Profil"
                >
                  <FaCamera />
                </button>
                {(profilePhoto && profilePhoto !== defaultAvatar) && (
                  <button
                    className="trash-btn"
                    onClick={handleDeletePhotoConfirmation} 
                    title="Hapus Foto Profil"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>
          
          <div className="profile-info">
            <h3 className="user-name">{userData.username}</h3>
            <p className="user-npm">{userData.npm}</p>
          </div>
        </div>
        <div className="biodata-card">
          <h3 className="biodata-title">
            Biodata
            {!isEditing && (
              <>
                <button className="icon-btn" onClick={handleEditProfile} title="Edit Biodata">
                  <FaEdit />
                </button>
                {/* Tombol histori aktivitas dihapus */}
              </>
            )}
          </h3>

          <div className="profile-fields">
            <div className="field">
              <label>Nama Lengkap</label>
              <input type="text" value={editedUsername} onChange={(e) => setEditedUsername(e.target.value)} disabled={!isEditing} />
            </div>
            <div className="field">
              <label>Fakultas</label>
              <input type="text" value={editedFakultas} onChange={(e) => setEditedFakultas(e.target.value)} disabled={!isEditing} />
            </div>
            <div className="field">
              <label>Prodi</label>
              <input type="text" value={editedProdi} onChange={(e) => setEditedProdi(e.target.value)} disabled={!isEditing} />
            </div>
            <div className="field">
              <label>Angkatan</label>
              <input type="text" value={editedAngkatan} onChange={(e) => setEditedAngkatan(e.target.value)} disabled={!isEditing} />
            </div>
          </div>
          
          {isEditing && (
            <div className="profile-actions">
              <button onClick={handleCancelEdit} className="cancel-btn" disabled={isSaving}> <FaTimes /> Batal </button>
              <button onClick={handleSaveProfileConfirmation} className="save-btn" disabled={isSaving || !editedUsername || !editedFakultas || !editedProdi || !editedAngkatan}>
                {isSaving ? 'Menyimpan...' : <span><FaSave /> Simpan Perubahan</span>}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* --- RENDER MODAL KONFIRMASI (SAVE BIODATA) --- */}
      {showConfirmSaveModal && (
        <SimpleModal
          title="Konfirmasi Perubahan"
          message="Apakah Anda yakin ingin menyimpan perubahan biodata ini?"
          onClose={() => setShowConfirmSaveModal(false)}
          onConfirm={handleSaveProfile}
          showCancelButton={true}
          confirmText="Ya, Simpan"
          type="confirm" 
        />
      )}
      
      {/* --- RENDER MODAL KONFIRMASI (DELETE FOTO) --- */}
      {showConfirmDeleteModal && (
        <SimpleModal
          title="Hapus Foto Profil"
          message="Apakah Anda yakin ingin menghapus foto profil Anda? Ini akan menggunakan foto default."
          onClose={() => setShowConfirmDeleteModal(false)}
          onConfirm={handleDeletePhotoLocally} 
          showCancelButton={true}
          confirmText="Ya, Hapus"
          type="confirm" 
        />
      )}

      {/* --- RENDER MODAL CROP FOTO --- */}
      {showCropModal && (
        <CropModal fileToCrop={fileToCrop} onCropComplete={handleCropAndUpload} onCancel={handleCancelCrop} />
      )}
      
      {/* --- RENDER MODAL NOTIFIKASI (Sukses/Gagal) --- */}
      {notification && (
        <SimpleModal 
          title={notification.title} 
          message={notification.message} 
          onClose={() => setNotification(null)} 
          confirmText="Tutup" 
          type={notification.type} 
        />
      )}
    </div>
  );
};

export default Profile;