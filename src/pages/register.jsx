// src/pages/register.jsx
import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createProfile } from '../lib/pu';
import { useNavigate } from 'react-router-dom';

// 常见邮箱后缀白名单（可扩展）
const ALLOWED_DOMAINS = [
  'gmail.com',
  '163.com',
  '126.com',
  'qq.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'sina.com',
  'sohu.com',
];

const REGISTER_COOLDOWN = 2 * 60 * 1000; // 2 分钟
const RESEND_COOLDOWN = 2 * 60 * 1000;  // 2 分钟

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();

  // 检查注册冷却
  useEffect(() => {
    const lastRegister = localStorage.getItem('lastRegisterTime');
    if (lastRegister) {
      const elapsed = Date.now() - Number(lastRegister);
      if (elapsed < REGISTER_COOLDOWN) {
        const remaining = Math.ceil((REGISTER_COOLDOWN - elapsed) / 1000);
        setMsg(`请等待 ${remaining} 秒后再次注册`);
        const timer = setInterval(() => {
          const now = Date.now();
          const elapsed2 = now - Number(lastRegister);
          if (elapsed2 >= REGISTER_COOLDOWN) {
            setMsg('');
            clearInterval(timer);
          } else {
            const sec = Math.ceil((REGISTER_COOLDOWN - elapsed2) / 1000);
            setMsg(`请等待 ${sec} 秒后再次注册`);
          }
        }, 1000);
        return () => clearInterval(timer);
      }
    }
  }, []);

  // 重发倒计时
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // 验证邮箱域名
  const validateEmailDomain = (email) => {
    const domain = email.trim().toLowerCase().split('@')[1];
    if (!domain) return false;
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    // 1. 密码长度
    if (password.length < 6) {
      setMsg('密码至少 6 位');
      setLoading(false);
      return;
    }

    // 2. 邮箱格式 + 域名白名单
    const emailLower = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      setMsg('邮箱格式不正确');
      setLoading(false);
      return;
    }
    if (!validateEmailDomain(emailLower)) {
      setMsg(`仅支持常见邮箱：<br/>${ALLOWED_DOMAINS.slice(0, 5).join(', ')} 等`);
      setLoading(false);
      return;
    }

    // 3. 注册冷却检查
    const lastRegister = localStorage.getItem('lastRegisterTime');
    if (lastRegister && Date.now() - Number(lastRegister) < REGISTER_COOLDOWN) {
      setMsg('操作过于频繁，请 2 分钟后再试');
      setLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, emailLower, password);
      const numericId = await createProfile(cred.user.uid, nickname);

      // 发送验证邮件
      await sendEmailVerification(cred.user);
      setMsg('注册成功！请查收邮件验证邮箱（检查垃圾邮件）');

      // 记录注册时间
      localStorage.setItem('lastRegisterTime', Date.now().toString());

      // 开启重发倒计时
      setResendCountdown(120); // 2 分钟

      // 跳转首页
      setTimeout(() => navigate('/'), 1500);

    } catch (err) {
      // Firebase 错误码处理
      const errorMap = {
        'auth/email-already-in-use': '该邮箱已被注册',
        'auth/weak-password': '密码强度不足',
        'auth/invalid-email': '邮箱格式错误',
      };
      setMsg(errorMap[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证邮件
  const handleResend = async () => {
    if (!auth.currentUser) {
      setMsg('请先注册');
      return;
    }
    if (resendCountdown > 0) {
      setMsg(`请等待 ${resendCountdown} 秒后重试`);
      return;
    }

    try {
      await sendEmailVerification(auth.currentUser);
      setMsg('验证邮件已重新发送！');
      setResendCountdown(120);
    } catch (err) {
      setMsg('发送失败：' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem' }}>
      <form onSubmit={handleRegister}>
        <input
          placeholder="昵称（1-12字）"
          value={nickname}
          onChange={e => setNickname(e.target.value.slice(0, 12))}
          required
          style={{ marginBottom: 8 }}
        />
        <input
          type="email"
          placeholder="邮箱（如 xxx@gmail.com）"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="密码（至少6位）"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ marginBottom: 8 }}
        />
        <button type="submit" disabled={loading || msg.includes('等待')}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      {msg && (
        <p
          style={{
            color: msg.includes('成功') || msg.includes('发送') ? 'green' : 'red',
            marginTop: 12,
            fontSize: '0.9em',
          }}
          dangerouslySetInnerHTML={{ __html: msg }}
        />
      )}

      {/* 重发按钮 */}
      {auth.currentUser && !auth.currentUser.emailVerified && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={handleResend}
            disabled={resendCountdown > 0}
            style={{
              fontSize: '0.85em',
              padding: '4px 8px',
              opacity: resendCountdown > 0 ? 0.6 : 1,
            }}
          >
            {resendCountdown > 0 ? `重发 (${resendCountdown}s)` : '重新发送验证邮件'}
          </button>
        </div>
      )}

      {/* 提示允许的邮箱 */}
      <p style={{ fontSize: '0.8em', color: '#666', marginTop: 20 }}>
        支持邮箱：{ALLOWED_DOMAINS.slice(0, 6).join(', ')} 等
      </p>
    </div>
  );
}