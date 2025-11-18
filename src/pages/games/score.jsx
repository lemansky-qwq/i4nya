import { useState, useEffect } from 'react';
import { top } from '../../lib/gs';
import { Link } from 'react-router-dom';

export default function GameLeaderboards() {
  const [click, setClick] = useState([]);
  const [jump, setJump] = useState([]);
  const [f2048, setF2048] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboards = async () => {
      setLoading(true);
      try {
        const [c, j, f] = await Promise.all([
          top('click'), 
          top('jump'), 
          top('2048')
        ]);
        setClick(c); 
        setJump(j); 
        setF2048(f);
      } catch (error) {
        console.error('加载排行榜失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboards();
  }, []);

  const Leaderboard = (title, data, gameType) => (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        borderBottom: '2px solid var(--primary-color)',
        paddingBottom: '0.5rem'
      }}>
        <h2 className="text-primary" style={{ margin: 0 }}>{title}</h2>
        <Link 
          to={`/games/${gameType}`}
          className="btn btn-primary"
          style={{ textDecoration: 'none', fontSize: '0.9rem' }}
        >
          去游戏
        </Link>
      </div>
      
      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center' }}>加载中...</p>
      ) : data.length === 0 ? (
        <p className="text-secondary" style={{ textAlign: 'center' }}>暂无数据</p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {data.map((d, i) => (
            <li key={i} style={{ 
              margin: '0.8rem 0', 
              padding: '0.8rem',
              background: i < 3 ? 'var(--warning-bg)' : 'var(--input-bg)',
              border: i < 3 ? '2px solid var(--warning-color)' : '1px solid var(--card-border)',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--secondary-color)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  {i + 1}
                </span>
                <div>
                  <span className="text-primary" style={{ fontWeight: 'bold' }}>
                    {d.n}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    (ID:{d.id})
                  </span>
                </div>
              </div>
              <span className="text-primary" style={{ 
                fontSize: '1.2rem', 
                fontWeight: 'bold'
              }}>
                {d.s}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="text-primary">游戏排行榜</h1>
        <p className="text-secondary">前8名玩家榜单</p>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gap: '1.5rem', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' 
      }}>
        {Leaderboard('点击', click, 'click')}
        {Leaderboard('🕹️ 跳一跳', jump, 'jump')}
        {Leaderboard('2048', f2048, '2048')}
      </div>
    </div>
  );
}