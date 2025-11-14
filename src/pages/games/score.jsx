import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GameLeaderboards() {
  const [clickLeaderboard, setClickLeaderboard] = useState([]);
  const [jumpLeaderboard, setJumpLeaderboard] = useState([]);
  const [leaderboard2048, setLeaderboard2048] = useState([]);
  const [loading, setLoading] = useState({
    click: false,
    jump: false,
    game2048: false
  });
  const [error, setError] = useState({
    click: null,
    jump: null,
    game2048: null
  });

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        // Fetch click game leaderboard
        setLoading(prev => ({ ...prev, click: true }));
        setError(prev => ({ ...prev, click: null }));
        
        const { data: clickData, error: clickError } = await supabase
          .from('gamescores')
          .select('click, profiles(nickname)')
          .order('click', { ascending: false })
          .limit(10);

        if (clickError) {
          setError(prev => ({ ...prev, click: '获取点击排行榜失败：' + clickError.message }));
        } else {
          setClickLeaderboard(clickData);
        }

        // Fetch jump game leaderboard - 修复排序问题
        setLoading(prev => ({ ...prev, jump: true }));
        setError(prev => ({ ...prev, jump: null }));
        
        const { data: jumpData, error: jumpError } = await supabase
          .from('gamescores')
          .select('jump, profiles(nickname)')
          .not('jump', 'is', null) // 确保只获取有jump分数的记录
          .order('jump', { ascending: false, nullsFirst: false }) // 明确降序排列
          .limit(10);

        if (jumpError) {
          setError(prev => ({ ...prev, jump: '获取Jump 1 Jump排行榜失败：' + jumpError.message }));
        } else {
          // 确保数据正确排序后再设置state
          const sortedJumpData = [...jumpData].sort((a, b) => b.jump - a.jump);
          setJumpLeaderboard(sortedJumpData);
        }

        // Fetch 2048 game leaderboard
        setLoading(prev => ({ ...prev, game2048: true }));
        setError(prev => ({ ...prev, game2048: null }));
        
        const { data: game2048Data, error: game2048Error } = await supabase
          .from('gamescores')
          .select('sc2048, profiles(nickname)')
          .order('sc2048', { ascending: false })
          .limit(10);

        if (game2048Error) {
          setError(prev => ({ ...prev, game2048: '获取2048排行榜失败：' + game2048Error.message }));
        } else {
          const sortedgame2048Data = [...game2048Data].sort((a, b) => b.sc2048 - a.sc2048);
          setLeaderboard2048(sortedgame2048Data);
        }

      } finally {
        setLoading({ click: false, jump: false, game2048: false });
      }
    };

    fetchLeaderboards();
  }, []);

  const renderLeaderboard = (title, data, loadingState, errorState, scoreField) => {
    if (loadingState) return <p>{title}加载中...</p>;
    if (errorState) return <p style={{ color: 'red' }}>{errorState}</p>;
    if (!data || data.length === 0) return <p>暂无{title}数据</p>;

    return (
      <div style={{ 
        margin: '20px 0',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          marginTop: 0,
          paddingBottom: '10px',
          borderBottom: '1px solid #eee'
        }}>{title}</h2>
        <ol style={{ 
          listStyle: 'none', 
          padding: 0,
          margin: 0
        }}>
          {data.map((item, idx) => (
            <li key={idx} style={{ 
              margin: '8px 0', 
              padding: '10px',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>
                <span style={{ fontWeight: 'bold', marginRight: '5px' }}>{idx + 1}.</span>
                <strong>{item.profiles?.nickname || '匿名玩家'}</strong>
              </span>
              <span style={{ fontWeight: 'bold' }}>{item[scoreField]}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
      }}>游戏排行榜</h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {renderLeaderboard(
          '点击游戏排行榜', 
          clickLeaderboard, 
          loading.click, 
          error.click, 
          'click'
        )}
        
        {renderLeaderboard(
          'Jump 1 Jump 游戏排行榜', 
          jumpLeaderboard, 
          loading.jump, 
          error.jump, 
          'jump'
        )}

        {renderLeaderboard(
          '2048排行榜', 
          leaderboard2048, 
          loading.game2048, 
          error.game2048, 
          'sc2048'
        )}
      </div>
    </div>
  );
}