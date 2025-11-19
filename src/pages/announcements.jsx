// src/pages/announcements.jsx
import { useState, useEffect } from 'react';
import { isAdmin, addAnnouncement, getAnnouncements, deleteAnnouncement, updateLastSeen } from '../lib/pu';
import { auth } from '../lib/firebase';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: '', 
    content: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // 检查管理员权限并加载公告
  useEffect(() => {
    const initialize = async () => {
      if (auth.currentUser) {
        const admin = await isAdmin(auth.currentUser.uid);
        setIsAdminUser(admin);
		await updateLastSeen(auth.currentUser.uid);
      }
      await loadAnnouncements();
    };
    
    initialize();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const announcementsData = await getAnnouncements(20);
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('加载公告失败:', error);
      alert('加载公告失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    if (!auth.currentUser) {
      alert('请先登录');
      return;
    }

    setPublishing(true);
    try {
      await addAnnouncement(
        auth.currentUser.uid,
        newAnnouncement.title,
        newAnnouncement.content,
        newAnnouncement.priority
      );
      
      setNewAnnouncement({ title: '', content: '', priority: 'normal' });
      setShowForm(false);
      alert('公告发布成功');
      
      // 重新加载公告列表
      await loadAnnouncements();
    } catch (error) {
      console.error('发布公告失败:', error);
      alert('发布失败: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!auth.currentUser) return;
    
    if (!window.confirm('确定要删除这条公告吗？')) {
      return;
    }

    try {
      await deleteAnnouncement(auth.currentUser.uid, announcementId);
      alert('公告删除成功');
      await loadAnnouncements();
    } catch (error) {
      console.error('删除公告失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <p className="text-primary">加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-primary">系统公告</h1>
        {isAdminUser && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? '取消发布' : '发布公告'}
          </button>
        )}
      </div>

      {/* 发布公告表单 */}
      {showForm && isAdminUser && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="text-primary">发布新公告</h3>
          <input
            type="text"
            placeholder="公告标题"
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
            className="input"
            style={{ width: '91%', marginBottom: '1rem' }}
          />
          <textarea
            placeholder="公告内容"
            value={newAnnouncement.content}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
            className="input"
            rows="4"
            style={{ width: '91%', marginBottom: '1rem' }}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ marginRight: '1rem' }}>
              <input
                type="radio"
                value="normal"
                checked={newAnnouncement.priority === 'normal'}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
                style={{ marginRight: '0.5rem' }}
              />
              普通
            </label>
            <label>
              <input
                type="radio"
                value="high"
                checked={newAnnouncement.priority === 'high'}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
                style={{ marginRight: '0.5rem' }}
              />
              重要
            </label>
          </div>
          <button 
            onClick={handleAddAnnouncement} 
            disabled={publishing}
            className="btn btn-success"
          >
            {publishing ? '发布中...' : '发布公告'}
          </button>
        </div>
      )}

      {/* 公告列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {announcements.map(announcement => (
          <div key={announcement.id} className="card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '0.5rem'
            }}>
              <h3 className="text-primary" style={{ margin: 0 }}>
                {announcement.title}
                {announcement.priority === 'high' && (
                  <span style={{ 
                    marginLeft: '0.5rem',
                    background: 'var(--danger-color)',
                    color: 'white',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem'
                  }}>
                    重要
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {formatDate(announcement.createdAt)}
                </span>
                {isAdminUser && (
                  <button
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                    className="btn btn-danger"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
            <p className="text-secondary" style={{ 
              marginBottom: '0.5rem',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5'
            }}>
              {announcement.content}
            </p>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
              发布者: {announcement.authorName || '管理员'}
            </div>
          </div>
        ))}
      </div>

      {announcements.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="text-secondary">暂无公告</p>
          {isAdminUser && (
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              点击上方的"发布公告"按钮创建第一条公告
            </p>
          )}
        </div>
      )}
    </div>
  );
}