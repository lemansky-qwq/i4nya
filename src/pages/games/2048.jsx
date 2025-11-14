import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import './20480.css';

const generateEmptyGrid = () => {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
};

const getRandomEmptyCell = (grid) => {
  const emptyCells = [];
  grid.forEach((row, i) =>
    row.forEach((cell, j) => {
      if (cell === 0) emptyCells.push([i, j]);
    })
  );
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

const addRandomNumber = (grid) => {
  const newGrid = grid.map(row => [...row]);
  const cell = getRandomEmptyCell(newGrid);
  if (cell) {
    const [i, j] = cell;
    newGrid[i][j] = Math.random() < 0.9 ? 2 : 4;
  }
  return newGrid;
};

const Game2048 = () => {
  const [grid, setGrid] = useState(() => addRandomNumber(addRandomNumber(generateEmptyGrid())));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('highScore')) || 0;
  });
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // User authentication
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('gamescores')
        .select('sc2048, profiles(nickname)')
        .order('sc2048', { ascending: false })
        .limit(10);

      if (error) {
        setError('获取排行榜失败：' + error.message);
      } else {
        setLeaderboard(data);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      let key = e.key;

      // WASD 映射成 Arrow 键
      if (key === 'w' || key === 'W') key = 'ArrowUp';
      if (key === 'a' || key === 'A') key = 'ArrowLeft';
      if (key === 's' || key === 'S') key = 'ArrowDown';
      if (key === 'd' || key === 'D') key = 'ArrowRight';

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        handleMove(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid]);

  const handleMove = (direction) => {
    const [newGrid, gained] = moveGrid(grid, direction);
    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      const updatedGrid = addRandomNumber(newGrid);
      setGrid(updatedGrid);
      const newScore = score + gained;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('highScore', newScore);
      }
    }
  };

  const resetGame = () => {
    const empty = generateEmptyGrid();
    const startGrid = addRandomNumber(addRandomNumber(empty));
    setGrid(startGrid);
    setScore(0);
  };

  const saveScore = async () => {
    if (!user) {
      setMessage('请先登录');
      return;
    }

    // 查询该用户是否已有记录
    const { data: existing, error: fetchError } = await supabase
      .from('gamescores')
      .select('sc2048')
      .eq('user_uuid', user.id)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setMessage('查询失败: ' + fetchError.message);
      return;
    }

    if (existing) {
      if (score > existing.sc2048) {
        const { error: updateError } = await supabase
          .from('gamescores')
          .update({ sc2048: score })
          .eq('user_uuid', user.id);

        if (updateError) {
          setMessage('更新失败: ' + updateError.message);
        } else {
          setMessage('新纪录，分数已更新');
          // Refresh leaderboard after update
          const { data } = await supabase
            .from('gamescores')
            .select('sc2048, profiles(nickname)')
            .order('sc2048', { ascending: false })
            .limit(10);
          setLeaderboard(data);
        }
      } else {
        setMessage(`未超过历史最高分：${existing.sc2048}，未更新`);
      }
    } else {
      // 使用 upsert 解决并发写入冲突
      const { error } = await supabase
        .from('gamescores')
        .upsert({ user_uuid: user.id, sc2048: score }, { onConflict: ['user_uuid'] });

      if (error) {
        setMessage('插入失败: ' + error.message);
      } else {
        setMessage('首次提交，分数已保存');
        // Refresh leaderboard after insert
        const { data } = await supabase
          .from('gamescores')
          .select('sc2048, profiles(nickname)')
          .order('sc2048', { ascending: false })
          .limit(10);
        setLeaderboard(data);
      }
    }
  };

  return (
    <div className="game-container">
      <h1>2048</h1>
      <p>分数：{score}　最高分：{highScore}</p>
      <p>点击下方按钮或键盘WASD进行操作</p>
      
      <div className="grid">
        {grid.map((row, i) =>
          <div className="row" key={i}>
            {row.map((cell, j) =>
              <div className={`cell value-${cell}`} key={j}>
                {cell !== 0 ? cell : ''}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 操作按钮 */}
      <div className="buttons-container">
        <button className="move-button" onClick={() => handleMove('ArrowUp')}>↑</button>
        <div className="row-buttons">
          <button className="move-button" onClick={() => handleMove('ArrowLeft')}>←</button>
          <button className="move-button" onClick={() => handleMove('ArrowRight')}>→</button>
        </div>
        <button className="move-button" onClick={() => handleMove('ArrowDown')}>↓</button>
      </div>
      
      <div className="action-buttons">
        <button onClick={resetGame}>重开一局</button>
        <button onClick={saveScore} style={{ marginLeft: '10px' }}>保存分数</button>
      </div>
      
      {message && <p className="message">{message}</p>}
      
      
    </div>
  );
};

const moveGrid = (grid, direction) => {
  const clone = grid.map(row => [...row]);
  let rotated = clone;
  let scoreGained = 0;

  const rotateRight = (matrix) =>
    matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());

  const rotateLeft = (matrix) =>
    matrix[0].map((_, i) => matrix.map(row => row[row.length - 1 - i]));

  const rotate180 = (matrix) => rotateLeft(rotateLeft(matrix));

  const slideAndMerge = (row) => {
    const newRow = row.filter(val => val !== 0);
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        scoreGained += newRow[i];
        newRow[i + 1] = 0;
      }
    }
    return newRow.filter(val => val !== 0).concat(Array(4 - newRow.filter(val => val !== 0).length).fill(0));
  };

  // 旋转处理
  if (direction === 'ArrowLeft') rotated = rotateLeft(clone);
  if (direction === 'ArrowRight') rotated = rotateRight(clone);
  if (direction === 'ArrowDown') rotated = rotate180(clone);

  const moved = rotated.map(row => slideAndMerge(row));

  // 反向旋转回去
  if (direction === 'ArrowLeft') rotated = rotateRight(moved);
  else if (direction === 'ArrowRight') rotated = rotateLeft(moved);
  else if (direction === 'ArrowDown') rotated = rotate180(moved);
  else rotated = moved; // ArrowLeft 无需旋转

  return [rotated, scoreGained];
};

export default Game2048;