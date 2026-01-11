import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import logoApp from '../../assets/Logo.png';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  id?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 180, label, id }) => (
  <div style={{ textAlign: 'center', margin: '1rem 0' }}>
    {label && <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{label}</div>}
    <div style={{ position: 'relative', display: 'inline-block', width: size, height: size, background: '#fff', borderRadius: 12 }}>
      <QRCodeCanvas 
        value={value} 
        size={size} 
        id={id} 
        level="H" 
        includeMargin={false}
        style={{ background: '#fff', borderRadius: 12 }} 
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: '8px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px #0002',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <img
          src={logoApp}
          alt="Logo PinjamKuy"
          style={{
            width: '80%',
            height: '80%',
            objectFit: 'contain',
            borderRadius: '6px',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{value}</div>
  </div>
);

export default QRCodeDisplay;
