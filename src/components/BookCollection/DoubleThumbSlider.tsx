// Helper for a range slider with two thumbs (min/max)
import React, { useState } from 'react';

interface DoubleThumbSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
}

const DoubleThumbSlider: React.FC<DoubleThumbSliderProps> = ({ min, max, value, onChange }) => {
  const [activeThumb, setActiveThumb] = useState<'left' | 'right' | null>(null);
  const [minVal, maxVal] = value;
  const percent = (val: number) => ((val - min) / (max - min)) * 100;
  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: 80, paddingTop: 8 }}>
        {/* Responsive: hide year range div on desktop, show on mobile */}
        <style>{`
          @media (min-width: 600px) {
            .double-thumb-slider-hide-desktop { display: none !important; }
          }
          @media (max-width: 599px) {
            .double-thumb-slider-hide-mobile { display: none !important; }
          }
        `}</style>
        {/* Year badges above thumbs (hanya tampil di mobile) */}
        <div className="double-thumb-slider-hide-desktop" style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ color: '#bbb', background: '#f5f5f5', borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 14, minWidth: 40, textAlign: 'center' }}>{min}</div>
          <div style={{ color: '#bbb', background: '#f5f5f5', borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 14, minWidth: 40, textAlign: 'center', marginLeft: 'auto' }}>{max}</div>
        </div>
        {/* Slider background track */}
        <div style={{ position: 'absolute', top: 36, left: 0, right: 0, height: 10, background: '#eee', borderRadius: 6, zIndex: 1 }} />
        {/* Colored range track */}
        <div style={{ position: 'absolute', top: 36, left: percent(minVal) + '%', width: (percent(maxVal) - percent(minVal)) + '%', height: 10, background: '#d32f2f', borderRadius: 6, zIndex: 2 }} />
        {/* Vertical flag-style marker for minVal */}
        <div style={{
          position: 'absolute',
          top: 24,
          left: `calc(${percent(minVal)}% - 6px)`,
          width: 12,
          height: 28,
          zIndex: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ width: 4, height: 18, background: '#d32f2f', borderRadius: 2 }} />
          <div style={{ width: 12, height: 12, background: '#d32f2f', borderTopRightRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: 4, marginTop: -18 }} />
        </div>
        {/* Vertical flag-style marker for maxVal */}
        <div style={{
          position: 'absolute',
          top: 24,
          left: `calc(${percent(maxVal)}% - 6px)`,
          width: 12,
          height: 28,
          zIndex: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ width: 4, height: 18, background: '#d32f2f', borderRadius: 2 }} />
          <div style={{ width: 12, height: 12, background: '#d32f2f', borderTopRightRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: 4, marginTop: -18 }} />
        </div>
        {/* Ticks along the track */}
        {Array.from({ length: 11 }).map((_, i) => {
          const year = min + Math.round(((max - min) / 10) * i);
          return (
            <div key={year} style={{ position: 'absolute', top: 52, left: `calc(${((year - min) / (max - min)) * 100}% - 1px)`, height: 10, width: 2, background: '#bbb', borderRadius: 2, zIndex: 5 }} />
          );
        })}
        {/* Year labels below ticks (only start, middle, end) */}
        <div style={{ position: 'absolute', top: 64, left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ minWidth: 30, textAlign: 'left' }}>{min}</span>
          <span style={{ minWidth: 30, textAlign: 'center' }}>{min + Math.round((max - min) / 2)}</span>
          <span style={{ minWidth: 30, textAlign: 'right' }}>{max}</span>
        </div>
        {/* Range inputs (custom flag thumb, pointer sync, separated area, FIXED sync with cursor) */}
        {/* Left thumb: area dari 0 sampai posisi maxVal */}
        <input
          type="range"
          min={min}
          max={maxVal - 1}
          value={minVal}
          onChange={e => {
            let v = Number(e.target.value);
            if (v >= maxVal) v = maxVal - 1;
            onChange([v, maxVal]);
          }}
          onMouseDown={() => setActiveThumb('left')}
          onTouchStart={() => setActiveThumb('left')}
          onBlur={() => setActiveThumb(null)}
          style={{ position: 'absolute', top: 36, left: 0, width: `${percent(maxVal)}%`, height: 24, background: 'transparent', zIndex: 20, WebkitAppearance: 'none', appearance: 'none', pointerEvents: 'auto', cursor: 'pointer' }}
          className="double-thumb-slider-flag double-thumb-slider-flag-left"
        />
        {/* Right thumb: area dari posisi minVal sampai 100% */}
        <input
          type="range"
          min={minVal + 1}
          max={max}
          value={maxVal}
          onChange={e => {
            let v = Number(e.target.value);
            if (v <= minVal) v = minVal + 1;
            onChange([minVal, v]);
          }}
          onMouseDown={() => setActiveThumb('right')}
          onTouchStart={() => setActiveThumb('right')}
          onBlur={() => setActiveThumb(null)}
          style={{ position: 'absolute', top: 36, left: `${percent(minVal)}%`, width: `${100 - percent(minVal)}%`, height: 24, background: 'transparent', zIndex: 21, WebkitAppearance: 'none', appearance: 'none', pointerEvents: 'auto', cursor: 'pointer' }}
          className="double-thumb-slider-flag double-thumb-slider-flag-right"
        />
      </div>
    </>
  );
};

/* CSS untuk benar-benar menghilangkan bulatan merah bawaan browser */
const style = document.createElement('style');
style.innerHTML = `
.double-thumb-slider-flag::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 32px;
  background: transparent;
  border: none;
  box-shadow: none;
  position: relative;
  left: -8px; /* geser flag agar center dengan pointer */
}
.double-thumb-slider-flag::-moz-range-thumb {
  width: 16px;
  height: 32px;
  background: transparent;
  border: none;
  box-shadow: none;
  position: relative;
  left: -8px;
}
.double-thumb-slider-flag::-ms-thumb {
  width: 16px;
  height: 32px;
  background: transparent;
  border: none;
  box-shadow: none;
  position: relative;
  left: -8px;
}
.double-thumb-slider-flag::-webkit-slider-thumb:after {
  content: '';
  display: block;
  position: absolute;
  left: 6px;
  top: 0;
  width: 4px;
  height: 18px;
  background: #d32f2f;
  border-radius: 2px;
}
.double-thumb-slider-flag::-webkit-slider-thumb:before {
  content: '';
  display: block;
  position: absolute;
  left: 6px;
  top: 0;
  width: 12px;
  height: 12px;
  background: #d32f2f;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: 4px;
  margin-top: -18px;
}
`;
if (!document.head.querySelector('style[data-double-thumb-slider-flag]')) {
  style.setAttribute('data-double-thumb-slider-flag', 'true');
  document.head.appendChild(style);
}

export default DoubleThumbSlider;
