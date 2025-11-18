// src/pages/profile.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { getProfileById, updateProfileBio } from '../lib/pu';

export default function Profile() {
  const params = useParams();
  const { id } = params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // 获取当前登录用户
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id || id === 'null' || id === 'undefined') {
        setError('ID 无效');
        setLoading(false);
        return;
      }

      try {
        const data = await getProfileById(id);
        if (data) {
          setProfile(data);
          setNewBio(data.bio || '');
        } else {
          setError('用户不存在');
        }
      } catch (e) {
        setError('加载出错');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // 检查当前用户是否有权限编辑
  const canEdit = currentUser && profile && currentUser.uid === profile.uid;

  const handleSaveBio = async () => {
    if (!canEdit) return;
    
    setSaveLoading(true);
    try {
      await updateProfileBio(profile.id, newBio, currentUser.uid);
      
      // 更新本地状态
      setProfile(prev => ({
        ...prev,
        bio: newBio
      }));
      
      setIsEditing(false);
    } catch (error) {
      console.error('保存失败:', error);
      setError('保存失败: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setNewBio(profile.bio || '');
    setIsEditing(false);
  };

  if (loading) return <p>加载中…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!profile) return <p>用户不存在</p>;

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ 
        background: 'var(--card-bg, #fff)', 
        padding: '2rem', 
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '0.5rem' }}>{profile.nickname}</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          <strong>ID:</strong> {profile.id}
        </p>
        
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ margin: 0 }}>简介</h3>
            {canEdit && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                编辑
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div>
              <textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="写下你的简介..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  minHeight: '100px'
                }}
                maxLength={200}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.5rem'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {newBio.length}/200
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={handleCancelEdit}
                    disabled={saveLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#95a5a6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveBio}
                    disabled={saveLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {saveLoading ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ 
              margin: 0, 
              padding: '1rem',
              background: 'var(--bg-color, #f8f9fa)',
              borderRadius: '6px',
              minHeight: '60px',
              whiteSpace: 'pre-wrap'
            }}>
              {profile.bio || '暂无简介'}
            </p>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          color: '#666',
          fontSize: '0.9rem',
          borderTop: '1px solid #eee',
          paddingTop: '1rem'
        }}>
          <span>注册时间: {new Date(profile.createdAt).toLocaleDateString()}</span>
          {profile.lastLoginAt && (
            <span>最后登录: {new Date(profile.lastLoginAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}