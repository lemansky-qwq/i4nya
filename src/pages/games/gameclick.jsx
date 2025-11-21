import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { save, getPersonalBest } from '../../lib/gs';

export default function GameClick() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(() => parseInt(localStorage.getItem('clickCount') || '0'));
  const [personalBest, setPersonalBest] = useState(0);
  const [msg, setMsg] = useState('');
  const [load, setLoad] = useState(false);

  // 监听登录状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        // 获取个人最佳成绩
        getPersonalBest(user.uid, 'click').then(best => {
          setPersonalBest(best);
        });
      }
    });
    return unsubscribe;
  }, []);

  // 本地持久化
  useEffect(() => {
    localStorage.setItem('clickCount', count.toString());
  }, [count]);

  // 保存分数
  const saveScore = async () => {
    if (!user) return setMsg('请先登录');
    setLoad(true);
    try {
      const updated = await save(user.uid, 'click', count);
      if (updated) {
        setPersonalBest(count);
        setMsg('新纪录！分数保存成功！');
      } else {
        setMsg('未超过历史最高分 ' + personalBest);
      }
    } catch (error) {
      setMsg('保存失败，请重试');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <div className="card">
        <h1 className="text-primary">点击游戏 v1.1</h1>
        
        {user && personalBest > 0 && (
          <p className="text-secondary" style={{marginBottom: '1rem' }}>
            个人最佳: <strong className="text-primary">{personalBest}</strong>
          </p>
        )}
        
        <p className="text-primary" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          当前点击次数: <strong>{count}</strong>
        </p>

        <div style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCount(c => c + 1)}
            disabled={load}
            className="btn btn-primary"
          >
            点击 +1
          </button>
          <button
            onClick={() => setCount(0)}
            disabled={load}
            className="btn btn-secondary"
          >
            重置
          </button>
          <button
            onClick={saveScore}
            disabled={load || !user}
            className="btn btn-success"
          >
            {load ? '保存中...' : '保存分数'}
          </button>
        </div>

        {!user && (
          <p className="text-warning" style={{ marginTop: '1rem' }}>
            请登录后保存分数到排行榜
          </p>
        )}

        {msg && (
          <p style={{
            marginTop: '1rem',
            color: msg.includes('新纪录') ? 'var(--success-color)' : 'var(--danger-color)',
            padding: '10px',
            background: msg.includes('新纪录') ? 'var(--success-bg)' : 'var(--error-bg)',
            border: `1px solid ${msg.includes('新纪录') ? 'var(--success-border)' : 'var(--error-border)'}`,
            borderRadius: '6px'
          }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}