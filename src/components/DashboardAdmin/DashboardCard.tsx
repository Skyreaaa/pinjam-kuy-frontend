import React from 'react';
import './DashboardCard.css';

interface DashboardCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  children?: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, color, children }) => {
  return (
    <div className="dashboard-card" style={{ borderTop: color ? `4px solid ${color}` : undefined }}>
      <div className="dashboard-card-header">
        {icon && <span className="dashboard-card-icon" style={{ color }}>{icon}</span>}
        <span className="dashboard-card-title">{title}</span>
      </div>
      <div className="dashboard-card-value" style={{ color }}>{value}</div>
      {children && <div className="dashboard-card-extra">{children}</div>}
    </div>
  );
};

export default DashboardCard;
