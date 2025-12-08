import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 180, label }) => (
  <div style={{ textAlign: 'center', margin: '1rem 0' }}>
    {label && <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{label}</div>}
    <QRCodeCanvas value={value} size={size} />
    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{value}</div>
  </div>
);

export default QRCodeDisplay;
