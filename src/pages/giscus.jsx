import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './giscus.css';

const ChatPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'lemansky-qwq/i4nya');
    script.setAttribute('data-repo-id', 'R_kgDOQVfQIA');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOQVfQIM4Cx9I9');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', 'chat-room');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    const container = document.getElementById('giscus-chat');
    if (container) {
      container.innerHTML = '';
      container.appendChild(script);
    }

    // 清理函数
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [user]);

  if (loading) return <div className="chat-loading">加载中...</div>;

  if (!user) {
    return (
      <div className="chat-auth-required">
        <h2>请先登录</h2>
        <p>需要登录后才能使用聊天室</p>
        <button onClick={() => navigate('/login')}>去登录</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>公共评论系统</h1>
        <p>欢迎，{user.displayName || user.email}！</p>
        <small>基于 GitHub Discussions，请文明交流</small>
      </div>
      <div className="chat-main">
        <div id="giscus-chat"></div>
      </div>
    </div>
  );
};

export default ChatPage;