import { useState, useEffect } from 'react';
import './regionwarning.css';

const RegionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkRegion();
  }, []);

  const checkRegion = async () => {
    try {
      // 设置超时，避免长时间等待
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ipapi.co/country/', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const country = await response.text();
        if (country === 'CN') {
          setShowWarning(true);
        }
      }
    } catch (error) {
      // 如果请求失败，可能是网络问题，也显示提示
      if (error.name !== 'AbortError') {
        setShowWarning(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !showWarning) return null;

  return (
    <div className="region-warning">
      <div className="warning-content">
        <div className="warning-icon">🌐</div>
        <div className="warning-text">
          <strong>网络提示</strong>
          <span>由于网络环境，部分功能可能加载较慢。建议：</span>
          <div className="suggestions">
            • 使用 VPN 获得更好体验
            • 耐心等待资源加载
            • 刷新页面重试
          </div>
        </div>
        <button 
          onClick={() => setShowWarning(false)} 
          className="close-warning"
          title="关闭提示"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default RegionWarning;
