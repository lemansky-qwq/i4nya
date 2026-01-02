import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import GitHubOAuth from '../components/GitHubOAuth';

const ALLOWED_DOMAINS = ['gmail.com','163.com','126.com','qq.com','outlook.com','hotmail.com','yahoo.com','icloud.com','sina.com','sohu.com'];
const REGISTER_COOLDOWN = 2 * 60 * 1000;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [linkingEmail, setLinkingEmail] = useState('');
  const navigate = useNavigate();

  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

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

  // 处理账户关联
  const handleAccountLinking = async (error, provider, providerName) => {
    const email = error.customData?.email;
    if (!email) {
      setMsg('账户关联失败：无法获取邮箱信息');
      return;
    }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      if (methods.includes('password')) {
        setLinkingEmail(email);
        setPendingCredential({ credential: provider.credentialFromError(error), providerName });
        setMsg(`该邮箱已使用密码注册，请输入密码来关联 ${providerName} 账户`);
      } else {
        const providerNames = {
          'google.com': 'Google',
          'github.com': 'GitHub',
          'password': '邮箱密码'
        };
        const existingMethods = methods.map(method => providerNames[method] || method).join(' 或 ');
        setMsg(`该邮箱已使用 ${existingMethods} 注册，请先使用原有方式登录后再关联`);
      }
    } catch (err) {
      setMsg('账户检查失败: ' + err.message);
    }
  };

  // 执行账户关联
  const linkAccounts = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const emailCred = EmailAuthProvider.credential(linkingEmail, password);
      const userCred = await signInWithEmailAndPassword(auth, linkingEmail, password);
      
      await linkWithCredential(userCred.user, pendingCredential.credential);
      
      setMsg(`${pendingCredential.providerName} 账户关联成功！`);
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      setMsg('关联失败: ' + error.message);
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

  // 第三方注册/登录
  const handleSocialRegister = async (provider, providerName) => {
    setSocialLoading(providerName);
    setMsg('');

    try {
      const result = await signInWithPopup(auth, provider);
      setMsg(`${providerName} 注册成功！正在跳转...`);
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        // 不显示消息
      }
      else if (error.code === 'auth/account-exists-with-different-credential') {
        setMsg('该账户已存在，请直接登录');
      }
      else if (error.code !== 'auth/cancelled-popup-request') {
        setMsg('注册失败，请重试');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleRegister = () => {
    handleSocialRegister(googleProvider, 'Google');
  };

  const handleGitHubRegister = () => {
    handleSocialRegister(githubProvider, 'GitHub');
  };

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
      const cred = await createUserWithEmailAndPassword(auth, emailLower, password);
      
      await updateProfile(cred.user, {
        displayName: safeNickname
      });

      await sendEmailVerification(cred.user);

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
        <p style={{fontSize:'0.7em', marginTop:30}}>
             新用户提示注册成功请立即刷新页面，否则可能无法写入数据！
          </p>

        {/* 账户关联表单 */}
        {linkingEmail && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="text-primary" style={{ marginBottom: '1rem' }}>账户关联</h3>
            <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '0.9em' }}>
              请输入 {linkingEmail} 的密码来关联账户
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
          </div>
        )}

        {/* 正常注册界面 */}
        {!linkingEmail && (
          <>
            {/* 第三方注册按钮 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button 
                onClick={handleGoogleRegister}
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
                {socialLoading === 'google' ? '注册中...' : 'Google 注册'}
              </button>

              {/* 旧的 GitHub 注册（Firebase Auth）*/}
              <button 
                onClick={handleGitHubRegister}
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
                {socialLoading === 'github' ? '注册中...' : 'GitHub 注册'}
              </button>

              {/* 新的 GitHub 登录（纯前端 OAuth）*/}
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
                GitHub 注册（维护中）
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
            
            {/* 邮箱注册表单 */}
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
                {loading ? '注册中...' : '邮箱注册'}
              </button>
            </form>
          </>
        )}

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

        {!linkingEmail && (
          <p style={{marginTop: '1rem', fontSize: '0.9em'}}>
            <span className="text-secondary">已有账号？ </span>
            <Link to="/login" className="text-primary" style={{textDecoration: 'none'}}>
              立即登录
            </Link>
          </p>
        )}

        {!linkingEmail && (
          <p className="text-muted" style={{fontSize:'0.8em', marginTop:30}}>
            支持邮箱：{ALLOWED_DOMAINS.slice(0,6).join('、')} 等
          </p>
          
        )}
      </div>
    </div>
  );
}