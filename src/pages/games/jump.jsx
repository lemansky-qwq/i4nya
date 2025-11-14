// src/pages/games/jump.jsx
import { useEffect, useRef, useState } from 'react';
import { auth } from '../../lib/firebase';
import { save } from '../../lib/gs';



export default function JumpGame() {
  const canvasRef = useRef(null);
  const [player, setPlayer] = useState({ x: 0, y: 250 });
  const [platforms, setPlatforms] = useState([{ x: 0, width: 80 }, { x: 100, width: 80 }]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('jumpHighScore') || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargeStart, setChargeStart] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('');
  const [load, setLoad] = useState(false);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  // 绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 600; canvas.height = 300;

    const draw = () => {
      ctx.clearRect(0, 0, 600, 300);
      const offset = Math.max(0, player.x - 150);

      ctx.fillStyle = '#eee'; ctx.fillRect(0, 280, 600, 20);
      ctx.fillStyle = '#888';
      platforms.forEach((p, i) => {
        ctx.fillStyle = i === platforms.length - 1 ? '#555' : '#888';
        ctx.fillRect(p.x - offset, 260, p.width, 20);
      });

      ctx.fillStyle = gameOver ? 'red' : '#007bff';
      ctx.fillRect(player.x - offset, player.y, 20, 20);
    };
    draw();
  }, [player, platforms, gameOver]);

  const animateJump = (power) => {
    setIsJumping(true);
    const dist = Math.min(200, power * 2);
    const height = Math.min(100, power * 1.5);
    let frame = 0;
    const total = 30;
    const startX = player.x, startY = player.y;

    const jump = () => {
      frame++;
      const t = frame / total;
      const x = startX + dist * t;
      const y = startY - 4 * height * t * (1 - t);
      setPlayer({ x, y });
      if (frame < total) requestAnimationFrame(jump);
      else finishJump(x);
    };
    requestAnimationFrame(jump);
  };

  const finishJump = (x) => {
    const mid = x + 10;
    const curr = platforms[platforms.length - 2];
    const next = platforms[platforms.length - 1];

    if (mid >= next.x && mid <= next.x + next.width) {
      setPlayer({ x, y: 250 });
      setScore(s => s + 1);
      const scale = Math.min(score / 10, 1);
      const gap = 80 + scale * 60;
      const width = 60 + Math.random() * (40 - scale * 30);
      setPlatforms(p => [...p, { x: next.x + gap + Math.random() * 60, width }]);
    } else if (!(mid >= curr.x && mid <= curr.x + curr.width)) {
      setGameOver(true);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('jumpHighScore', score);
      }
    } else {
      setPlayer({ x, y: 250 });
    }
    setIsJumping(false);
  };

  const reset = () => {
    setGameOver(false); setScore(0); setPlayer({ x: 0, y: 250 });
    setPlatforms([{ x: 0, width: 80 }, { x: 100, width: 80 }]);
  };

  const saveScore = async () => {
    if (!user) return setMsg('请登录');
    setLoad(true);
    const ok = await save(user.uid, 'jump', score);
    setLoad(false);
    setMsg(ok ? '新纪录！' : '未超历史');
  };

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <h1>跳一跳！Jump 1 Jump 3.6</h1>
      <canvas ref={canvasRef} style={{ border: '1px solid #ccc' }} />
      <p style={{ margin: '1rem 0' }}>得分: <strong>{score}</strong> | 最高分: <strong>{highScore}</strong></p>

      {gameOver ? (
        <div>
          <p style={{ color: 'red', fontWeight: 'bold' }}>你掉了！</p>
          <button onClick={reset} style={{ margin: '0.5rem' }}>重新开始</button>
          <button onClick={saveScore} disabled={load} style={{ margin: '0.5rem' }}>
            {load ? '保存中...' : '保存分数'}
          </button>
          {msg && <p>{msg}</p>}
        </div>
      ) : (
        <button
          onMouseDown={() => { if (!isJumping) { setCharging(true); setChargeStart(performance.now()); } }}
          onMouseUp={() => { if (charging) { const p = Math.min((performance.now() - chargeStart) / 10, 100); setCharging(false); animateJump(p); } }}
          onTouchStart={e => { e.preventDefault(); if (!isJumping) { setCharging(true); setChargeStart(performance.now()); } }}
          onTouchEnd={e => { e.preventDefault(); if (charging) { const p = Math.min((performance.now() - chargeStart) / 10, 100); setCharging(false); animateJump(p); } }}
          disabled={isJumping}
          style={{ marginTop: '1rem', padding: '1rem 2rem', fontSize: '1.2rem' }}
        >
          {charging ? '蓄力中...' : '长按跳！'}
        </button>
      )}
    </div>
  );
}