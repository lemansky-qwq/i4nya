import { useState, useEffect } from 'react';
import './RegionWarning.css';

const RegionWarning = () => {
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [authStatus, setAuthStatus] = useState('unknown');

  useEffect(() => {
    checkNetworkStatus();
  }, []);

  const checkNetworkStatus = async () => {
    try {
      // 测试基础连接
      const startTime = Date.now();
      await fetch('https://firestore.googleapis.com/$discovery/rest?version=v1');
      const endTime = Date.now();
      
      if (endTime - startTime > 3000) {
        setNetworkStatus('slow');
      } else {
        setNetworkStatus('normal');
      }

      // 测试认证服务
      try {
        await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test', {
          method: 'POST',
          mode: 'no-cors'
        });
        setAuthStatus('available');
      } catch {
        setAuthStatus('unavailable');
      }

    } catch (error) {
      setNetworkStatus('unstable');
    }
  };

  const getWarningMessage = () => {
    if (authStatus === 'unavailable') {
      return '⚠️ 登录服务暂时不可用，但您可以浏览公开内容';
    }
    if (networkStatus === 'slow') {
      return '🌐 网络连接较慢，部分功能可能加载延迟';
    }
    if (networkStatus === 'unstable') {
      return '📡 网络连接不稳定，建议检查网络设置';
    }
    return null;
  };

  const message = getWarningMessage();
  if (!message) return null;

  return (
    <div className="region-warning">
      <div className="warning-content">
        <span>{message}</span>
        <button onClick={() => setNetworkStatus('normal')} className="close-warning">
          ×
        </button>
      </div>
    </div>
  );
};

export default RegionWarning;