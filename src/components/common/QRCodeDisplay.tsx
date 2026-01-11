import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import logoApp from '../../assets/Logo.png';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  id?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 240, label, id }) => (
  <div style={{ textAlign: 'center', margin: '1rem 0' }}>
    {label && <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{label}</div>}
    <div style={{ position: 'relative', display: 'inline-block', width: size, height: size, background: '#fff', borderRadius: 12, padding: 12 }}>
      <QRCodeCanvas 
        value={value} 
        size={size} 
        id={id} 
        level="H" 
        includeMargin={true}
        style={{ background: '#fff', borderRadius: 8, display: 'block', width: '100%', height: '100%' }} 
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: '6px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          pointerEvents: 'none',
          border: '2px solid #fff',
          zIndex: 10,
        }}
      >
        <img
          src={logoApp}
          alt="Logo PinjamKuy"
          style={{
            width: '85%',
            height: '85%',
            objectFit: 'contain',
            borderRadius: '4px',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
    <div style={{ marginTop: 12, fontSize: 13, color: '#333', fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{value}</div>
  </div>
);

export default QRCodeDisplay;
