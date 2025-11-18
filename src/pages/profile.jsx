import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { getProfileById, updateProfileBio } from '../lib/pu';
import { getFriendStatus, sendFriendRequest, removeFriend, acceptFriendRequest, rejectFriendRequest } from '../lib/friends';

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
  const [friendStatus, setFriendStatus] = useState('loading');
  const [friendActionLoading, setFriendActionLoading] = useState(false);

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

  // 检查好友状态
  useEffect(() => {
    const checkFriendStatus = async () => {
      if (currentUser && profile) {
        try {
          const status = await getFriendStatus(currentUser.uid, profile.uid);
          setFriendStatus(status);
        } catch (error) {
          console.error('检查好友状态失败:', error);
          setFriendStatus('none');
        }
      }
    };
    
    if (currentUser && profile) {
      checkFriendStatus();
    }
  }, [currentUser, profile]);

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

  // 好友操作
  const handleFriendAction = async () => {
  if (!currentUser || !profile) return;
  
  setFriendActionLoading(true);
  try {
    if (friendStatus === 'none') {
      // 发送好友请求 - 传递的是 UID
      await sendFriendRequest(currentUser.uid, profile.uid);
      setFriendStatus('request_sent');
    } else if (friendStatus === 'friend') {
      // 删除好友 - 传递的是 UID
      if (window.confirm(`确定要删除好友 ${profile.nickname} 吗？`)) {
        await removeFriend(currentUser.uid, profile.uid);
        setFriendStatus('none');
      }
    } else if (friendStatus === 'request_received') {
      // 接受好友请求 - 传递的是 UID
      await acceptFriendRequest(currentUser.uid, profile.uid);
      setFriendStatus('friend');
    } else if (friendStatus === 'request_sent') {
      setError('已发送请求，请等待对方处理');
    }
  } catch (error) {
    console.error('好友操作失败:', error);
    setError('操作失败: ' + error.message);
  } finally {
    setFriendActionLoading(false);
  }
};

  const getFriendButtonText = () => {
    switch (friendStatus) {
      case 'friend': return '删除好友';
      case 'request_sent': return '已发送请求';
      case 'request_received': return '接受请求';
      case 'loading': return '加载中...';
      default: return '添加好友';
    }
  };

  const getFriendButtonColor = () => {
    switch (friendStatus) {
      case 'friend': return 'var(--danger-color)';
      case 'request_sent': return 'var(--secondary-color)';
      case 'request_received': return 'var(--success-color)';
      default: return 'var(--primary-color)';
    }
  };

  if (loading) return <p className="text-primary" style={{ textAlign: 'center' }}>加载中…</p>;
  if (error) return <p style={{ color: 'var(--danger-color)', textAlign: 'center' }}>{error}</p>;
  if (!profile) return <p className="text-primary" style={{ textAlign: 'center' }}>用户不存在</p>;

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      {/* 用户基本信息卡片 */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="text-primary" style={{ marginBottom: '0.5rem' }}>{profile.nickname}</h1>
        <p className="text-secondary">
          用户 ID: {profile.id}
        </p>
      </div>

      {/* 好友功能按钮 - 如果不是自己的资料页 */}
      {currentUser && profile && currentUser.uid !== profile.uid && (
        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <button
            onClick={handleFriendAction}
            disabled={friendActionLoading || friendStatus === 'loading'}
            style={{
              padding: '0.75rem 2rem',
              background: getFriendButtonColor(),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: friendActionLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: friendActionLoading ? 0.6 : 1
            }}
          >
            {friendActionLoading ? '处理中...' : getFriendButtonText()}
          </button>
        </div>
      )}

      {/* 简介部分 */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 className="text-primary" style={{ margin: 0 }}>个人简介</h3>
          {canEdit && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.9rem' }}
            >
              编辑简介
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
              className="input"
              style={{
                width: '100%',
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
              <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                {newBio.length}/200
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handleCancelEdit}
                  disabled={saveLoading}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveBio}
                  disabled={saveLoading}
                  className="btn btn-success"
                >
                  {saveLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '1rem',
            border: '1px solid var(--card-border)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            minHeight: '60px',
            whiteSpace: 'pre-wrap',
            background: 'var(--input-bg)'
          }}>
            {profile.bio || '这个人很懒，什么都没写'}
          </div>
        )}
      </div>

      {/* 用户信息统计 */}
      <div className="card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--card-border)'
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