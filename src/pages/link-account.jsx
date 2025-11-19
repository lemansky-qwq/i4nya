import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  linkWithCredential,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function LinkAccount() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState('');
  const navigate = useNavigate();

  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

  // 检查当前用户状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setMsg('请先登录后再关联账户');
      }
    });
    return unsubscribe;
  }, []);

  // 简化的邮箱密码登录
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const emailNormalized = email.trim().toLowerCase();
      const userCred = await signInWithEmailAndPassword(auth, emailNormalized, password);
      
      setMsg('登录成功！现在可以关联其他登录方式');
      setLinkingProvider('ready');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setMsg('该邮箱未注册，请使用第三方登录注册新账户');
      } else if (error.code === 'auth/wrong-password') {
        setMsg('密码错误，请重新输入');
      } else {
        setMsg('登录失败: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 简化的第三方登录/注册
  const handleProviderLink = async (provider, providerName) => {
    setLoading(true);
    setMsg('');

    try {
      const result = await signInWithPopup(auth, provider);
      
      setMsg(`${providerName} 账户${result._tokenResponse?.isNewUser ? '注册' : '登录'}成功！`);
      setTimeout(() => navigate('/settings'), 2000);
    } catch (error) {
      // 静默处理弹窗关闭
      if (error.code === 'auth/popup-closed-by-user') {
        // 不显示消息
      }
      // 处理账户冲突
      else if (error.code === 'auth/account-exists-with-different-credential') {
        const conflictEmail = error.customData?.email;
        if (conflictEmail) {
          setMsg(`该 ${providerName} 账户已关联到 ${conflictEmail}，请使用该邮箱登录`);
        } else {
          setMsg(`该 ${providerName} 账户已关联其他邮箱，请使用原有方式登录`);
        }
      }
      // 其他重要错误
      else if (error.code !== 'auth/cancelled-popup-request') {
        setMsg(`${providerName} 登录失败，请重试`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 登录后关联第三方账户
  const linkAfterLogin = async (provider, providerName) => {
    setLoading(true);
    setMsg('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setMsg('请先登录');
        return;
      }

      const result = await signInWithPopup(auth, provider);
      setMsg(`${providerName} 账户关联成功！`);
      setTimeout(() => navigate('/settings'), 2000);
    } catch (error) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        setMsg('该账户已关联其他邮箱，无法重复关联');
      } else if (error.code === 'auth/provider-already-linked') {
        setMsg('该登录方式已关联到当前账户');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // 静默处理
      } else {
        setMsg('关联失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetProcess = () => {
    setLinkingProvider('');
    setEmail('');
    setPassword('');
    setMsg('');
  };

  const handleGitHubLink = () => {
    if (linkingProvider === 'ready') {
      linkAfterLogin(githubProvider, 'GitHub');
    } else {
      handleProviderLink(githubProvider, 'GitHub');
    }
  };

  const handleGoogleLink = () => {
    if (linkingProvider === 'ready') {
      linkAfterLogin(googleProvider, 'Google');
    } else {
      handleProviderLink(googleProvider, 'Google');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <div className="card">
        <h2 className="text-primary">账户关联</h2>
        <p className="text-secondary" style={{marginBottom: '1.5rem'}}>
          将多个登录方式关联到同一个账户
        </p>

        {!linkingProvider && (
          <>
            {/* 邮箱登录表单 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 className="text-primary" style={{marginBottom: '0.5rem'}}>登录现有账户</h4>
              <form onSubmit={handleEmailLogin}>
                <input 
                  type="email" 
                  placeholder="输入邮箱地址" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="input"
                  style={{width: '91%', marginBottom: '10px'}}
                />
                <input 
                  type="password" 
                  placeholder="密码" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="input"
                  style={{width: '91%', marginBottom: '10px'}}
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary"
                  style={{width: '91%'}}
                >
                  {loading ? '登录中...' : '登录账户'}
                </button>
              </form>
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

            {/* 第三方登录 */}
            <div>
              <h4 className="text-primary" style={{marginBottom: '0.5rem'}}>使用第三方账户</h4>
              <p className="text-muted" style={{marginBottom: '1rem', fontSize: '0.9em'}}>
                登录或注册新账户
              </p>
              
              <button 
                onClick={handleGoogleLink}
                disabled={loading}
                className="btn"
                style={{
                  width: '91%',
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: 'rgba(255, 130, 40, 1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Google 登录/注册
              </button>

              <button 
                onClick={handleGitHubLink}
                disabled={loading}
                className="btn"
                style={{
                  width: '91%',
                  padding: '12px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                GitHub 登录/注册
              </button>
            </div>
          </>
        )}

        {/* 登录后关联界面 */}
        {linkingProvider === 'ready' && (
          <div>
            <h4 className="text-primary" style={{marginBottom: '0.5rem'}}>关联登录方式</h4>
            <p className="text-success" style={{marginBottom: '1rem'}}>
              登录成功！现在可以为账户关联其他登录方式
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <button 
                onClick={handleGoogleLink}
                disabled={loading}
                className="btn"
                style={{
                  width: '91%',
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: 'rgba(255, 130, 40, 1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {loading ? '关联中...' : '关联 Google 账户'}
              </button>

              <button 
                onClick={handleGitHubLink}
                disabled={loading}
                className="btn"
                style={{
                  width: '91%',
                  padding: '12px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {loading ? '关联中...' : '关联 GitHub 账户'}
              </button>
            </div>

            <button 
              onClick={resetProcess}
              className="btn btn-secondary"
              style={{width: '91%'}}
            >
              重新开始
            </button>
          </div>
        )}

        {msg && (
          <p style={{
            marginTop: 15,
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
      </div>
    </div>
  );
}