import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { getPendingRequests, acceptFriendRequest, rejectFriendRequest } from '../../lib/friends';
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
      console.log('加载的好友请求:', pendingRequests);
      setRequests(pendingRequests);
    } catch (error) {
      console.error('加载好友请求失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (fromRequestId) => {
    console.log('接受请求，fromRequestId:', fromRequestId);
    try {
      await acceptFriendRequest(currentUser.uid, fromRequestId);
      setRequests(prev => prev.filter(req => req.fromUserId !== fromRequestId));
    } catch (error) {
      console.error('接受请求失败:', error);
      alert('操作失败: ' + error.message);
    }
  };

  const handleReject = async (fromRequestId) => {
    console.log('拒绝请求，fromRequestId:', fromRequestId);
    try {
      await rejectFriendRequest(currentUser.uid, fromRequestId);
      setRequests(prev => prev.filter(req => req.fromUserId !== fromRequestId));
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
            background: 'var(--secondary-color)',
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
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '3rem 0' }}>
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
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--card-bg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: 'var(--text-color)'
                  }}>
                    {request.profile?.nickname || '未知用户'}
                  </div>
                  <p style={{ 
                    margin: '0.25rem 0 0 0', 
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                    发送于 {new Date(request.createdAt).toLocaleString()}
                    <br />
                    请求ID: {request.fromUserId}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleAccept(request.fromUserId)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--success-color)',
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
                    background: 'var(--danger-color)',
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