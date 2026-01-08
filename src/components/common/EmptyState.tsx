import React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: string; // emoji or image path
  title: string;
  description?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = '📭', 
  title, 
  description,
  actionButton 
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actionButton && (
        <button 
          className="empty-state-button"
          onClick={actionButton.onClick}
        >
          {actionButton.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
