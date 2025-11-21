// score.jsx 完整修复版本
import { useState, useEffect } from 'react';
import { top, getJumpLeaderboard } from '../../lib/gs';
import { Link } from 'react-router-dom';

export default function GameLeaderboards() {
  const [click, setClick] = useState([]);
  const [jump, setJump] = useState([]); // 跳一跳榜单
  const [jump2048, setJump2048] = useState({}); // 2048目标记录
  const [f2048, setF2048] = useState([]);
  const [loading, setLoading] = useState(true);

  // 在 score.jsx 中修复调用 getJumpLeaderboard 的部分
useEffect(() => {
  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const [c, j, f] = await Promise.all([
        top('click'), 
        top('jump'), // 跳一跳榜单
        top('2048')
      ]);
      setClick(c); 
      setJump(j); // 设置跳一跳数据
      setF2048(f);
      
      // 加载2048每个跳跃目标的排行榜
      const jumpTargets = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];
      const jumpLeaderboards = {};
      
      for (const target of jumpTargets) {
        // 这里应该传目标数字，比如 128, 256 等
        const leaderboard = await getJumpLeaderboard(target, 3);
        jumpLeaderboards[target] = leaderboard;
      }
      
      setJump2048(jumpLeaderboards);
    } catch (error) {
      console.error('加载排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  loadLeaderboards();
}, []);

  // 处理排名逻辑
  const processRankings = (data) => {
    if (!data || data.length === 0) return [];
    
    let rankedData = [];
    let currentRank = 1;
    let previousScore = null;
    
    for (let i = 0; i < data.length; i++) {
      const currentScore = data[i].s;
      
      if (previousScore !== null && currentScore === previousScore) {
        rankedData.push({
          ...data[i],
          rank: currentRank - 1
        });
      } else {
        rankedData.push({
          ...data[i],
          rank: currentRank
        });
        currentRank++;
        previousScore = currentScore;
      }
    }
    
    return rankedData;
  };

  // 格式化时间显示
  const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const ms = milliseconds % 1000;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
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

// 在 score.jsx 中修改 Jump2048Leaderboard 组件
// 2048跳跃排行榜组件
const Jump2048Leaderboard = () => {
  const jumpTargets = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];
  
  // 添加调试信息
  useEffect(() => {
    if (!loading) {
      console.log('跳一跳榜单数据:', jump);
      console.log('2048目标记录数据:', jump2048);
    }
  }, [loading, jump, jump2048]);
  
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
        <h2 className="text-primary" style={{ margin: 0 }}>2048 目标记录</h2>
        <Link 
          to="/games/2048"
          className="btn btn-primary"
          style={{ textDecoration: 'none', fontSize: '0.9rem' }}
        >
          去游戏
        </Link>
      </div>
      
      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center' }}>加载中...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jumpTargets.map(target => {
            const targetData = jump2048[target];
            console.log(`目标 ${target} 数据:`, targetData); // 调试每个目标的数据
            
            return (
              <div key={target} style={{ 
                padding: '1rem',
                background: 'var(--input-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px'
              }}>
                <h3 className="text-primary" style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                  达成 {target} 最快时间
                </h3>
                {targetData && targetData.length > 0 ? (
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {targetData.map((player, index) => (
                      <li key={index} style={{ 
                        margin: '0.5rem 0',
                        padding: '0.5rem',
                        background: player.rank <= 3 ? 'var(--warning-bg)' : 'transparent',
                        border: player.rank <= 3 ? '1px solid var(--warning-color)' : '1px solid transparent',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '25px',
                            height: '25px',
                            borderRadius: '50%',
                            background: player.rank === 1 ? '#ffd700' : 
                                       player.rank === 2 ? '#c0c0c0' : 
                                       player.rank === 3 ? '#cd7f32' : 'var(--secondary-color)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                          }}>
                            {player.rank}
                          </span>
                          <span className="text-primary" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {player.n}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="text-primary" style={{ fontWeight: 'bold' }}>
                            {formatTime(player.t)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-secondary" style={{ textAlign: 'center', margin: 0 }}>
                    暂无记录
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="text-primary">游戏排行榜</h1>
        <p className="text-secondary">前几名玩家榜单</p>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gap: '1.5rem', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' 
      }}>
        {Leaderboard('点击', click, 'click')}
        {Leaderboard('🕹️ 跳一跳', jump, 'jump')} {/* 跳一跳榜单 */}
        {Leaderboard('2048', f2048, '2048')}
        {Jump2048Leaderboard()} {/* 2048目标记录 */}
      </div>
    </div>
  );
}