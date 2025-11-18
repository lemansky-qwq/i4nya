import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { getPendingRequests, acceptFriendRequest, rejectFriendRequest } from '../../lib/friends';
import { getProfileById } from '../../lib/pu';
import { Link } from 'react-router-dom';

export default function FriendRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setCurrentUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRequests();
    }
  }, [currentUser]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const pendingRequests = await getPendingRequests(currentUser.uid);
      
      const requestsWithProfiles = await Promise.all(
        pendingRequests.map(async (request) => {
          const profile = await getProfileById(request.fromUserId);
          return profile ? { ...request, profile } : null;
        })
      );
      
      setRequests(requestsWithProfiles.filter(Boolean));
    } catch (error) {
      console.error('加载好友请求失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (fromUserId) => {
    try {
      await acceptFriendRequest(currentUser.uid, fromUserId);
      setRequests(prev => prev.filter(req => req.fromUserId !== fromUserId));
    } catch (error) {
      console.error('接受请求失败:', error);
      alert('操作失败: ' + error.message);
    }
  };

  const handleReject = async (fromUserId) => {
    try {
      await rejectFriendRequest(currentUser.uid, fromUserId);
      setRequests(prev => prev.filter(req => req.fromUserId !== fromUserId));
    } catch (error) {
      console.error('拒绝请求失败:', error);
      alert('操作失败: ' + error.message);
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
        <h1>好友请求</h1>
        <Link 
          to="/friends"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--secondary-color, #95a5a6)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}
        >
          返回好友列表
        </Link>
      </div>

      {loading ? (
        <p>加载中...</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary, #666)', margin: '3rem 0' }}>
          <p>没有待处理的好友请求</p>
          <Link to="/friends">查看好友列表</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {requests.map(request => (
            <div
              key={request.fromUserId}
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
                    to={`/profile/${request.profile.id}`}
                    style={{ 
                      fontWeight: 'bold', 
                      textDecoration: 'none',
                      color: 'var(--text-color, #333)'
                    }}
                  >
                    {request.profile.nickname}
                  </Link>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary, #666)'
                  }}>
                    发送于 {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleAccept(request.fromUserId)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--success-color, #27ae60)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  接受
                </button>
                <button
                  onClick={() => handleReject(request.fromUserId)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--danger-color, #e74c3c)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}