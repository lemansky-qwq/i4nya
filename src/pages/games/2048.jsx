import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../../lib/firebase';
import { save, getPersonalBest, saveJumpRecord, getJumpRecords } from '../../lib/gs';
import './20480.css';

// 游戏逻辑函数（保持不变）
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

  // 根据方向旋转成「向左」
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

  // 旋转回原方向
  if (direction === 'ArrowLeft') {
    rotated = moved;
  } else if (direction === 'ArrowRight') {
    rotated = rotate180(moved);
  } else if (direction === 'ArrowUp') {
    rotated = rotateRight90(moved);
  } else if (direction === 'ArrowDown') {
    rotated = rotateLeft90(moved);
  }

  return [rotated, scoreGained];
};

// 格式化时间显示
const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 1); // 只取前3位毫秒
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// 跳跃目标值
const JUMP_TARGETS = [128, 256, 512, 1024, 2048, 4096, 8192, 16384];

const Game2048 = () => {
  const [grid, setGrid] = useState(() => addRandomNumber(addRandomNumber(generateEmptyGrid())));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('2048HighScore') || '0'));
  const [personalBest, setPersonalBest] = useState(0);
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [load, setLoad] = useState(false);
  
  // 计时器状态
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState(0); // 记录最后一次移动的时间戳
  const [jumps, setJumps] = useState([]);
  const [achievedJumps, setAchievedJumps] = useState(new Set());

  // 监听登录状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        // 获取个人最佳成绩
        const best = await getPersonalBest(user.uid, '2048');
        setPersonalBest(best);
        
        // 获取已有的跳跃记录
        const jumpRecords = await getJumpRecords(user.uid, '2048');
        const achieved = new Set();
        const jumpList = [];
        
        Object.keys(jumpRecords).forEach(key => {
          const target = parseInt(key.replace('jump_', ''));
          if (JUMP_TARGETS.includes(target)) {
            achieved.add(target);
            jumpList.push({
              value: target,
              time: jumpRecords[key].time,
              displayTime: formatTime(jumpRecords[key].time),
              score: jumpRecords[key].score,
              timestamp: jumpRecords[key].achievedAt
            });
          }
        });
        
        setAchievedJumps(achieved);
        setJumps(jumpList.sort((a, b) => a.value - b.value));
      } else {
        setJumps([]);
        setAchievedJumps(new Set());
      }
    });
    return unsubscribe;
  }, []);

  // 高精度计时器逻辑
  useEffect(() => {
    let animationFrameId;
    let lastTimestamp = 0;

    const updateTimer = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      
      const elapsed = timestamp - lastTimestamp;
      
      if (elapsed >= 10) { // 每10毫秒更新一次
        setTime(prevTime => prevTime + elapsed);
        lastTimestamp = timestamp;
      }
      
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (isRunning) {
      lastTimestamp = 0;
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isRunning]);

  // 修改移动处理函数
  const handleMove = (dir) => {
  // 如果是计时模式且游戏暂停，但时间还是0（未开始），允许第一次移动
  if (timerEnabled && !isRunning && time > 0) return;
  
  const [newGrid, gained] = moveGrid(grid, dir);
  if (JSON.stringify(newGrid) !== JSON.stringify(grid)) {
    setGrid(addRandomNumber(newGrid));
    const newScore = score + gained;
    setScore(newScore);
    
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('2048HighScore', newScore);
    }
    
    // 关键修改：每次有效移动都更新时间戳
    const currentTime = Date.now();
    
    // 如果是计时模式且游戏未开始，开始计时
    if (timerEnabled && !isRunning && time === 0) {
      setIsRunning(true);
      setLastMoveTime(currentTime);
    } 
    // 如果游戏已经在进行，更新最后一次移动时间
    else if (timerEnabled && isRunning) {
      setLastMoveTime(currentTime);
    }
    
    // 检查是否达成新目标
    checkNewAchievements(newGrid.flat());
  }
};

  // 检查新达成的目标
  const checkNewAchievements = (currentGrid) => {
    const currentMax = Math.max(...currentGrid);
    const newAchievements = JUMP_TARGETS.filter(target => 
      currentMax >= target && !achievedJumps.has(target)
    );
    
    if (newAchievements.length > 0) {
      setAchievedJumps(prev => new Set([...prev, ...newAchievements]));
      // 可以在这里添加达成目标的提示
      console.log(`达成新目标: ${newAchievements.join(', ')}`);
    }
  };

  // 修改暂停并保存函数
  const pauseAndUpdate = async () => {
    if (!user) {
      setMsg('请先登录后保存计时记录');
      setMsgType('error');
      return;
    }

    setIsRunning(false);
    setLoad(true);
    
    try {
      const currentMax = Math.max(...grid.flat());
      const newAchievements = [];
      
      // 扫描当前达到的目标
      JUMP_TARGETS.forEach(target => {
        if (currentMax >= target) {
          newAchievements.push(target);
        }
      });

      if (newAchievements.length === 0) {
        setMsg('没有达成任何目标，无需保存');
        setMsgType('info');
        setLoad(false);
        return;
      }

      let updatedCount = 0;
      let fasterCount = 0;
      
      for (const target of newAchievements) {
        try {
          // 保存毫秒时间
          const saved = await saveJumpRecord(user.uid, '2048', target, time, score);
          if (saved) {
            updatedCount++;
            setAchievedJumps(prev => new Set([...prev, target]));
            
            // 检查是否是个人新纪录
            const existingJump = jumps.find(jump => jump.value === target);
            if (!existingJump || time < existingJump.time) {
              fasterCount++;
              
              // 更新或添加记录
              setJumps(prev => {
                const filtered = prev.filter(jump => jump.value !== target);
                return [
                  ...filtered,
                  {
                    value: target,
                    time: time,
                    displayTime: formatTime(time),
                    score: score,
                    timestamp: new Date().toISOString(),
                    isNew: true
                  }
                ].sort((a, b) => a.value - b.value);
              });
            }
          }
        } catch (error) {
          console.error(`保存目标 ${target} 失败:`, error);
        }
      }
      
      if (updatedCount > 0) {
        if (fasterCount > 0) {
          setMsg(`刷新了 ${fasterCount} 个个人记录！用时 ${formatTime(time)}`);
        } else {
          setMsg(`保存了 ${updatedCount} 个目标记录，用时 ${formatTime(time)}`);
        }
        setMsgType('success');
        
        // 移除新标记
        setTimeout(() => {
          setJumps(prev => prev.map(jump => ({ ...jump, isNew: false })));
        }, 3000);
      } else {
        setMsg('所有目标已有更快的记录，无需更新');
        setMsgType('info');
      }
      
    } catch (error) {
      console.error('保存计时记录失败:', error);
      setMsg('保存失败，请检查网络连接');
      setMsgType('error');
    } finally {
      setLoad(false);
    }
  };

  // 修改重置游戏函数
  const resetGame = () => {
    setGrid(addRandomNumber(addRandomNumber(generateEmptyGrid())));
    setScore(0);
    setTime(0);
    setIsRunning(false);
    setLastMoveTime(0);
  };

  // 修改启用计时器函数
  const enableTimer = () => {
    // 启用计时模式时重置游戏
    setGrid(addRandomNumber(addRandomNumber(generateEmptyGrid())));
    setScore(0);
    setTime(0);
    setIsRunning(false);
    setLastMoveTime(0);
    setTimerEnabled(true);
  };

  const disableTimer = () => {
    setTimerEnabled(false);
    setIsRunning(false);
  };

const saveAndRestart = async () => {
  if (!timerEnabled) return;
  
  // 先暂停游戏
  setIsRunning(false);
  
  // 如果有达成目标，先保存
  if (user) {
    const currentMax = Math.max(...grid.flat());
    const newAchievements = [];
    
    // 扫描当前达到的目标
    JUMP_TARGETS.forEach(target => {
      if (currentMax >= target) {
        newAchievements.push(target);
      }
    });

    if (newAchievements.length > 0) {
      setLoad(true);
      try {
        let updatedCount = 0;
        
        for (const target of newAchievements) {
          try {
            // 保存毫秒时间
            const saved = await saveJumpRecord(user.uid, '2048', target, time, score);
            if (saved) {
              updatedCount++;
              setAchievedJumps(prev => new Set([...prev, target]));
              
              // 更新或添加记录
              setJumps(prev => {
                const filtered = prev.filter(jump => jump.value !== target);
                return [
                  ...filtered,
                  {
                    value: target,
                    time: time,
                    displayTime: formatTime(time),
                    score: score,
                    timestamp: new Date().toISOString(),
                    isNew: true
                  }
                ].sort((a, b) => a.value - b.value);
              });
            }
          } catch (error) {
            console.error(`保存目标 ${target} 失败:`, error);
          }
        }
        
        if (updatedCount > 0) {
          setMsg(`已保存 ${updatedCount} 个目标记录，用时 ${formatTime(time)}`);
          setMsgType('success');
          
          // 移除新标记
          setTimeout(() => {
            setJumps(prev => prev.map(jump => ({ ...jump, isNew: false })));
          }, 3000);
        }
      } catch (error) {
        console.error('保存记录失败:', error);
        setMsg('保存记录失败');
        setMsgType('error');
      } finally {
        setLoad(false);
      }
    }
  }
  
  // 重置游戏状态
  setGrid(addRandomNumber(addRandomNumber(generateEmptyGrid())));
  setScore(0);
  setTime(0);
  setIsRunning(false);
};

  const saveScore = async () => {
    if (!user) {
      setMsg('请先登录');
      setMsgType('error');
      return;
    }
    setLoad(true);
    try {
      const updated = await save(user.uid, '2048', score);
      if (updated) {
        setPersonalBest(score);
        setMsg('新纪录！已保存');
        setMsgType('success');
      } else {
        setMsg('未超过历史最高分 ' + personalBest);
        setMsgType('info');
      }
    } catch (error) {
      setMsg('保存失败');
      setMsgType('error');
    } finally {
      setLoad(false);
    }
  };

  const toggleTimer = () => {
    if (!timerEnabled) return;
    
    if (isRunning) {
      // 暂停游戏
      setIsRunning(false);
      setMsg('游戏已暂停');
      setMsgType('info');
    } else {
      // 继续游戏
      if (time === 0) {
        // 如果时间是0，说明还没开始，需要第一次移动来启动
        setMsg('请进行一次移动来开始计时');
        setMsgType('info');
      } else {
        setIsRunning(true);
        setMsg('游戏继续');
        setMsgType('success');
        setTimeout(() => setMsg(''), 1000);
      }
    }
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
  }, [grid, score, timerEnabled, isRunning]);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <div className="card">
        <h1 className="text-primary">2048 v4.1</h1>
        
        {user && personalBest > 0 && (
          <p className="text-secondary" style={{marginBottom: '0.5rem' }}>
            个人最佳: <strong className="text-primary">{personalBest}</strong>
          </p>
        )}
        
        <p className="text-primary">
          分数: <strong>{score}</strong>　本地最高: <strong>{highScore}</strong>
        </p>

        {/* 计时器控制 */}
<div className="timer-section">
  <div className="timer-toggle">
    <label>
      <input
        type="checkbox"
        checked={timerEnabled}
        onChange={(e) => e.target.checked ? enableTimer() : disableTimer()}
        style={{ marginRight: '8px' }}
      />
      启用计时模式
    </label>
    <span className={`timer-status ${isRunning ? 'running' : time > 0 ? 'paused' : 'stopped'}`}></span>
  </div>
  
  {timerEnabled && (
    <>
      <div className="timer-display">{formatTime(time)}</div>
      <div className="timer-controls">
        {/* 计时控制按钮 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`timer-btn ${isRunning ? 'warning' : 'primary'}`}
            onClick={toggleTimer}
            disabled={!timerEnabled}
            style={{ minWidth: '100px' }}
          >
            {isRunning ? '暂停' : '继续'}
          </button>
          <button 
            className="timer-btn success"
            onClick={saveAndRestart}
            disabled={!timerEnabled}
            style={{
              minWidth: '140px',
              background: 'var(--primary-color)',
              color: 'white',
              border: '1px solid var(--primary-color)',
              fontWeight: 'bold'
            }}
          >
            保存并重新开始
          </button>
          <button 
            className="timer-btn success"
            onClick={pauseAndUpdate}
            disabled={!timerEnabled || !user}
            style={{
              minWidth: '120px',
              background: 'var(--success-color)',
              color: 'white',
              border: '1px solid var(--success-color)',
              fontWeight: 'bold'
            }}
          >
            保存计时
          </button>
        </div>
      </div>
    </>
  )}
</div>

        {/* 游戏网格 - 保持原来的结构 */}
        <div className="grid-container">
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
          
          {/* 暂停遮罩 */}
          {timerEnabled && !isRunning && time > 0 && (
            <div className="game-paused">
              游戏暂停
            </div>
          )}
        </div>

        <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleMove('ArrowUp')} 
            className="btn btn-primary"
            disabled={timerEnabled && !isRunning && time > 0}
          >
            上
          </button>
          <button 
            onClick={() => handleMove('ArrowLeft')} 
            className="btn btn-primary"
            disabled={timerEnabled && !isRunning && time > 0}
          >
            左
          </button>
          <button 
            onClick={() => handleMove('ArrowRight')} 
            className="btn btn-primary"
            disabled={timerEnabled && !isRunning && time > 0}
          >
            右
          </button>
          <button 
            onClick={() => handleMove('ArrowDown')} 
            className="btn btn-primary"
            disabled={timerEnabled && !isRunning && time > 0}
          >
            下
          </button>
        </div>

        {/* 跳跃记录 */}
        {(jumps.length > 0 || timerEnabled) && (
          <div className="jumps-section">
            <div className="jumps-title">个人目标记录</div>
            <div className="jumps-list">
              {jumps.length > 0 ? (
                jumps.map((jump, index) => (
                  <div key={index} className={`jump-item ${jump.isNew ? 'new-achievement' : ''}`}>
                    <span className="jump-value">{jump.value}</span>
                    <span className="jump-time">用时: {jump.displayTime}</span>
                  </div>
                ))
              ) : (
                <div className="jumps-empty">
                  {user ? '尚未达成任何目标' : '请登录查看目标记录'}
                  <br />
                  <small>目标: 128, 256, 512, 1024, 2048, 4096, 8192, 16384</small>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={resetGame} className="btn btn-secondary">重新开始</button>
          <button onClick={saveScore} disabled={load || !user} className="btn btn-success">
            {load ? '保存中...' : '保存分数'}
          </button>
        </div>

        {!user && (
          <p className="text-warning" style={{ marginTop: '1rem' }}>
            请登录后保存分数到排行榜
          </p>
        )}

        {msg && (
          <div style={{
            marginTop: '1rem',
            padding: '15px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1em',
            textAlign: 'center',
            border: msgType === 'success' ? '2px solid var(--success-color)' : 
                   msgType === 'error' ? '2px solid var(--danger-color)' : '2px solid var(--warning-color)',
            background: msgType === 'success' ? 'var(--success-bg)' : 
                       msgType === 'error' ? 'var(--error-bg)' : 'var(--warning-bg)',
            color: msgType === 'success' ? 'var(--success-color)' : 
                  msgType === 'error' ? 'var(--danger-color)' : 'var(--warning-color)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            {msg}
          </div>
        )}

        <p className="text-muted" style={{ fontSize: '0.8em', marginTop: '1rem' }}>
          提示：可以使用键盘方向键或 WASD 键操作
          {timerEnabled && ' | 计时模式下暂停期间无法操作'}
        </p>
      </div>
    </div>
  );
};

export default Game2048;