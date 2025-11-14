// src/pages/games/gameclick.jsx
import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { save, top } from '../../lib/gs';

export default function GameClick() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(() => parseInt(localStorage.getItem('clickCount') || '0'));
  const [msg, setMsg] = useState('');
  const [load, setLoad] = useState(false);

  // 监听登录状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
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
    const updated = await save(user.uid, 'click', count);
    setLoad(false);
    setMsg(updated ? '分数保存成功！' : '未超过历史最高分');
  };

  return (
    <div className="game-container" style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>点击游戏 1.0</h1>
      <p style={{ fontSize: '1.5rem' }}>当前点击次数: <strong>{count}</strong></p>

      <div style={{ margin: '1.5rem 0' }}>
        <button
          onClick={() => setCount(c => c + 1)}
          disabled={load}
          style={{ margin: '0 0.5rem', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
        >
          点击 +1
        </button>
        <button
          onClick={() => setCount(0)}
          disabled={load}
          style={{ margin: '0 0.5rem', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
        >
          重置
        </button>
        <button
          onClick={saveScore}
          disabled={load}
          style={{ margin: '0 0.5rem', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
        >
          {load ? '保存中...' : '保存分数'}
        </button>
      </div>

      {msg && <p style={{ color: count > 0 ? 'green' : 'red', marginTop: '1rem' }}>{msg}</p>}
    </div>
  );
}