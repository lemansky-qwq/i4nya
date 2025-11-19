// src/components/GitHubOAuth.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GitHubOAuth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startGitHubLogin = () => {
    setLoading(true);
    
    // 根据环境选择配置
    const isDevelopment = import.meta.env.DEV;
    const clientId = isDevelopment 
      ? import.meta.env.VITE_DEV_GITHUB_CLIENT_ID
      : import.meta.env.VITE_PROD_GITHUB_CLIENT_ID;
    
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/github/callback`);
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    
    console.log('GitHub OAuth URL:', authUrl);
    window.location.href = authUrl;
  };

  return (
    <button 
      onClick={startGitHubLogin}
      disabled={loading}
      className="btn"
      style={{
        width: '100%',
        padding: '12px',
        backgroundColor: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      {loading ? '跳转中...' : 'GitHub 注册 / 登录（测试版本）'}
    </button>
  );
}