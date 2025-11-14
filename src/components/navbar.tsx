import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './navbar.css';

interface NavbarProps {
  handleChangeTheme: (theme: string) => void;
  user: {
    id: string;
  } | null;
}

const Navbar: React.FC<NavbarProps> = ({ handleChangeTheme, user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const navigate = useNavigate();

  const themes = [
    { key: 'light', label: '浅' },
    { key: 'dark', label: '深' },
    { key: 'spring', label: '春' },
    { key: 'summer', label: '夏' },
    { key: 'autumn', label: '秋' },
    { key: 'winter', label: '冬' },
    { key: 'nightmare', label: '噩梦' },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchProfileId = async () => {
      if (!user) {
        setProfileId(null);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_uuid', user.id)
        .single();
      if (error) {
        console.error('获取 profile id 失败', error.message);
        setProfileId(null);
      } else if (isMounted && data) {
        setProfileId(data.id);
      }
    };
    fetchProfileId();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              <Link to={`/profile/${profileId}`} className="nav-button">我的主页</Link>
            ) : (
              <span className="nav-button">加载中...</span>
            )}
            <button type="button" className="nav-button" onClick={handleLogout}>
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
        {themes.map(({ key, label }) => (
          <button key={key} onClick={() => handleChangeTheme(key)}>{label}</button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
