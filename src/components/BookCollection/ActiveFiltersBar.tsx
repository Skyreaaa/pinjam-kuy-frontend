import React from 'react';
import { FaCalendar, FaCheckSquare, FaFileAlt, FaBook, FaMapMarkerAlt, FaLanguage, FaUniversity, FaLayerGroup } from 'react-icons/fa';

const filterIcons: any = {
  tahun: <FaCalendar />,
  tersedia: <FaCheckSquare />,
  lampiran: <FaFileAlt />,
  jenisKoleksi: <FaBook />,
  pemusatan: <FaLayerGroup />,
  lokasi: <FaMapMarkerAlt />,
  bahasa: <FaLanguage />,
  prodi: <FaUniversity />,
};

const filterLabels: any = {
  tahun: 'Tahun Terbit',
  tersedia: 'Tersedia',
  lampiran: 'Lampiran',
  jenisKoleksi: 'Jenis Koleksi',
  pemusatan: 'Pemusatan Materi',
  lokasi: 'Lokasi',
  bahasa: 'Bahasa',
  prodi: 'Program Studi',
};

const ActiveFiltersBar = ({ filters, onEdit }) => {
  const chips: any[] = [];
  if (filters.tahunFrom || filters.tahunTo) {
    chips.push({
      key: 'tahun',
      label: `${filters.tahunFrom || ''}${filters.tahunFrom && filters.tahunTo ? ' - ' : ''}${filters.tahunTo || ''}`,
      icon: filterIcons.tahun,
    });
  }
  Object.keys(filters).forEach(key => {
    if (['tahunFrom','tahunTo','minRating'].includes(key)) return;
    if (Array.isArray(filters[key]) && filters[key].length) {
      chips.push({
        key,
        label: filters[key].join(', '),
        icon: filterIcons[key],
      });
    }
    if (key === 'minRating' && filters.minRating > 0) {
      chips.push({
        key: 'minRating',
        label: `Rating ≥ ${filters.minRating}`,
        icon: <FaBook />,
      });
    }
  });
  if (chips.length === 0) return null;
  return (
    <div className="active-filters-bar">
      <span style={{fontWeight:500,marginRight:8}}>Difilter dengan:</span>
      {chips.map(chip => (
        <span className="filter-chip" key={chip.key} onClick={() => onEdit(chip.key)}>
          <span className="chip-icon">{chip.icon}</span>
          {filterLabels[chip.key] || chip.key}: <span className="chip-label">{chip.label}</span>
        </span>
      ))}
    </div>
  );
};

export default ActiveFiltersBar;
