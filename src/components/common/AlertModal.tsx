import React from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import './AlertModal.css';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ 
  open, 
  onClose, 
  title, 
  message, 
  type = 'info',
  confirmText = 'OK'
}) => {
  if (!open) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <FaCheckCircle className="icon-success" />;
      case 'error': return <FaTimesCircle className="icon-error" />;
      case 'warning': return <FaExclamationTriangle className="icon-warning" />;
      default: return <FaInfoCircle className="icon-info" />;
    }
  };

  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="alert-modal-body">
          <div className="alert-icon-container">
            {getIcon()}
          </div>
          
          {title && <h2 className="alert-title">{title}</h2>}
          <p className="alert-message">{message}</p>
        </div>
        
        <div className="alert-modal-footer">
          <button className={`btn-confirm btn-${type}`} onClick={onClose}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
