// src/pages/games/2048.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { save } from '../../lib/gs';
import './20480.css';

// === 游戏逻辑函数（保持不变）===
const generateEmptyGrid = () => Array.from({ length: 4 }, () => Array(4).fill(0));

const getRandomEmptyCell = (grid) => {
  const empty = [];
  grid.forEach((row, i) => row.forEach((cell, j) => { if (cell === 0) empty.push([i, j]); }));
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
};

const addRandomNumber = (grid) => {
  const newGrid = grid.map(row => [...row]);
  const cell = getRandomEmptyCell(newGrid);
  if (cell) newGrid[cell[0]][cell[1]] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
};

const moveGrid = (grid, direction) => {
  const clone = grid.map(row => [...row]);
  let rotated = clone;
  let scoreGained = 0;

  // 旋转函数
  const rotateLeft90 = m => m[0].map((_, i) => m.map(row => row[row.length - 1 - i]));
  const rotateRight90 = m => m[0].map((_, i) => m.map(row => row[i]).reverse());
  const rotate180 = m => rotateLeft90(rotateLeft90(m));

  // 核心：向左滑动并合并
  const slideAndMerge = row => {
    const filtered = row.filter(v => v !== 0);
    const merged = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        merged.push(filtered[i] * 2);
        scoreGained += filtered[i] * 2;
        i++; // 跳过下一个
      } else {
        merged.push(filtered[i]);
      }
    }
    return merged.concat(Array(4 - merged.length).fill(0));
  };

  // === 根据方向旋转成「向左」 ===
  if (direction === 'ArrowLeft') {
    rotated = clone;
  } else if (direction === 'ArrowRight') {
    rotated = rotate180(clone);
  } else if (direction === 'ArrowUp') {
    rotated = rotateLeft90(clone);
  } else if (direction === 'ArrowDown') {
    rotated = rotateRight90(clone);
  }

  // 执行向左滑动
  const moved = rotated.map(slideAndMerge);

  // === 旋转回原方向 ===
  if (direction === 'ArrowLeft') {
    rotated = moved;
  } else if (direction === 'ArrowRight') {
    rotated = rotate180(moved);
  } else if (direction === 'ArrowUp') {
    rotated = rotateRight90(moved); // 逆向旋转回去
  } else if (direction === 'ArrowDown') {
    rotated = rotateLeft90(moved);
  }

  return [rotated, scoreGained];
};
// === 结束 ===

const Game2048 = () => {
  const [grid, setGrid] = useState(() => addRandomNumber(addRandomNumber(generateEmptyGrid())));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('highScore') || '0'));
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('');
  const [load, setLoad] = useState(false);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  const handleMove = (dir) => {
    const [newGrid, gained] = moveGrid(grid, dir);
    if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
      setGrid(addRandomNumber(newGrid));
      const newScore = score + gained;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('highScore', newScore);
      }
    }
  };

  const resetGame = () => {
    setGrid(addRandomNumber(addRandomNumber(generateEmptyGrid())));
    setScore(0);
  };

  const saveScore = async () => {
    if (!user) return setMsg('请先登录');
    setLoad(true);
    const updated = await save(user.uid, '2048', score);
    setLoad(false);
    setMsg(updated ? '新纪录！已保存' : '未超过历史最高分');
  };

  useEffect(() => {
  const handleKey = (e) => {
    const map = {
      w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight',
      ArrowUp: 'ArrowUp', ArrowLeft: 'ArrowLeft', ArrowDown: 'ArrowDown', ArrowRight: 'ArrowRight'
    };
    const key = map[e.key] || map[e.key.toLowerCase()];
    if (key && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      handleMove(key);
    }
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, [grid, score]); // 依赖 score 也加上，避免 stale closure

  return (
    <div className="game-container" style={{ textAlign: 'center', padding: '1rem' }}>
      <h1>2048</h1>
      <p>分数: <strong>{score}</strong>　最高分: <strong>{highScore}</strong></p>

      <div className="grid" style={{ display: 'inline-block', margin: '1rem 0' }}>
        {grid.map((row, i) => (
          <div className="row" key={i} style={{ display: 'flex' }}>
            {row.map((cell, j) => (
              <div className={`cell value-${cell}`} key={j}>
                {cell || ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ margin: '1rem 0' }}>
        <button onClick={() => handleMove('ArrowUp')} style={{ margin: '0 0.3rem' }}>Up</button>
        <button onClick={() => handleMove('ArrowLeft')} style={{ margin: '0 0.3rem' }}>Left</button>
        <button onClick={() => handleMove('ArrowRight')} style={{ margin: '0 0.3rem' }}>Right</button>
        <button onClick={() => handleMove('ArrowDown')} style={{ margin: '0 0.3rem' }}>Down</button>
      </div>

      <button onClick={resetGame} style={{ margin: '0.5rem' }}>重开一局</button>
      <button onClick={saveScore} disabled={load} style={{ margin: '0.5rem' }}>
        {load ? '保存中...' : '保存分数'}
      </button>

      {msg && <p style={{ marginTop: '1rem', color: 'green' }}>{msg}</p>}
    </div>
  );
};

export default Game2048;