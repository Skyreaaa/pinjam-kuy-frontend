import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
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
  LineElement
} from 'chart.js';
import axios from 'axios';
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
  LineElement
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
        const token = sessionStorage.getItem('admin_token');
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, topBooksRes, monthlyRes, activeLoansRes, outstandingFinesRes, notifStatsRes] = await Promise.all([
          axios.get('/api/admin/stats', { headers }),
          axios.get('/api/admin/stats/top-books', { headers }),
          axios.get('/api/admin/stats/monthly-activity', { headers }),
          axios.get('/api/admin/stats/active-loans', { headers }),
          axios.get('/api/admin/stats/outstanding-fines', { headers }),
          axios.get('/api/admin/stats/notification-stats', { headers })
        ]);
        setStats(statsRes.data);
        setTopBooks(topBooksRes.data);
        setMonthlyActivity(monthlyRes.data);
        setActiveLoans(activeLoansRes.data.activeLoans);
        setOutstandingFines(outstandingFinesRes.data.totalOutstandingFines);
        setNotifStats(notifStatsRes.data);
        setError(null);
      } catch (err: any) {
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
  const loanTrend = monthlyActivity.loans.map((item: any) => item.loanCount);
  const returnTrend = monthlyActivity.returns.map((item: any) => item.returnCount);
  const fineTrend = stats.fineTrends || Array(monthLabels.length).fill(stats.totalFines || 0);

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
        <DashboardCard title="Total Denda" value={`Rp ${stats.totalFines?.toLocaleString('id-ID') || 0}`} icon={<FaMoneyBillWave />} color="#e74a3b" />
      </div>
      <div className="charts-section" style={{ flexWrap: 'wrap', gap: 32 }}>
        <div className="chart-container">
          <h3>Pie Chart Komposisi Data</h3>
          <Pie data={pieData} />
        </div>
        <div className="chart-container">
          <h3>Tren User</h3>
          <SingleLineChart label="User" color="#4e73df" data={userTrend} labels={monthLabels} />
        </div>
        <div className="chart-container">
          <h3>Tren Buku</h3>
          <SingleLineChart label="Buku" color="#1cc88a" data={bookTrend} labels={monthLabels} />
        </div>
        <div className="chart-container">
          <h3>Tren Peminjaman</h3>
          <SingleLineChart label="Peminjaman" color="#36b9cc" data={loanTrend} labels={monthLabels} />
        </div>
        <div className="chart-container">
          <h3>Tren Pengembalian</h3>
          <SingleLineChart label="Pengembalian" color="#f6c23e" data={returnTrend} labels={monthLabels} />
        </div>
        <div className="chart-container">
          <h3>Tren Denda</h3>
          <SingleLineChart label="Denda" color="#e74a3b" data={fineTrend} labels={monthLabels} />
        </div>
      </div>
      <div className="extra-reports" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 32 }}>
        <DashboardCard title="Top 5 Buku Terpopuler" value={null} color="#36b9cc">
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {topBooks.map((book, idx) => (
              <li key={book.id}>
                <b>{book.title}</b> oleh {book.author} <span style={{ color: '#888' }}>({book.category})</span> — <span style={{ color: '#36b9cc' }}>{book.borrowCount}x dipinjam</span>
              </li>
            ))}
          </ol>
        </DashboardCard>
        <DashboardCard title="Pinjaman Aktif Saat Ini" value={activeLoans} color="#36b9cc" />
        <DashboardCard title="Total Denda Outstanding" value={`Rp ${outstandingFines?.toLocaleString('id-ID') || 0}`} color="#e74a3b" />
        <DashboardCard title="Statistik Notifikasi (30 hari)" value={null} color="#4e73df">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {notifStats.map((row, idx) => (
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
