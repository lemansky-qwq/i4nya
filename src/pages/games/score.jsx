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

  // 处理排名逻辑，相同分数显示相同名次
  const processRankings = (data) => {
    if (!data || data.length === 0) return [];
    
    let rankedData = [];
    let currentRank = 1;
    let previousScore = null;
    let skipCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const currentScore = data[i].s;
      
      // 如果当前分数与前一个分数相同，则名次相同
      if (previousScore !== null && currentScore === previousScore) {
        rankedData.push({
          ...data[i],
          rank: currentRank - 1 // 使用前一个名次
        });
        skipCount++;
      } else {
        rankedData.push({
          ...data[i],
          rank: currentRank
        });
	    currentRank++;
        previousScore = currentScore;
        currentRank += skipCount;
        skipCount = 0;
      }
    }
    
    return rankedData;
  };

  const Leaderboard = (title, data, gameType) => {
    const rankedData = processRankings(data);
    
    return (
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
        ) : rankedData.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center' }}>暂无数据</p>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {rankedData.map((d, i) => (
              <li key={i} style={{ 
                margin: '0.8rem 0', 
                padding: '0.8rem',
                background: d.rank <= 3 ? 'var(--warning-bg)' : 'var(--input-bg)',
                border: d.rank <= 3 ? '2px solid var(--warning-color)' : '1px solid var(--card-border)',
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
                    background: d.rank === 1 ? '#ffd700' : 
                               d.rank === 2 ? '#c0c0c0' : 
                               d.rank === 3 ? '#cd7f32' : 'var(--secondary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {d.rank}
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
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="text-primary">游戏排行榜</h1>
        <p className="text-secondary">前 5 名玩家榜单</p>
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