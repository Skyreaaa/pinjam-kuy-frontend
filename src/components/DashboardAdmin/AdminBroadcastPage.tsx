
import React, { useState, useEffect, useMemo } from 'react';
import { FaBullhorn, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaInfoCircle, FaPaperPlane } from 'react-icons/fa';
import './AdminDashboard.css';
import EmptyState from '../common/EmptyState';
import { adminApi } from '../../services/api';

const typeMeta = {
  info: { color: '#3498db', icon: <FaInfoCircle /> },
  success: { color: '#2ecc71', icon: <FaCheckCircle /> },
  warning: { color: '#f1c40f', icon: <FaExclamationTriangle /> },
  error: { color: '#e74c3c', icon: <FaTimesCircle /> },
};

const AdminBroadcastPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info'|'success'|'warning'|'error'>('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string|null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [angkatanTab, setAngkatanTab] = useState<string>('');

  // Fetch user list for selection
  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.users();
        if (Array.isArray(data)) {
          // Exclude admin
          const filtered = data.filter((u:any) => u.role !== 'admin');
          setUsers(filtered);
          // Set default tab to first angkatan
          if (filtered.length && !angkatanTab) {
            const firstAngkatan = filtered[0].angkatan || '';
            setAngkatanTab(firstAngkatan);
          }
        }
      } catch(err) {
        console.error('Failed to fetch users:', err);
      }
    })();
    // eslint-disable-next-line
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/user/notifications?broadcast=1', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch {}
    setLoadingHistory(false);
  };
  useEffect(() => { fetchHistory(); }, []);

  const handleUserSelect = (id: number) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  // Group users by angkatan
  const usersByAngkatan = useMemo(() => {
    const map: Record<string, any[]> = {};
    users.forEach(u => {
      const key = u.angkatan || 'Lainnya';
      if (!map[key]) map[key] = [];
      map[key].push(u);
    });
    return map;
  }, [users]);

  const angkatanList = useMemo(() => Object.keys(usersByAngkatan).sort(), [usersByAngkatan]);

  // Filtered users for current tab and search
  const filteredUsers = useMemo(() => {
    let arr = usersByAngkatan[angkatanTab] || [];
    if (search.trim()) {
      arr = arr.filter(u => (u.npm || '').toLowerCase().includes(search.trim().toLowerCase()));
    }
    return arr;
  }, [usersByAngkatan, angkatanTab, search]);

  // Select all in current tab
  const handleSelectAll = () => {
    const ids = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) {
        // Unselect all
        return prev.filter(id => !ids.includes(id));
      } else {
        // Add all
        return Array.from(new Set([...prev, ...ids]));
      }
    });
  };

  // Check if user has loan due soon (expectedReturnDate < 3 days)
  const isDueSoon = (u: any) => {
    if (!u.activeLoans || !u.activeLoans.length) return false;
    const now = new Date();
    return u.activeLoans.some((loan: any) => {
      if (!loan.expectedReturnDate) return false;
      const due = new Date(loan.expectedReturnDate);
      const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 3;
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        methdata = await adminApi.broadcast({
        message,
        type,
        userIds: selectedUserIds.length ? selectedUserIds : undefined
      }
        setResult(selectedUserIds.length ? 'Broadcast berhasil dikirim ke user terpilih!' : 'Broadcast berhasil dikirim ke semua user!');
        setMessage('');
        setSelectedUserIds([]);
        fetchHistory();
      } else {
        setResult(data.message || 'Gagal mengirim broadcast.');
      }
    } catch (err) {
      setResult('Gagal mengirim broadcast.');
    }
    setSending(false);
  };

  return (
    <div className="admin-broadcast-page" style={{maxWidth: 600, margin: '0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <FaBullhorn size={32} color="#0056b3" />
        <h2 style={{margin:0}}>Broadcast Notifikasi ke Semua User</h2>
      </div>
      
      <form onSubmit={handleSend} className="broadcast-form-card" style={{background:'#fff',borderRadius:12,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.07)',marginBottom:32}}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tulis pesan broadcast..."
          rows={3}
          required
          style={{width:'100%',borderRadius:8,border:'1px solid #ccc',padding:12,fontSize:16,resize:'vertical',marginBottom:12}}
        />
        <div style={{ display:'flex', gap:16, marginBottom:16 }}>
          {(['info','success','warning','error'] as const).map(t => (
            <label key={t} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:typeMeta[t].color,fontWeight:type===t?700:400}}>
              <input type="radio" name="type" value={t} checked={type===t} onChange={()=>setType(t)} style={{accentColor:typeMeta[t].color}} />
              {typeMeta[t].icon} {t.charAt(0).toUpperCase()+t.slice(1)}
            </label>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontWeight:600,marginBottom:4,display:'block'}}>Pilih User (opsional, kosongkan untuk broadcast ke semua):</label>
          <div style={{marginBottom:8,display:'flex',gap:8,alignItems:'center'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari NPM..." style={{padding:'4px 8px',border:'1px solid #ccc',borderRadius:4}} />
            <span style={{fontSize:13,color:'#888'}}>Filter by angkatan:</span>
            {angkatanList.map(ang => (
              <button key={ang} type="button" onClick={()=>setAngkatanTab(ang)} style={{padding:'2px 10px',borderRadius:6,border:'none',background:angkatanTab===ang?'#3498db':'#eee',color:angkatanTab===ang?'#fff':'#333',fontWeight:angkatanTab===ang?700:400,marginRight:2}}>{ang}</button>
            ))}
          </div>
          <div style={{marginBottom:6}}>
            <label style={{display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer',fontWeight:500}}>
              <input type="checkbox" checked={filteredUsers.length>0 && filteredUsers.every(u=>selectedUserIds.includes(u.id))} onChange={handleSelectAll} />
              Pilih Semua di Tab Ini
            </label>
          </div>
          <div style={{maxHeight:120,overflowY:'auto',border:'1px solid #eee',borderRadius:6,padding:8,background:'#fafbfc'}}>
            {filteredUsers.map(u => (
              <label key={u.id} style={{display:'inline-flex',alignItems:'center',gap:6,marginRight:12,marginBottom:6,cursor:'pointer',background:isDueSoon(u)?'#fffbe6':'',borderRadius:4,padding:isDueSoon(u)?'2px 6px':'0'}}>
                <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={()=>handleUserSelect(u.id)} />
                {u.username} <span style={{color:'#888',fontSize:12}}>({u.npm})</span>
                {isDueSoon(u) && <span style={{color:'#e67e22',fontSize:11,fontWeight:600,marginLeft:4}}>Masa Tenggang</span>}
              </label>
            ))}
            {filteredUsers.length === 0 && <span style={{color:'#aaa'}}>Tidak ada user.</span>}
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{fontSize:18,padding:'10px 24px',display:'flex',alignItems:'center',gap:8}} disabled={sending || !message.trim()}>
          <FaPaperPlane /> {sending ? 'Mengirim...' : 'Kirim Broadcast'}
        </button>
        {result && <div style={{ marginTop: 16, color: result.includes('berhasil') ? '#2ecc71' : '#e74c3c', fontWeight:600 }}>{result}</div>}
      </form>

      <h3 style={{marginBottom:12}}>Riwayat Broadcast</h3>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {loadingHistory && <div>Memuat riwayat...</div>}
        {!loadingHistory && history.length === 0 && (
          <EmptyState
            icon="📢"
            title="Belum ada broadcast"
            description="Riwayat broadcast yang Anda kirim akan muncul di sini"
          />
        )}
        {history.map((item:any) => (
          <div key={item.id} style={{background:'#f8faff',borderRadius:10,padding:'14px 18px',boxShadow:'0 1px 6px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:22,color:typeMeta[item.type]?.color||'#888'}}>{typeMeta[item.type]?.icon||<FaInfoCircle/>}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,color:typeMeta[item.type]?.color||'#333',marginBottom:2}}>{item.type.charAt(0).toUpperCase()+item.type.slice(1)}</div>
              <div style={{fontSize:16}}>{item.message}</div>
              <div style={{fontSize:12,color:'#888',marginTop:4}}>{new Date(item.createdAt).toLocaleString('id-ID')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBroadcastPage;
