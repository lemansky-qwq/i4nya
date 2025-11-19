// src/components/navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { getNumericIdByUid } from '../lib/pu';
import './navbar.css';

export default function Navbar({ handleChangeTheme, user }) {
  const [profileId, setProfileId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // 监听 user 变化，获取数字 ID
  useEffect(() => {
    if (!user) {
      setProfileId(null);
      return;
    }
    
    getNumericIdByUid(user.uid)
      .then(id => {
        setProfileId(id);
      })
      .catch(err => {
        console.error('获取用户ID失败:', err);
      });
  }, [user]);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  // 添加缺失的 handleProfileClick 函数
  const handleProfileClick = () => {
    if (profileId) {
      navigate(`/profile/${profileId}`);
    }
  };

  const handleSettings = () => {
    navigate(`/settings`);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="nav-link">首页</Link>
		<Link to="/announcements" className="nav-link">公告</Link>
        <Link to="/about" className="nav-link">关于</Link>
		<Link to="/chat" className="nav-link">聊天室</Link>
        <Link to="/games" className="nav-link">小游戏</Link>
		<Link to="/friends">好友列表</Link>
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-section">
            <span style={{ color: 'var(--nav-text)', marginRight: '1rem' }}>
              欢迎，{user.email}
            </span>
            {profileId !== null ? (
              <button 
                className="nav-button profile-button"
                onClick={handleProfileClick}
              >
                我的主页
              </button>
            ) : (
              <span className="loading-text">加载中...</span>
            )}
            <button className="nav-button settings-button" onClick={handleSettings}>
              设置
            </button>
          </div>
        ) : (
          <div className="auth-section">
            <Link to="/login" className="nav-button login-button">登录</Link>
            <Link to="/register" className="nav-button register-button">注册</Link>
          </div>
        )}
      </div>

      <div className="theme-toggle-button" onClick={toggleSidebar}>
        {isSidebarOpen ? '退' : '喵'}
      </div>

      <div className={`theme-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {['light', 'dark', 'spring', 'summer', 'autumn', 'winter', 'nightmare'].map(t => (
          <button key={t} onClick={() => handleChangeTheme(t)}>
            {t === 'light' ? '浅' :
             t === 'dark' ? '深' :
             t === 'spring' ? '春' :
             t === 'summer' ? '夏' :
             t === 'autumn' ? '秋' :
             t === 'winter' ? '冬' :
             '噩梦'}
          </button>
        ))}
      </div>
    </nav>
  );
}