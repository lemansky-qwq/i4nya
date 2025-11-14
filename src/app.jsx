import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import Leaderboard from './pages/games/score';
import { supabase } from './lib/supabaseClient';  // 你自己的 supabase 客户端路径
import './components/theme.css'; // 确保样式生效

const themes = ['light', 'dark', 'spring', 'summer', 'autumn', 'winter', 'nightmare', 'auto'];

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'auto');
  const [user, setUser] = useState(null);

  const detectSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme) => {
    themes.forEach(t => document.body.classList.remove(`theme-${t}`));
    const actual = theme === 'auto' ? detectSystemTheme() : theme;
    document.body.classList.add(`theme-${actual}`);
    localStorage.setItem('theme', theme);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // 初始化用户状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 监听登录状态变化
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleChangeTheme = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  return (
    <>
      <Navbar handleChangeTheme={handleChangeTheme} user={user} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/click" element={<GameClick />} />
          <Route path="/games/jump" element={<JumpGame />} />
          <Route path="/games/2048" element={<Game2048 />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/profile/:uid" element={<Profile />} />
          <Route path="/games/score" element={<Leaderboard />} />
        </Routes>
      </div>
    </>
  );
}
