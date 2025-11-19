import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { signOut, unlink } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function Settings() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // 检查登录状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        navigate('/login');
      } else {
        // 用户登录后更新关联账户列表
        setLinkedAccounts(getLinkedAccounts(user));
      }
    });
    return unsubscribe;
  }, [navigate]);

  // 获取已关联的账户
  const getLinkedAccounts = (user) => {
    if (!user) return [];
    
    const providers = user.providerData.map(provider => ({
      id: provider.providerId,
      name: getProviderName(provider.providerId),
      email: provider.email,
      canUnlink: user.providerData.length > 1 // 至少保留一个登录方式
    }));
    return providers;
  };

  // 获取提供商名称
  const getProviderName = (providerId) => {
    const names = {
      'password': '邮箱密码',
      'google.com': 'Google',
      'github.com': 'GitHub'
    };
    return names[providerId] || providerId;
  };

  // 解除账户关联
  const unlinkAccount = async (providerId) => {
    try {
      await unlink(currentUser, providerId);
      setMessage('账户解绑成功');
      setLinkedAccounts(getLinkedAccounts(currentUser));
      
      // 更新本地状态
      setTimeout(() => {
        setCurrentUser(auth.currentUser);
      }, 1000);
    } catch (error) {
      if (error.code === 'auth/no-such-provider') {
        setError('该登录方式未关联');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('为了安全，请重新登录后再执行此操作');
      } else {
        setError('解绑失败: ' + error.message);
      }
    }
  };

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
        <div className="card">
          <p className="text-primary">加载中...</p>
        </div>
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
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('account')}
          className="btn"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'account' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'account' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1rem',
            borderRadius: '0'
          }}
        >
          账户设置
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className="btn"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'friends' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'friends' ? 'var(--primary-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1rem',
            borderRadius: '0'
          }}
        >
          好友管理
        </button>
      </div>

      {/* 账户设置 */}
      {activeTab === 'account' && (
        <div>
          {/* 基本信息卡片 */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 className="text-primary" style={{ marginTop: 0, marginBottom: '1rem' }}>账户信息</h3>
            
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <div>
                <p className="text-secondary" style={{ margin: 0, fontSize: '0.9em' }}>邮箱</p>
                <p className="text-primary" style={{ margin: 0, fontWeight: 'bold' }}>
                  {currentUser.email}
                  {currentUser.emailVerified && (
                    <span style={{ 
                      color: 'var(--success-color)', 
                      fontSize: '0.8em', 
                      marginLeft: '0.5rem' 
                    }}>
                      ✓ 已验证
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-secondary" style={{ margin: 0, fontSize: '0.9em' }}>昵称</p>
                <p className="text-primary" style={{ margin: 0, fontWeight: 'bold' }}>
                  {currentUser.displayName || '未设置'}
                </p>
              </div>
              
              <div>
                <p className="text-secondary" style={{ margin: 0, fontSize: '0.9em' }}>注册时间</p>
                <p className="text-primary" style={{ margin: 0, fontWeight: 'bold' }}>
                  {currentUser.metadata.creationTime ? 
                    new Date(currentUser.metadata.creationTime).toLocaleDateString('zh-CN') : 
                    '未知'}
                </p>
              </div>
            </div>
          </div>

          {/* 账户关联卡片 */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 className="text-primary" style={{ marginTop: 0, marginBottom: '1rem' }}>登录方式管理</h3>
            <p className="text-secondary" style={{ fontSize: '0.9em', marginBottom: '1.5rem' }}>
              管理您账户的登录方式，可以关联多个第三方账户方便登录
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 className="text-primary" style={{ marginBottom: '0.5rem' }}>已关联的登录方式</h4>
              {linkedAccounts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {linkedAccounts.map(provider => (
                    <div key={provider.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '6px'
                    }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {provider.name}
                        </span>
                        {provider.email && (
                          <span className="text-secondary" style={{ fontSize: '0.8em', marginLeft: '0.5rem' }}>
                            ({provider.email})
                          </span>
                        )}
                      </div>
                      {provider.canUnlink ? (
                        <button 
                          onClick={() => unlinkAccount(provider.id)}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          解绑
                        </button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.8em' }}>
                          至少保留一种登录方式
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>
                  暂无关联账户
                </p>
              )}
            </div>

            <Link 
              to="/link-account" 
              className="btn btn-primary"
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                textDecoration: 'none',
                width: '91%'
              }}
            >
              🔗 关联新的登录方式
            </Link>
          </div>

          {/* 账户注销卡片 */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 className="text-primary" style={{ marginTop: 0, marginBottom: '1rem' }}>账户注销</h3>
            <p className="text-secondary" style={{ fontSize: '0.9em', marginBottom: '1rem' }}>
              永久删除您的账户和所有数据，此操作不可撤销
            </p>
            <button 
              onClick={handleDeleteAccount}
              className="btn btn-secondary"
              style={{ width: '100%' }}
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
          <p className="text-secondary" style={{ fontSize: '0.9em', marginBottom: '1.5rem' }}>
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
        <p className="text-secondary" style={{ fontSize: '0.9em', marginBottom: '1rem' }}>
          当前登录账户: <span className="text-primary">{currentUser?.email}</span>
        </p>
        <button 
          onClick={handleLogout}
          className="btn btn-danger"
          style={{ width: '100%' }}
        >
          退出登录
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className="card" style={{
          marginTop: '1rem',
          background: 'var(--success-bg)',
          color: 'var(--success-color)',
          border: '1px solid var(--success-border)'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div className="card" style={{
          marginTop: '1rem',
          background: 'var(--error-bg)',
          color: 'var(--error-color)',
          border: '1px solid var(--error-border)'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}