import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  linkWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import GitHubOAuth from '../components/GitHubOAuth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [linkingEmail, setLinkingEmail] = useState('');
  const navigate = useNavigate();

  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

  useEffect(() => {
    const lockUntil = localStorage.getItem('loginLockUntil');
    if (lockUntil && Date.now() < Number(lockUntil)) {
      const remaining = Math.ceil((Number(lockUntil) - Date.now()) / 60000);
      setMsg(`登录尝试过多，请 ${remaining} 分钟后再试`);
    }
  }, []);

  // 修复的账户关联处理
  const handleAccountLinking = async (error, provider, providerName) => {
    const conflictEmail = error.customData?.email;
    
    if (!conflictEmail) {
      setMsg('账户关联失败，请尝试使用邮箱密码登录');
      return;
    }

    let credential;
    try {
      if (providerName === 'Google') {
        credential = GoogleAuthProvider.credentialFromError(error);
      } else if (providerName === 'GitHub') {
        credential = GithubAuthProvider.credentialFromError(error);
      }
    } catch (credError) {
      console.log('获取凭据失败:', credError);
    }

    if (!credential) {
      setMsg(`请先使用邮箱密码登录 ${conflictEmail}，然后在设置中关联 ${providerName}`);
      return;
    }

    setLinkingEmail(conflictEmail);
    setPendingCredential({ credential, providerName });
    setMsg(`请输入 ${conflictEmail} 的密码来关联 ${providerName} 账户`);
  };

  // 修复的关联执行函数
  const linkAccounts = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      if (!pendingCredential?.credential) {
        setMsg('关联信息已失效，请重新尝试登录');
        setLoading(false);
        return;
      }

      const emailCred = EmailAuthProvider.credential(linkingEmail, password);
      const userCred = await signInWithEmailAndPassword(auth, linkingEmail, password);
      
      await linkWithCredential(userCred.user, pendingCredential.credential);
      
      setMsg(`${pendingCredential.providerName} 账户关联成功！正在跳转...`);
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.log('关联错误:', error);
      if (error.code === 'auth/wrong-password') {
        setMsg('密码错误，请重新输入');
      } else if (error.code === 'auth/user-not-found') {
        setMsg('账户不存在，请检查邮箱是否正确');
      } else if (error.code === 'auth/requires-recent-login') {
        setMsg('为了安全，请重新登录后再尝试关联');
      } else {
        setMsg('关联失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 取消关联
  const cancelLinking = () => {
    setLinkingEmail('');
    setPendingCredential(null);
    setMsg('');
  };

  // 修复的第三方登录处理
  const handleSocialLogin = async (provider, providerName) => {
    setSocialLoading(providerName);
    setMsg('');

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (providerName === 'GitHub') {
        const githubUsername = result.additionalUserInfo?.username;
        if (githubUsername) {
          localStorage.setItem('pendingNickname', githubUsername);
        }
      }
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('loginLockUntil');

      setMsg(`${providerName} 登录成功！正在跳转...`);
      
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (error) {
      console.log(`${providerName} 登录错误:`, error.code, error.message);

      // 静默处理弹窗关闭错误
      if (error.code === 'auth/popup-closed-by-user') {
        // 不显示任何消息
      } 
      // 处理账户冲突
      else if (error.code === 'auth/account-exists-with-different-credential') {
        console.log('开始处理账户关联...');
        await handleAccountLinking(error, provider, providerName);
      }
      // 只显示重要的错误
      else if (error.code !== 'auth/cancelled-popup-request') {
        const errorMap = {
          'auth/popup-blocked': '登录弹窗被浏览器阻止，请允许弹窗',
          'auth/network-request-failed': '网络连接失败，请检查网络',
          'auth/operation-not-allowed': '该登录方式暂未启用',
        };
        setMsg(errorMap[error.code] || '登录失败，请重试');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleLogin = () => {
    handleSocialLogin(googleProvider, 'Google');
  };

  const handleGitHubLogin = () => {
    handleSocialLogin(githubProvider, 'GitHub');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    const lockUntil = localStorage.getItem('loginLockUntil');
    if (lockUntil && Date.now() < Number(lockUntil)) {
      setLoading(false);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

      if (!cred.user.emailVerified) {
        await auth.signOut();
        setMsg('请先验证邮箱后再登录');
        setLoading(false);
        return;
      }

      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('loginLockUntil');

      setMsg('登录成功！正在跳转...');
      
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (err) {
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
          'auth/wrong-password': `邮箱或密码错误`,
          'auth/too-many-requests': '尝试次数过多，请稍后重试',
          'auth/invalid-email': '邮箱格式错误',
        };
        setMsg(map[err.code] || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <div className="card">
        <h2 className="text-primary">登录</h2>

        {/* 账户关联表单 */}
        {linkingEmail && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="text-primary" style={{ marginBottom: '1rem' }}>账户关联</h3>
            <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '0.9em' }}>
              请输入 {linkingEmail} 的密码来关联 {pendingCredential?.providerName} 账户
            </p>
            <form onSubmit={linkAccounts}>
              <input 
                type="password" 
                placeholder="密码" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="input"
                style={{width:'91%', margin:'8px 0'}}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {loading ? '关联中...' : '确认关联'}
                </button>
                <button 
                  type="button"
                  onClick={cancelLinking}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  取消
                </button>
              </div>
            </form>
            <p className="text-muted" style={{ fontSize: '0.8em', marginTop: '10px' }}>
              忘记密码？<Link to="/forgot-password" className="text-primary">点击找回</Link>
            </p>
          </div>
        )}

        {/* 正常登录界面 */}
        {!linkingEmail && (
          <>
            {/* 第三方登录按钮 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button 
                onClick={handleGoogleLogin}
                disabled={socialLoading}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: 'rgba(255, 130, 40, 1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {socialLoading === 'google' ? '登录中...' : 'Google 登录'}
              </button>

              {/* 旧的 GitHub 登录（Firebase Auth）*/}
              <button 
                onClick={handleGitHubLogin}
                disabled={socialLoading}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {socialLoading === 'github' ? '登录中...' : 'GitHub 登录'}
              </button>

              <button 
                disabled={true}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#666',
                  color: '#ccc',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'not-allowed',
                  fontSize: '14px'
                }}
              >
                GitHub 登录（维护中）
              </button>
            </div>

            {/* 分隔线 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              margin: '1.5rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.9em'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--card-border)' }}></div>
              <span style={{ padding: '0 1rem' }}>或</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--card-border)' }}></div>
            </div>
            
            {/* 邮箱登录表单 */}
            <form onSubmit={handleLogin}>
              <input 
                type="email" 
                placeholder="邮箱" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="input"
                style={{width:'91%', margin:'8px 0'}}
              />
              <input 
                type="password" 
                placeholder="密码" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="input"
                style={{width:'91%', margin:'8px 0'}}
              />
              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary"
                style={{width:'100%', marginTop:10}}
              >
                {loading ? '登录中...' : '邮箱登录'}
              </button>
            </form>
          </>
        )}
        
        {msg && (
          <p style={{
            marginTop:15, 
            color: msg.includes('成功') ? 'var(--success-color)' : 'var(--danger-color)',
            fontSize: '0.9em',
            padding: '10px',
            background: msg.includes('成功') ? 'var(--success-bg)' : 'var(--error-bg)',
            border: `1px solid ${msg.includes('成功') ? 'var(--success-border)' : 'var(--error-border)'}`,
            borderRadius: '6px'
          }}>
            {msg}
          </p>
        )}
        
        {!linkingEmail && (
          <>
            <p style={{ marginTop: '1rem', fontSize: '0.9em' }}>
              <Link to="/forgot-password" className="text-secondary" style={{textDecoration: 'none'}}>
                忘记密码？
              </Link>
            </p>
            
            <p style={{marginTop: '1rem', fontSize: '0.9em'}}>
              <span className="text-secondary">还没有账号？ </span>
              <Link to="/register" className="text-primary" style={{textDecoration: 'none'}}>
                立即注册
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}