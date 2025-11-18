import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom'; // 添加 Link

const ALLOWED_DOMAINS = ['gmail.com','163.com','126.com','qq.com','outlook.com','hotmail.com','yahoo.com','icloud.com','sina.com','sohu.com'];
const REGISTER_COOLDOWN = 2 * 60 * 1000;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 注册冷却
  useEffect(() => {
    const last = localStorage.getItem('lastRegisterTime');
    if (last && Date.now() - Number(last) < REGISTER_COOLDOWN) {
      const sec = Math.ceil((REGISTER_COOLDOWN - (Date.now() - Number(last))) / 1000);
      setMsg(`请等待 ${sec} 秒后再注册`);
      const timer = setInterval(() => {
        const remain = Math.ceil((REGISTER_COOLDOWN - (Date.now() - Number(last))) / 1000);
        if (remain <= 0) {
          setMsg('');
          clearInterval(timer);
        } else {
          setMsg(`请等待 ${remain} 秒后再注册`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, []);

  const validateEmailDomain = (email) => {
    const domain = email.trim().toLowerCase().split('@')[1];
    return domain && ALLOWED_DOMAINS.includes(domain);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    const emailLower = email.trim().toLowerCase();
    const safeNickname = nickname.trim() || emailLower.split('@')[0];

    // 各种校验...
    if (password.length < 6) {
      setMsg('密码至少6位');
      setLoading(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      setMsg('邮箱格式错误');
      setLoading(false);
      return;
    }
    if (!validateEmailDomain(emailLower)) {
      setMsg(`仅支持：${ALLOWED_DOMAINS.slice(0,6).join('、')} 等`);
      setLoading(false);
      return;
    }

    try {
      // 创建用户
      const cred = await createUserWithEmailAndPassword(auth, emailLower, password);
      
      // 更新用户的 displayName（Firebase Auth 中的昵称）
      await updateProfile(cred.user, {
        displayName: safeNickname
      });

      // 发送验证邮件
      await sendEmailVerification(cred.user);

      // 保存昵称到 localStorage，供后续创建档案使用
      localStorage.setItem('pendingNickname', safeNickname);

      localStorage.setItem('lastRegisterTime', Date.now().toString());

      setMsg('注册成功！请查收邮件点击验证链接（记得看垃圾箱）');
      setTimeout(() => navigate('/login'), 2500);

    } catch (err) {
      const map = {
        'auth/email-already-in-use': '该邮箱已被注册',
        'auth/weak-password': '密码太弱',
        'auth/invalid-email': '邮箱格式错误',
      };
      setMsg(map[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <div className="card">
        <h2 className="text-primary">注册</h2>
        
        <form onSubmit={handleRegister}>
          <input 
            placeholder="昵称（1-12字)" 
            value={nickname} 
            onChange={e => setNickname(e.target.value.slice(0,12))} 
            required 
            className="input"
            style={{width:'91%', margin:'8px 0'}}
          />
          <input 
            type="email" 
            placeholder="邮箱" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            required 
            className="input"
            style={{width:'91%', margin:'8px 0'}}
          />
          <input 
            type="password" 
            placeholder="密码（至少6位）" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            required 
            className="input"
            style={{width:'91%', margin:'8px 0'}}
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary"
            style={{width:'91%', marginTop:10}}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        {msg && (
          <p style={{
            marginTop:15,
            color: msg.includes('成功') ? 'var(--success-color)' : 'var(--danger-color)',
            padding: '10px',
            background: msg.includes('成功') ? 'var(--success-bg)' : 'var(--error-bg)',
            border: `1px solid ${msg.includes('成功') ? 'var(--success-border)' : 'var(--error-border)'}`,
            borderRadius: '6px',
            fontSize: '0.9em'
          }}>
            {msg}
          </p>
        )}

        <p style={{marginTop: '1rem', fontSize: '0.9em'}}>
          <span className="text-secondary">已有账号？ </span>
          <Link to="/login" className="text-primary" style={{textDecoration: 'none'}}>
            立即登录
          </Link>
        </p>

        <p className="text-muted" style={{fontSize:'0.8em', marginTop:30}}>
          支持邮箱：{ALLOWED_DOMAINS.slice(0,6).join('、')} 等
        </p>
      </div>
    </div>
  );
}