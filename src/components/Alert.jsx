// src/components/Alert.jsx
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { hasNewAnnounce, updateLastSeen } from '../lib/pu'; // 改为 updateLastSeen
import { Link } from 'react-router-dom';

export default function Alert() {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const check = async () => {
      if (user) {
        const hasNew = await hasNewAnnounce(user.uid);
        setShow(hasNew);
      }
    };
    check();
  }, [user]);

  const close = async () => {
    if (user) {
      await updateLastSeen(user.uid); // 改为 updateLastSeen
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      background: 'var(--warning-color)',
      color: 'white',
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      maxWidth: '280px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <strong>新公告</strong>
        <button 
          onClick={close}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: 0
          }}
        >
          ×
        </button>
      </div>
      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
        有新的系统公告
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <Link 
          to="/announcements" 
          onClick={close}
          style={{
            background: 'white',
            color: 'var(--warning-color)',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.8rem'
          }}
        >
          查看
        </Link>
        <button 
          onClick={close}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          忽略
        </button>
      </div>
    </div>
  );
}