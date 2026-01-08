import React, { useEffect, useState } from 'react';
import { bookApi, normalizeBook } from '../../services/api';
import EmptyState from '../common/EmptyState';

interface AdminBooksPageProps {
    onEditBook: (book: any) => void;
    onDeleteBook: (book: any) => void;
    books: any[];
    loading: boolean;
    error: string | null;
}


const AdminBooksPage: React.FC<AdminBooksPageProps> = ({ onEditBook, onDeleteBook, books, loading, error }) => {

    return (
        <div>
            <h3>Manajemen Buku</h3>
            {loading && <p>Memuat data...</p>}
            {error && <p style={{color:'red'}}>{error}</p>}
            {!loading && !error && books && books.length > 0 && (
                <table className="admin-list-table">
                    <thead>
                        <tr>
                            <th>Cover</th>
                            <th>Kode Buku</th>
                            <th>Judul</th>
                            <th>Penulis</th>
                            <th>Tahun</th>
                            <th>Stok</th>
                            <th>Stok Tersedia</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((b:any) => (
                            <tr key={b.id}>
                                <td>
                                    {b.imageUrl ? (
                                        <img src={b.imageUrl} alt={b.judul} style={{width:48, height:64, objectFit:'cover', borderRadius:4, border:'1px solid #ccc', background:'#f8f8f8'}} />
                                    ) : (
                                        <div style={{width:48, height:64, background:'#eee', borderRadius:4, display:'flex',alignItems:'center',justifyContent:'center',color:'#aaa',fontSize:12}}>No Cover</div>
                                    )}
                                </td>
                                <td>{b.kodeBuku}</td>
                                <td>{b.judul}</td>
                                <td>{b.penulis}</td>
                                <td>{b.year}</td>
                                <td>{b.totalStock}</td>
                                <td>{b.availableStock}</td>
                                <td>
                                    <button className="btn btn-sm btn-edit" onClick={() => onEditBook(b)}>Edit</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => onDeleteBook(b)} style={{marginLeft: 8}}>Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {!loading && !error && books && books.length === 0 && (
                <EmptyState
                    icon="📚"
                    title="Belum ada buku"
                    description="Tambahkan buku pertama dengan klik tombol di atas"
                />
            )}
        </div>
    );
};

export default AdminBooksPage;
