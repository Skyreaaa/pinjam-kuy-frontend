import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import EmptyState from '../common/EmptyState';

interface AdminUsersPageProps {
    onEditUser: (user: any) => void;
    onDeleteUser: (user: any) => void;
    users: any[];
    loading: boolean;
    error: string | null;
}


const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onEditUser, onDeleteUser, users, loading, error }) => {

    return (
        <div>
            <h3>Manajemen Pengguna</h3>
            {loading && <p>Memuat data...</p>}
            {error && <p style={{color:'red'}}>{error}</p>}
            {!loading && !error && users && users.length > 0 && (
                <table className="admin-list-table">
                    <thead>
                        <tr>
                            <th>NPM</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Fakultas</th>
                            <th>Prodi</th>
                            <th>Angkatan</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u:any) => (
                            <tr key={u.id}>
                                <td>{u.npm}</td>
                                <td>{u.username}</td>
                                <td>{u.role}</td>
                                <td>{u.fakultas}</td>
                                <td>{u.prodi}</td>
                                <td>{u.angkatan}</td>
                                <td>
                                    <button className="btn btn-sm btn-edit" onClick={() => onEditUser(u)}>Edit</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => onDeleteUser(u)} style={{marginLeft: 8}}>Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {!loading && !error && users && users.length === 0 && (
                <EmptyState
                    icon="👥"
                    title="Belum ada user terdaftar"
                    description="User yang mendaftar akan muncul di sini"
                />
            )}
        </div>
    );
};

export default AdminUsersPage;
