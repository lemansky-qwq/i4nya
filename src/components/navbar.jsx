// src/components/navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getNumericIdByUid } from '../lib/pu';
import './navbar.css'; // 保留你的 CSS 文件

export default function Navbar({ handleChangeTheme, user }) {
  const [profileId, setProfileId] = useState(null); // 加类型（可选）
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // 登录后获取数字 ID
  useEffect(() => {
    if (!user) {
      setProfileId(null);
      return;
    }
    getNumericIdByUid(user.uid).then(id => setProfileId(id));
  }, [user]);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };


  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">首页</Link>
        <Link to="/about">关于</Link>
        <Link to="/games">小游戏</Link>
      </div>

      <div className="navbar-right">
        {user ? (
          <>
            {profileId !== null ? (
              <Link to={`/profile/${profileId}`} className="nav-button">
                我的主页
              </Link>
            ) : (
              <span className="nav-button">加载中...</span>
            )}
            <button className="nav-button" onClick={handleLogout}>
              登出
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-button">登录</Link>
            <Link to="/register" className="nav-button">注册</Link>
          </>
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