import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GameClick() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(() => 
    parseInt(localStorage.getItem('clickCount') || '0')
  );
  const [message, setMessage] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取当前用户
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 保存点击计数到本地存储
  useEffect(() => {
    localStorage.setItem('clickCount', count.toString());
  }, [count]);

  // 获取排行榜
  const fetchLeaderboard = async () => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from('gamescores')
      .select(`
        click,
        profiles:user_uuid (username)
      `)
      .order('click', { ascending: false }) // 明确降序（从大到小）
      .limit(10);

    if (error) throw error;

    // 二次排序确保数据正确（防御性编程）
    const formattedData = data
      .map(item => ({
        username: item.profiles?.username || 'Anonymous',
        click: item.click
      }))
      .sort((a, b) => b.click - a.click); // 再次降序排序

    setLeaderboard(formattedData);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    setMessage('获取排行榜失败');
  } finally {
    setIsLoading(false);
  }
};

  // 保存分数
  const saveScore = async () => {
    if (!user) {
      setMessage('请先登录');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('gamescores')
        .upsert(
          { 
            user_uuid: user.id, 
            click: Math.max(count, 1) // 确保至少为1
          }, 
          { 
            onConflict: 'user_uuid'
          }
        );

      if (error) throw error;

      setMessage('分数保存成功!');
      await fetchLeaderboard(); // 保存后刷新排行榜
    } catch (error) {
      console.error('保存分数失败:', error);
      setMessage(`保存失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="game-container">
      <h1>点击游戏 1.0</h1>
      <div className="game-stats">
        <p>当前点击次数: <span className="count">{count}</span></p>
        <div className="button-group">
          <button 
            onClick={() => setCount(c => c + 1)}
            disabled={isLoading}
          >
            点击
          </button>
          <button 
            onClick={() => setCount(0)}
            disabled={isLoading}
          >
            重置
          </button>
          <button 
            onClick={saveScore}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存分数'}
          </button>
        </div>
        {message && <p className="message">{message}</p>}
      </div>

      
    </div>
  );
}