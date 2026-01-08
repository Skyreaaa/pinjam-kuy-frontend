import DoubleThumbSlider from './DoubleThumbSlider';
import React, { useState } from 'react';
import { FaCalendar, FaCheckSquare, FaFileAlt, FaBook, FaMapMarkerAlt, FaLanguage, FaUniversity, FaLayerGroup } from 'react-icons/fa';
import './FilterSidebar.css';

const filterData = {
  tahun: { label: 'Tahun Terbit', icon: <FaCalendar />, type: 'range', min: 1950, max: 2026 },
  tersedia: { label: 'Tersedianya', icon: <FaCheckSquare />, options: ['Tersedia'] },
  lampiran: { label: 'Lampiran', icon: <FaFileAlt />, options: ['PDF', 'Video'] },
  jenisKoleksi: { label: 'Jenis Koleksi', icon: <FaBook />, options: ['Buku Asli', 'Buku Salinan'] },
  pemusatan: { label: 'Pemusatan Materi', icon: <FaLayerGroup />, options: [
    'Teknik', 'Manajemen', 'Ekonomi', 'Hukum', 'Kedokteran', 'Matematika', 'Biologi', 'Komputer', 'Psikologi', 'Sastra', 'Agama', 'Sejarah', 'Seni', 'Musik', 'DVD', 'Majalah', 'Jurnal Nasional', 'Jurnal Internasional', 'Bahan Referensi', 'Buku Anak', 'Buku Komik', 'Buku Cerita', 'Buku Bahasa', 'Buku Sains', 'Buku Sosial', 'Buku Teknologi', 'Buku Internasional', 'Buku Indonesia', 'Buku Fiksi', 'Buku Nonfiksi', 'Buku Ilmiah', 'Buku Populer', 'Buku Pendidikan', 'Buku Penelitian', 'Buku Referensi', 'Buku Teks', 'Buku Umum', 'Buku Khusus', 'Buku Lainnya'
  ] },
  lokasi: { label: 'Lokasi', icon: <FaMapMarkerAlt />, options: ['Gedung Pascasarjana', 'Gedung Perkuliahan Lt. 2', 'Gedung Perkuliahan Lt. 3'] },
  bahasa: { label: 'Bahasa', icon: <FaLanguage />, options: ['Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Jepang'] },
  prodi: { label: 'Program Studi', icon: <FaUniversity />, options: [
    'Doktor Ilmu Manajemen', 'S1 - Teknik', 'S1 - Hukum', 'S1 - Ekonomi', 'S1 - Kedokteran', 'S1 - Matematika', 'S1 - Biologi', 'S1 - Komputer', 'S1 - Psikologi', 'S1 - Sastra', 'S1 - Agama', 'S1 - Sejarah', 'S1 - Seni', 'S1 - Musik', 'S1 - DVD', 'S1 - Majalah', 'S1 - Jurnal Nasional', 'S1 - Jurnal Internasional', 'S1 - Bahan Referensi', 'S1 - Buku Anak', 'S1 - Buku Komik', 'S1 - Buku Cerita', 'S1 - Buku Bahasa', 'S1 - Buku Sains', 'S1 - Buku Sosial', 'S1 - Buku Teknologi', 'S1 - Buku Internasional', 'S1 - Buku Indonesia', 'S1 - Buku Fiksi', 'S1 - Buku Nonfiksi', 'S1 - Buku Ilmiah', 'S1 - Buku Populer', 'S1 - Buku Pendidikan', 'S1 - Buku Penelitian', 'S1 - Buku Referensi', 'S1 - Buku Teks', 'S1 - Buku Umum', 'S1 - Buku Khusus', 'S1 - Buku Lainnya'
  ] },
};

const FilterSidebar = ({ filters, setFilters, onApply, onReset }) => {
  // Collapse all filter groups by default (true), except tahun (false)
  const initialCollapse = { tahun: false };
  Object.keys(filterData).forEach(k => { if (k !== 'tahun') initialCollapse[k] = true; });
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>(initialCollapse);

  const handleCollapse = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Modal state for 'Lihat Semua' (popover below group)
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [modalTemp, setModalTemp] = useState<string[]>([]);

  // Helper: apakah opsi terlalu banyak?
  const isManyOptions = (key: string) => (filterData[key]?.options?.length || 0) > 10;

  return (
    <aside className="filter-sidebar">
      <h3 className="filter-title">Difilter dengan</h3>
      <div className="filter-section">
        {/* Tahun Terbit (Range Slider) */}
        <div className="filter-group">
          <div className="filter-label" onClick={() => handleCollapse('tahun')}>
            <span style={{marginRight:6}}>{filterData.tahun.icon}</span>
            {filterData.tahun.label}
            <span className="collapse-arrow">{collapsed.tahun ? '▼' : '▲'}</span>
          </div>
          {!collapsed.tahun && (
            <div className="filter-range-slider">
              <div style={{fontWeight:600,marginBottom:'0.3em',fontSize:'0.98em',textAlign:'center'}}>
                Dari {filters.tahunFrom || filterData.tahun.min} - {filters.tahunTo || filterData.tahun.max}
              </div>
              <DoubleThumbSlider
                min={filterData.tahun.min}
                max={filterData.tahun.max}
                value={[
                  filters.tahunFrom || filterData.tahun.min,
                  filters.tahunTo || filterData.tahun.max
                ]}
                onChange={([minVal, maxVal]) => setFilters(f => ({ ...f, tahunFrom: minVal, tahunTo: maxVal }))}
              />
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.95em',marginTop:'0.3em'}}>
                
              </div>
            </div>
          )}
        </div>
        {/* Checkbox Filters */}
        {Object.entries(filterData)
          .filter(([k, v]) => k !== 'tahun' && 'options' in v)
          .map(([key, data]) => (
            <div className="filter-group" key={key}>
              <div className="filter-label" onClick={() => handleCollapse(key)}>
                <span style={{marginRight:6}}>{data.icon}</span>
                {data.label}
                <span className="collapse-arrow">{collapsed[key] ? '▼' : '▲'}</span>
              </div>
              {!collapsed[key] && (
                <div className="filter-options">
                  {(data as any).options.map((opt: string) => (
                    <label key={opt} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters[key]?.includes(opt) || false}
                        onChange={e => {
                          setFilters(f => {
                            const arr = f[key] || [];
                            if (e.target.checked) return { ...f, [key]: [...arr, opt] };
                            return { ...f, [key]: arr.filter((x: string) => x !== opt) };
                          });
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
      <div className="filter-actions">
        <button className="filter-btn" onClick={onApply}>Terapkan</button>
        <button className="filter-btn" onClick={onReset}>Reset</button>
      </div>
      {/* No global modal for pilihan banyak; handled inline as popover */}
    </aside>
  );
};

export default FilterSidebar;
