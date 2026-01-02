// src/app.jsx
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { createProfile, getNumericIdByUid, updateLastLogin } from './lib/pu';

// 页面组件
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

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    console.log('认证状态变化:', currentUser);

    if (!currentUser) {
      setUser(null);
      setIsInitializing(false);
      return;
    }

    setUser(currentUser);

    try {
      let numericId = await getNumericIdByUid(currentUser.uid);
      console.log('numericId:', numericId);

      if (!numericId) {
        // 只读一次 pendingNickname
        const pendingNickname = localStorage.getItem('pendingNickname');
        if (pendingNickname) {
          localStorage.removeItem('pendingNickname');
        }

        const nickname =
          pendingNickname ||
          currentUser.providerData?.[0]?.displayName ||
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          `用户${Math.floor(Math.random() * 9999)}`;

        numericId = await createProfile(currentUser.uid, nickname);
        console.log('Profile 创建成功:', numericId);
      }

      if (numericId) {
        await updateLastLogin(numericId);
      }
    } catch (err) {
      console.error('处理用户数据失败:', err);
    }

    setIsInitializing(false);
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}
