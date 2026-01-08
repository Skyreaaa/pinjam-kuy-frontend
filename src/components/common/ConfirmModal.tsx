import React from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './ConfirmModal.css';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  open, 
  onClose, 
  onConfirm,
  title, 
  message, 
  confirmText = 'Ya',
  cancelText = 'Batal',
  type = 'info'
}) => {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="confirm-modal-body">
          <div className="confirm-icon-container">
            {type === 'danger' || type === 'warning' ? (
              <FaExclamationTriangle className={`icon-${type}`} />
            ) : (
              <FaCheckCircle className="icon-info" />
            )}
          </div>
          
          {title && <h2 className="confirm-title">{title}</h2>}
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`btn-confirm btn-${type}`} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
