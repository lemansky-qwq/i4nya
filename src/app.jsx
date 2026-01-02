// src/app.jsx
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { createProfile, getNumericIdByUid, updateLastLogin } from './lib/pu';

// 确保所有组件都正确导入
import Home from './pages/home';
import About from './pages/about';
import Games from './pages/games/games';
import GameClick from './pages/games/gameclick';
import NotFound from './pages/notfound';
import Navbar from './components/navbar';
import JumpGame from './pages/games/jump';
import Game2048 from './pages/games/2048';
import Login from './pages/login';
import Register from './pages/register';
import Profile from './pages/profile';
import Settings from './pages/settings';
import Leaderboard from './pages/games/score';
import ForgotPassword from './pages/forgot-password';
import Friends from './pages/friends';
import FriendRequests from './pages/friends/requests';
import Admin from './pages/admin';
import Announcements from './pages/announcements';
import Alert from './components/Alert';
import ChatPage from './pages/chat';
import Giscus from './pages/giscus';
import Mathma from './pages/math';
import LinkAccount from './pages/link-account';
import GitHubCallback from './pages/githubcallback';

import './components/theme.css';

const themes = ['light', 'dark', 'spring', 'summer', 'autumn', 'winter', 'nightmare', 'auto'];

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'auto');
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  const detectSystemTheme = useCallback(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const applyTheme = useCallback((theme) => {
    const actual = theme === 'auto' ? detectSystemTheme() : theme;
    themes.forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${actual}`);
    localStorage.setItem('theme', theme);
  }, [detectSystemTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 认证逻辑
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('认证状态变化:', currentUser);
      
      if (!currentUser) {
        setUser(null);
        setIsInitializing(false);
        return;
      }

      // 检查邮箱验证
      if (!currentUser.emailVerified) {
        console.log('用户邮箱未验证');
        setUser(null);
        setIsInitializing(false);
        return;
      }

      console.log('用户已验证，UID:', currentUser.uid);
      
      try {
        // 立即设置用户状态，让导航栏显示已登录
        setUser(currentUser);
        
        // 然后在后台处理档案创建
        let numericId = await getNumericIdByUid(currentUser.uid);
        console.log('获取到的 numericId:', numericId);

        if (!numericId) {
          console.log('未找到 profile，开始创建...');
          
          let nickname = currentUser.displayName;
          if (!nickname) {
            nickname = localStorage.getItem('pendingNickname');
            localStorage.removeItem('pendingNickname');
          }
          if (!nickname) {
            nickname = currentUser.email?.split('@')[0] || `用户${Math.floor(Math.random() * 9999)}`;
          }

          numericId = await createProfile(currentUser.uid, nickname);
          console.log('Profile 创建成功，ID:', numericId);
        }

        // 更新最后登录时间
        if (numericId) {
          await updateLastLogin(numericId);
        }

        setIsInitializing(false);

      } catch (err) {
        console.error('处理用户数据失败:', err);
        // 即使档案创建失败，也保持用户登录状态
        setIsInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChangeTheme = useCallback((selectedTheme) => {
    setTheme(selectedTheme);
  }, []);

  if (isInitializing) {
    return (
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '100px',
        minHeight: '100vh'
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar handleChangeTheme={handleChangeTheme} user={user} />
      <div className="container">
		<Alert />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/click" element={<GameClick />} />
          <Route path="/games/jump" element={<JumpGame />} />
          <Route path="/games/2048" element={<Game2048 />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/games/score" element={<Leaderboard />} />
		  <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
		  <Route path="/forgot-password" element={<ForgotPassword />} />
		  <Route path="/friends" element={<Friends />} />
		  <Route path="/friends/requests" element={<FriendRequests />} />
		  <Route path="/admin" element={<Admin />} />
		  <Route path="/announcements" element={<Announcements />} />
		  <Route path="/chat" element={<ChatPage />} />
		  <Route path="/giscus" element={<Giscus />} />
		  <Route path="/math" element={<Mathma />} />
          <Route path="/link-account" element={<LinkAccount />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
        </Routes>
      </div>
    </>
  );
}