// src/pages/games/score.jsx
import { useState, useEffect } from 'react';
import { top } from '../../lib/gs';

export default function GameLeaderboards() {
  const [click, setClick] = useState([]);
  const [jump, setJump] = useState([]);
  const [f2048, setF2048] = useState([]);

  useEffect(() => {
    Promise.all([top('click'), top('jump'), top('2048')])
      .then(([c, j, f]) => {
        setClick(c); setJump(j); setF2048(f);
      });
  }, []);

  const Leaderboard = (title, data) => (
    <div style={{ margin: '1.5rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ margin: '0 0 1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>{title}</h2>
      {data.length === 0 ? (
        <p>暂无数据</p>
      ) : (
        <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
          {data.map((d, i) => (
            <li key={i} style={{ margin: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{i + 1}. {d.n}</strong></span>
              <span><strong>{d.s}</strong></span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>游戏排行榜</h1>
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {Leaderboard('点击游戏排行榜', click)}
        {Leaderboard('跳一跳排行榜', jump)}
        {Leaderboard('2048排行榜', f2048)}
      </div>
    </div>
  );
}