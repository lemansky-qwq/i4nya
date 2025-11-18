import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setMessage('密码重置邮件已发送，请检查您的邮箱（包括垃圾邮件）');
      setEmail('');
    } catch (err) {
      const errorMap = {
        'auth/user-not-found': '该邮箱未注册',
        'auth/invalid-email': '邮箱格式错误',
        'auth/too-many-requests': '请求过于频繁，请稍后重试'
      };
      setError(errorMap[err.code] || `发送失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <div className="card">
        <h2 className="text-primary">重置密码</h2>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          输入您的邮箱地址，我们将发送密码重置链接
        </p>

        <form onSubmit={handleResetPassword}>
          <input 
            type="email" 
            placeholder="请输入注册邮箱" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            className="input"
            style={{ width: '91%', margin: '8px 0' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '91%', marginTop: '10px' }}
          >
            {loading ? '发送中...' : '发送重置邮件'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '1rem',
            padding: '12px',
            background: 'var(--success-bg)',
            color: 'var(--success-color)',
            borderRadius: '6px',
            border: '1px solid var(--success-border)',
            fontSize: '0.9em'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '12px',
            background: 'var(--error-bg)',
            color: 'var(--error-color)',
            borderRadius: '6px',
            border: '1px solid var(--error-border)',
            fontSize: '0.9em'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link 
            to="/login" 
            className="text-primary" 
            style={{ textDecoration: 'none', fontSize: '0.9em' }}
          >
            返回登录
          </Link>
          <Link 
            to="/register" 
            className="text-secondary" 
            style={{ textDecoration: 'none', fontSize: '0.9em' }}
          >
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
}