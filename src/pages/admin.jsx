// src/pages/admin.jsx
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { getProfileByUid, isAdmin, updateUserRole, getAllUsers } from '../lib/pu';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userIsAdmin = await isAdmin(user.uid);
      if (!userIsAdmin) {
        alert('无权访问管理面板');
        navigate('/');
        return;
      }

      setCurrentUser(user);
      loadUsers();
    };

    checkAccess();
  }, [navigate]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      alert('加载用户列表失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(currentUser.uid, userId, newRole);
      alert('用户角色更新成功');
      loadUsers(); // 重新加载列表
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <p className="text-primary">加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 className="text-primary">管理面板</h1>
      
      <div className="card">
        <h2 className="text-primary">用户管理</h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>昵称</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>UID</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>角色</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>注册时间</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '1rem' }}>{user.id}</td>
                  <td style={{ padding: '1rem' }}>{user.nickname}</td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem' }} title={user.uid}>
                    {user.uid?.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      background: user.role === 'admin' ? 'var(--warning-color)' : 'var(--secondary-color)',
                      color: 'white',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleRoleChange(user.uid, 'admin')}
                        className="btn btn-warning"
                        style={{ fontSize: '0.8rem' }}
                      >
                        设为管理员
                      </button>
                    )}
                    {user.role === 'admin' && user.id !== 1 && (
                      <button
                        onClick={() => handleRoleChange(user.uid, 'user')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem' }}
                      >
                        取消管理员
                      </button>
                    )}
                    {user.id === 1 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        超级管理员
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem' }}>
            暂无用户数据
          </p>
        )}
      </div>

      {/* 系统信息卡片 */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="text-primary">系统信息</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p className="text-secondary">总用户数</p>
            <p className="text-primary" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {users.length}
            </p>
          </div>
          <div>
            <p className="text-secondary">管理员数</p>
            <p className="text-primary" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {users.filter(u => u.role === 'admin').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}