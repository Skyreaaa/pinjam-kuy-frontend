import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import './PromptModal.css';

interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title?: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

const PromptModal: React.FC<PromptModalProps> = ({ 
  open, 
  onClose, 
  onConfirm,
  title, 
  message, 
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Batal'
}) => {
  const [value, setValue] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
    onClose();
  };

  const handleCancel = () => {
    setValue('');
    onClose();
  };

  return (
    <div className="prompt-modal-overlay" onClick={handleCancel}>
      <div className="prompt-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleCancel}>
          <FaTimes />
        </button>
        
        <div className="prompt-modal-body">
          {title && <h2 className="prompt-title">{title}</h2>}
          <p className="prompt-message">{message}</p>
          
          <input
            type="text"
            className="prompt-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        </div>
        
        <div className="prompt-modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>
            {cancelText}
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
