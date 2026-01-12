import React, { useEffect, useState } from 'react';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { adminApiAxios } from '../../services/api';
import './DashboardState.css';
import QRCodeDisplay from '../common/QRCodeDisplay';
import DashboardCard from './DashboardCard';
import SingleLineChart from './SingleLineChart';
import { FaUsers, FaBook, FaExchangeAlt, FaUndo, FaMoneyBillWave } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);


const DashboardState: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [topBooks, setTopBooks] = useState<any[]>([]);
  const [monthlyActivity, setMonthlyActivity] = useState<any>({ loans: [], returns: [] });
  const [activeLoans, setActiveLoans] = useState<number>(0);
  const [outstandingFines, setOutstandingFines] = useState<number>(0);
  const [notifStats, setNotifStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        console.log('[DASHBOARD] Fetching all statistics...');
        const [statsRes, topBooksRes, monthlyRes, activeLoansRes, outstandingFinesRes, notifStatsRes] = await Promise.all([
          adminApiAxios.get('/admin/stats'),
          adminApiAxios.get('/admin/stats/top-books'),
          adminApiAxios.get('/admin/stats/monthly-activity'),
          adminApiAxios.get('/admin/stats/active-loans'),
          adminApiAxios.get('/admin/stats/outstanding-fines'),
          adminApiAxios.get('/admin/stats/notification-stats')
        ]);
        console.log('[DASHBOARD] Stats:', statsRes.data);
        console.log('[DASHBOARD] Top Books:', topBooksRes.data);
        console.log('[DASHBOARD] Monthly Activity:', monthlyRes.data);
        setStats(statsRes.data);
        setTopBooks(Array.isArray(topBooksRes.data) ? topBooksRes.data : []);
        setMonthlyActivity(monthlyRes.data);
        setActiveLoans(activeLoansRes.data.activeLoans || 0);
        setOutstandingFines(outstandingFinesRes.data.totalOutstandingFines || 0);
        setNotifStats(Array.isArray(notifStatsRes.data) ? notifStatsRes.data : []);
        setError(null);
      } catch (err: any) {
        console.error('[DASHBOARD] Error fetching stats:', err);
        setError('Gagal memuat statistik.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllStats();
  }, []);

  if (loading) return <div className="dashboard-state-page">Loading statistik...</div>;
  if (error) return <div className="dashboard-state-page error">{error}</div>;
  if (!stats) return <div className="dashboard-state-page">Tidak ada data statistik.</div>;

  // Data untuk chart

  // Pie chart tetap sama

  const pieData = {
    labels: ['User', 'Buku', 'Peminjaman', 'Pengembalian', 'Denda'],
    datasets: [
      {
        label: 'Total',
        data: [
          stats.totalUsers,
          stats.totalBooks,
          stats.totalLoans,
          stats.totalReturns,
          stats.totalFines || 0
        ],
        backgroundColor: [
          '#4e73df',
          '#1cc88a',
          '#36b9cc',
          '#f6c23e',
          '#e74a3b'
        ],
      },
    ],
  };

  // Chart labels (bulanan, bisa diubah ke harian/tahunan jika backend siap)
  const monthLabels = Array.isArray(monthlyActivity.loans)
    ? monthlyActivity.loans.map((item: any) => item.month)
    : [];
  // Data tren per kategori (dummy, backend perlu support jika ingin harian/tahunan)
  const userTrend = stats.userTrends || Array(monthLabels.length).fill(stats.totalUsers);
  const bookTrend = stats.bookTrends || Array(monthLabels.length).fill(stats.totalBooks);
  const loanTrend = Array.isArray(monthlyActivity.loans) ? monthlyActivity.loans.map((item: any) => item.loancount || item.loanCount) : [];
  const returnTrend = Array.isArray(monthlyActivity.returns) ? monthlyActivity.returns.map((item: any) => item.returncount || item.returnCount) : [];
  const fineTrend = stats.fineTrends || Array(monthLabels.length).fill(stats.totalFines || 0);

  // Data untuk multi-line chart (semua tren dalam satu chart)
  const multiLineData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'User',
        data: userTrend,
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Buku',
        data: bookTrend,
        borderColor: '#1cc88a',
        backgroundColor: 'rgba(28, 200, 138, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Peminjaman',
        data: loanTrend,
        borderColor: '#36b9cc',
        backgroundColor: 'rgba(54, 185, 204, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Pengembalian',
        data: returnTrend,
        borderColor: '#f6c23e',
        backgroundColor: 'rgba(246, 194, 62, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Denda',
        data: fineTrend,
        borderColor: '#e74a3b',
        backgroundColor: 'rgba(231, 74, 59, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const multiLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: 'Tren Data Sistem',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Fungsi format singkat angka denda
  function formatShortIDR(n: number) {
    if (n >= 1_000_000_000) return (n/1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace(/\.0$/, '') + 'Jt';
    if (n >= 1_000) return (n/1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
  }

  return (
    <div className="dashboard-state-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Dashboard Admin</h2>
        <button className="btn btn-secondary" style={{ marginRight: 8 }} onClick={() => window.dispatchEvent(new CustomEvent('openAdminQRScan'))}>
          Scan QR
        </button>
      </div>
      <div className="stats-grid">
        <DashboardCard title="Total User" value={stats.totalUsers} icon={<FaUsers />} color="#4e73df" />
        <DashboardCard title="Total Buku" value={stats.totalBooks} icon={<FaBook />} color="#1cc88a" />
        <DashboardCard title="Total Peminjaman" value={stats.totalLoans} icon={<FaExchangeAlt />} color="#36b9cc" />
        <DashboardCard title="Total Pengembalian" value={stats.totalReturns} icon={<FaUndo />} color="#f6c23e" />
        <DashboardCard title="Total Denda" value={`Rp ${formatShortIDR(Number(stats.totalFines)||0)}`} icon={<FaMoneyBillWave />} color="#e74a3b" />
      </div>
      <div className="charts-section" style={{ flexWrap: 'wrap', gap: 32 }}>
        <div className="chart-container">
          <h3>Pie Chart Komposisi Data</h3>
          <Pie data={pieData} />
        </div>
        <div className="chart-container" style={{ width: '100%', minHeight: '400px' }}>
          <Line data={multiLineData} options={multiLineOptions} />
        </div>
      </div>
      <div className="extra-reports" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 32 }}>
        <DashboardCard title="Top 5 Buku Terpopuler" value={null} color="#36b9cc">
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {Array.isArray(topBooks) && topBooks.map((book, idx) => (
              <li key={book.id}>
                <b>{book.title}</b> oleh {book.author} <span style={{ color: '#888' }}>({book.category})</span> — <span style={{ color: '#36b9cc' }}>{book.borrowcount || book.borrowCount}x dipinjam</span>
              </li>
            ))}
          </ol>
        </DashboardCard>
        <DashboardCard title="Pinjaman Aktif Saat Ini" value={activeLoans} color="#36b9cc" />
        <DashboardCard title="Total Denda Outstanding" value={`Rp ${outstandingFines?.toLocaleString('id-ID') || 0}`} color="#e74a3b" />
        <DashboardCard title="Statistik Notifikasi (30 hari)" value={null} color="#4e73df">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {Array.isArray(notifStats) && notifStats.map((row, idx) => (
              <li key={row.date}>
                {row.date}: <span style={{ color: '#4e73df', fontWeight: 500 }}>{row.notifCount}</span> notifikasi
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
};

export default DashboardState;
