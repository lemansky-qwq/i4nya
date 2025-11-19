import { useState, useEffect } from 'react';
import './regionwarning.css';

const RegionWarning = () => {
  const [showBlock, setShowBlock] = useState(false);
  const [userChoice, setUserChoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkRegion();
  }, []);

  const checkRegion = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch('https://ipapi.co/country/', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const country = await response.text();
        console.log('检测到国家代码:', country);
        if (country.trim() === 'CN') {
          setShowBlock(true);
        }
      }
    } catch (error) {
      console.log('地区检测失败:', error);
      // 检测失败时不拦截，让用户正常访问
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    setUserChoice('confirmed');
    setShowBlock(false);
    // 可以在这里保存用户选择到本地存储
    localStorage.setItem('regionWarningConfirmed', 'true');
  };

  // 检查用户是否已经确认过（从本地存储）
  useEffect(() => {
    const hasConfirmed = localStorage.getItem('regionWarningConfirmed');
    if (hasConfirmed === 'true') {
      setUserChoice('confirmed');
    }
  }, []);

  // 如果用户已经确认过，或者正在加载，或者不在CN，就不显示
  if (userChoice === 'confirmed' || isLoading || !showBlock) {
    return null;
  }

  return (
    <div className="region-block-overlay">
      <div className="region-block-modal">
        <div className="region-block-header">
          <h2>访问警告</h2>
        </div>
        
        <div className="region-block-content">
          <div className="warning-message">
            <p><strong>检测到您正在从中国大陆访问</strong></p>
            <p>由于国际网络环境限制，您可能会遇到以下问题：</p>
          </div>
          
          <div className="risk-list">
            <div className="risk-item">
              <span className="risk-icon">🚫</span>
              <span className="risk-text">
                <strong>Firebase 服务不稳定</strong><br/>
                <small>Google 服务在中国大陆访问受限，可能导致数据同步失败</small>
              </span>
            </div>
            
            <div className="risk-item">
              <span className="risk-icon">🔐</span>
              <span className="risk-text">
                <strong>登录认证问题</strong><br/>
                <small>用户登录、注册功能可能完全无法使用</small>
              </span>
            </div>
            
            <div className="risk-item">
              <span className="risk-icon">🐌</span>
              <span className="risk-text">
                <strong>加载速度缓慢</strong><br/>
                <small>静态资源、图片、样式文件加载可能较慢</small>
              </span>
            </div>
            
            <div className="risk-item">
              <span className="risk-icon">💬</span>
              <span className="risk-text">
                <strong>实时功能受限</strong><br/>
                <small>聊天室、实时排行榜等需要WebSocket的功能可能中断</small>
              </span>
            </div>
            
            <div className="risk-item">
              <span className="risk-icon">✅</span>
              <span className="risk-text">
                <strong>离线功能可用</strong><br/>
                <small>已缓存的内容、离线游戏功能仍可正常使用</small>
              </span>
            </div>
            
            <div className="risk-item">
              <span className="risk-icon">📊</span>
              <span className="risk-text">
                <strong>只读数据访问</strong><br/>
                <small>排行榜、公告等只读数据在缓存有效期内可查看</small>
              </span>
            </div>
          </div>

          <div className="suggestion-box">
            <p><strong>解决方案建议：</strong></p>
            <ul>
              <li><strong>使用 VPN/代理服务</strong> - 切换到国际网络环境获得完整功能</li>
              <li><strong>尝试不同网络</strong> - 移动数据、不同WiFi网络表现可能不同</li>
              <li><strong>加入开发组</strong> - 帮助站长解决国内代理技术限制</li>
            </ul>
          </div>

          <div className="technical-details">
            <p><strong>技术细节说明：</strong></p>
            <div className="tech-info">
              <span>• 本网站基于 Firebase + Cloudflare 构建</span>
              <span>• 主要依赖的 Google 服务在中国大陆访问不稳定</span>
              <span>• 静态资源通过 CDN 分发，API 调用可能失败</span>
              <span>• 实时数据库和认证服务受影响最严重</span>
            </div>
          </div>
        </div>

        <div className="region-block-actions">
          <button onClick={handleConfirm} className="confirm-btn">
            仍要访问
          </button>
        </div>
        
        <div className="region-block-footer">
          <small>
            选择"仍要访问"即表示您了解可能遇到的功能限制。<br/>
            我们会尽力优化体验，但部分技术限制无法绕过。<br/>
			呜喵……
          </small>
        </div>
      </div>
    </div>
  );
};

export default RegionWarning;