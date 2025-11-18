// src/pages/login.jsx
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 检查是否被锁定
    const lockUntil = localStorage.getItem('loginLockUntil');
    if (lockUntil && Date.now() < Number(lockUntil)) {
      const remaining = Math.ceil((Number(lockUntil) - Date.now()) / 60000);
      setMsg(`登录尝试过多，请 ${remaining} 分钟后再试`);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    // 检查锁定状态
    const lockUntil = localStorage.getItem('loginLockUntil');
    if (lockUntil && Date.now() < Number(lockUntil)) {
      setLoading(false);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

      if (!cred.user.emailVerified) {
        await auth.signOut();
        setMsg('请先点击注册邮件中的链接完成邮箱验证');
        setLoading(false);
        return;
      }

      // 清除登录尝试计数
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('loginLockUntil');

      setMsg('登录成功！正在跳转...');
      
      // 直接跳转到首页，让 App.jsx 处理状态更新
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (err) {
      // 处理登录尝试限制
      let attempts = Number(localStorage.getItem('loginAttempts') || 0) + 1;
      localStorage.setItem('loginAttempts', attempts.toString());

      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_TIME;
        localStorage.setItem('loginLockUntil', lockUntil.toString());
        const remaining = Math.ceil(LOCKOUT_TIME / 60000);
        setMsg(`登录尝试过多，请 ${remaining} 分钟后再试`);
      } else {
        const map = {
          'auth/user-not-found': '邮箱或密码错误',
          'auth/wrong-password': `邮箱或密码错误 (剩余尝试次数: ${MAX_ATTEMPTS - attempts})`,
          'auth/too-many-requests': '尝试次数过多，请稍后重试',
          'auth/invalid-email': '邮箱格式错误',
        };
        setMsg(map[err.code] || `登录失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '2rem auto', textAlign: 'center' }}>
      <h2>登录</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="邮箱" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
          style={{width:'100%',padding:10,margin:'8px 0'}} 
        />
        <input 
          type="password" 
          placeholder="密码" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{width:'100%',padding:10,margin:'8px 0'}} 
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{
            width:'100%',
            padding:12,
            marginTop:10,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      
      {msg && (
        <p style={{
          marginTop:15, 
          color: msg.includes('成功') ? 'green' : 'red',
          fontSize: '0.9em'
        }}>
          {msg}
        </p>
      )}
      
      <p style={{marginTop: '1rem', fontSize: '0.9em'}}>
        还没有账号？ <Link to="/register">立即注册</Link>
      </p>
    </div>
  );
}