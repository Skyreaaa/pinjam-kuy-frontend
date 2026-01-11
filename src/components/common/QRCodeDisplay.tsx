import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import logoApp from '../../assets/Logo.png';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  id?: string;
}

/**
 * Simple QR Code Display Component
 * Generates a QR code with logo overlay
 */
const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  value, 
  size = 260, 
  label, 
  id 
}) => {
  return (
    <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
      {label && (
        <div style={{ marginBottom: 12, fontWeight: 600, fontSize: '0.95rem', color: '#333' }}>
          {label}
        </div>
      )}
      
      {/* QR Code Container */}
      <div 
        style={{ 
          position: 'relative', 
          display: 'inline-block', 
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        }}
      >
        <QRCodeCanvas 
          value={value} 
          size={size} 
          id={id}
          level="H"
          includeMargin={true}
          style={{ 
            borderRadius: 12,
            display: 'block',
          }} 
        />
        
        {/* Logo Overlay */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: '8px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
            border: '3px solid #fff',
            zIndex: 10,
          }}
        >
          <img
            src={logoApp}
            alt="Logo"
            style={{
              width: '85%',
              height: '85%',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      {/* Code Display */}
      <div 
        style={{ 
          marginTop: 16, 
          fontSize: 13, 
          color: '#555', 
          fontWeight: 500, 
          fontFamily: 'monospace', 
          letterSpacing: '0.5px',
          wordBreak: 'break-all'
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default QRCodeDisplay;
