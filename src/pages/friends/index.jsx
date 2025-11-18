import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { getFriends, removeFriend } from '../../lib/friends';
import { getProfileById } from '../../lib/pu';
import { Link } from 'react-router-dom';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadFriends();
    }
  }, [currentUser]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const friendIds = await getFriends(currentUser.uid);
      
      // 获取所有好友的详细信息
      const friendsData = await Promise.all(
        friendIds.map(async (friendId) => {
          const profile = await getProfileById(friendId);
          return profile ? { ...profile, friendId } : null;
        })
      );
      
      setFriends(friendsData.filter(Boolean));
    } catch (error) {
      console.error('加载好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('确定要删除这位好友吗？')) return;
    
    try {
      await removeFriend(currentUser.uid, friendId);
      setFriends(prev => prev.filter(friend => friend.uid !== friendId));
    } catch (error) {
      console.error('删除好友失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ textAlign: 'center', margin: '2rem' }}>
        <p>请先登录</p>
        <Link to="/login">去登录</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>好友列表</h1>
        <Link 
          to="/friends/requests"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--primary-color, #3498db)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}
        >
          好友请求
        </Link>
      </div>

      {loading ? (
        <p>加载中...</p>
      ) : friends.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary, #666)', margin: '3rem 0' }}>
          <p>还没有好友</p>
          <p>去个人资料页添加好友吧！</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {friends.map(friend => (
            <div
              key={friend.uid}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '8px',
                background: 'var(--bg-color, #fff)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <Link 
                    to={`/profile/${friend.id}`}
                    style={{ 
                      fontWeight: 'bold', 
                      textDecoration: 'none',
                      color: 'var(--text-color, #333)'
                    }}
                  >
                    {friend.nickname}
                  </Link>
                  {friend.bio && (
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary, #666)'
                    }}>
                      {friend.bio}
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleRemoveFriend(friend.uid)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--danger-color, #e74c3c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                删除好友
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}