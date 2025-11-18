import { useState, useEffect } from 'react'; // 添加 useEffect
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function Settings() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  const [currentUser, setCurrentUser] = useState(null); // 添加用户状态
  const navigate = useNavigate();

  // 检查登录状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        navigate('/login');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('登出失败:', error);
      setError('登出失败: ' + error.message);
    }
  };

  const handleDeleteAccount = () => {
    setMessage('账户注销功能暂未开放，请联系管理员');
  };

  // 如果未登录，显示加载中
  if (!currentUser) {
    return (
      <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <p className="text-primary">加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 className="text-primary" style={{ marginBottom: '2rem' }}>设置</h1>
      
      {/* 标签导航 */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--card-border)',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('account')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'account' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'account' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          账户设置
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'friends' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'friends' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          好友管理
        </button>
		
      </div>

      {/* 账户设置 */}
      {activeTab === 'account' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="text-primary" style={{ marginTop: 0, marginBottom: '1.5rem' }}>账户设置</h3>
          
          <div style={{ marginBottom: '2rem' }}>
            <h4 className="text-primary" style={{ marginBottom: '0.5rem' }}>账户注销</h4>
            <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              永久删除您的账户和所有数据
            </p>
            <button 
              onClick={handleDeleteAccount}
              className="btn btn-secondary"
            >
              注销账户（暂未开放）
            </button>
          </div>
        </div>
      )}

      {/* 好友管理 */}
      {activeTab === 'friends' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="text-primary" style={{ marginTop: 0, marginBottom: '1rem' }}>好友管理</h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            管理您的好友列表和好友请求
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link 
              to="/friends"
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              好友列表
            </Link>
            <Link 
              to="/friends/requests"
              className="btn btn-warning"
              style={{ textDecoration: 'none' }}
            >
              好友请求
            </Link>
          </div>
        </div>
      )}

      {/* 会话管理 */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 className="text-primary" style={{ marginTop: 0, marginBottom: '1rem' }}>会话管理</h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          当前登录账户: <span className="text-primary">{auth.currentUser?.email}</span>
        </p>
        <button 
          onClick={handleLogout}
          className="btn btn-danger"
        >
          退出登录
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div style={{
          marginTop: '1rem',
          padding: '12px',
          background: 'var(--success-bg)',
          color: 'var(--success-color)',
          borderRadius: '6px',
          border: '1px solid var(--success-border)'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '12px',
          background: 'var(--error-bg)',
          color: 'var(--error-color)',
          borderRadius: '6px',
          border: '1px solid var(--error-border)'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}