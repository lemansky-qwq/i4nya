import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { db, auth } from '../../lib/firebase';
import { getNumericIdByUid } from '../../lib/pu';

const LANE_COUNT = 9;
const LANE_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const SLIDE_MAP = { 1: ['Z','X'], 2: ['X','C'], 3: ['C','V'], 4: ['V','B'], 5: ['B','N'], 6: ['N','M'], 7: ['M',','] };

const LANE_WIDTH = 64;
const CANVAS_WIDTH = LANE_COUNT * LANE_WIDTH;
const JUDGE_LINE_Y = 600;
const NOTE_H = 22;
const NOTE_WIDTH_SCALE = 0.8;

const JUDGE_DELAY = 50;
const CPERFECT = 25;
const PERFECT = 80;
const GREAT_WIN = 130;
const GOOD = 180;
const HOLD_WINDOW = 100;

const SUBDIVISIONS = 8;
const getBeatDur = (bpm) => 60 / bpm;
const beatPosToTime = (bar, beat, sub, bpm) => ((bar-1)*4+(beat-1)+sub/SUBDIVISIONS)*getBeatDur(bpm);

const getGrade = (s) => {
  if (s>=1005000) return 'SSS+'; if (s>=1000000) return 'SSS'; if (s>=990000) return 'SS';
  if (s>=970000) return 'S'; if (s>=950000) return 'AAA'; if (s>=930000) return 'AA';
  if (s>=900000) return 'A'; if (s>=850000) return 'B'; if (s>=800000) return 'C'; return 'D';
};
const getRating = (s, c) => {
  const b = Math.round(c * 100);
  let d = 0;
  let remaining = s;
  if (remaining >= 1005000) { d += Math.floor((remaining - 1005000) / 500); remaining = 1005000; }
  if (remaining >= 1000000) { d += Math.floor((remaining - 1000000) / 100); remaining = 1000000; }
  if (remaining >= 970000) { d += Math.floor((remaining - 970000) / 250); remaining = 970000; }
  if (remaining < 900000) { d -= Math.floor((900000 - remaining) / 100); remaining = 900000; }
  if (remaining < 970000) { d -= Math.floor((970000 - remaining) / 200); }
  return Math.max(0, b + d);
};

export default function Fplay() {
  const { songId, difficulty } = useParams();
  const chartId = `${songId}_${difficulty}`;
  const navigate = useNavigate();
  const canvasRef = useRef(null); const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const hitBufferRef = useRef(null);
  const dragBufferRef = useRef(null);
  const flickBufferRef = useRef(null);
  const audioDelayRef = useRef(0); const chartRef = useRef(null);
  const pressedKeysRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [speed, setSpeed] = useState(1.5);
  const [audioDelay, setAudioDelay] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [showFastLate, setShowFastLate] = useState(false);
  const [gameState, setGameState] = useState('ready');
  const [currentTime, setCurrentTime] = useState(0);
  const [s1, setS1] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgments, setJudgments] = useState({ bigP:0, smallP:0, great:0, good:0, miss:0, holdH:0, holdM:0, slideH:0, slideM:0, fast:0, late:0 });
  const [judgeAnim, setJudgeAnim] = useState(null);
  const [judgeDetail, setJudgeDetail] = useState('');
  const [finalGrade, setFinalGrade] = useState('');
  const [finalRating, setFinalRating] = useState(0);

  const notesRef = useRef([]); const judgedRef = useRef(new Set());
  const comboRef = useRef(0); const s1Ref = useRef(0);
  const animFrameRef = useRef(null); const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0); const totalPausedRef = useRef(0);
  const totalValRef = useRef(0); const gameStateRef = useRef('ready');
  const currentTimeRef = useRef(0); const speedRef = useRef(1.5);
  const jRef = useRef({ bigP:0, smallP:0, great:0, good:0, miss:0, holdH:0, holdM:0, slideH:0, slideM:0, fast:0, late:0 });

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { audioDelayRef.current = audioDelay; }, [audioDelay]);
  useEffect(() => {
    const s = localStorage.getItem('rhythm_settings');
    if (s) { try { const p = JSON.parse(s); if (p.speed) setSpeed(p.speed); if (p.audioDelay !== undefined) setAudioDelay(p.audioDelay); if (p.showDetail !== undefined) setShowDetail(p.showDetail); if (p.showFastLate !== undefined) setShowFastLate(p.showFastLate); } catch {} }
  }, []);
  const saveSettings = useCallback(() => localStorage.setItem('rhythm_settings', JSON.stringify({ speed, audioDelay, showDetail, showFastLate })), [speed, audioDelay, showDetail, showFastLate]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, `charts/${chartId}`));
        if (!snap.exists()) { setLoading(false); return; }
        const data = snap.val(); setChart(data); chartRef.current = data;
        setAudioUrl(data.meta?.audioUrl || `/audio/${data.meta?.songId || songId}.mp3`);
        setLoading(false);
      } catch (e) { setLoading(false); }
    })();
  }, [chartId]);

  useEffect(() => {
    const c = canvasRef.current;
    if (c) { c.width = CANVAS_WIDTH; c.height = 700; c.style.width = `${CANVAS_WIDTH}px`; c.style.height = '700px'; c.style.background = '#0a0a16'; }
  }, []);

  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(); audioContextRef.current = ctx;
      fetch('/audio/hit.ogg').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(d => { hitBufferRef.current = d; }).catch(() => {});
      fetch('/audio/drag.ogg').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(d => { dragBufferRef.current = d; }).catch(() => {});
      fetch('/audio/flick.ogg').then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(d => { flickBufferRef.current = d; }).catch(() => {});
    } catch (e) {}
  }, []);

  const playSnd = (buf) => { if (!buf.current || !audioContextRef.current) return; try { const ctx = audioContextRef.current; if (ctx.state === 'suspended') ctx.resume(); const s = ctx.createBufferSource(); s.buffer = buf.current; const g = ctx.createGain(); g.gain.value = 0.25; s.connect(g).connect(ctx.destination); s.start(0); } catch (e) {} };
  const playHit = () => playSnd(hitBufferRef);
  const playDrag = () => playSnd(dragBufferRef);
  const playFlick = () => playSnd(flickBufferRef);

  const noteTimeToY = useCallback((t) => JUDGE_LINE_Y - (t - currentTimeRef.current) * speedRef.current * 300, []);

  // Hold 持续判定
  const checkHoldPoints = () => {
    const now = currentTimeRef.current + JUDGE_DELAY / 1000;
    for (const p of notesRef.current) {
      if (judgedRef.current.has(p.id) || p.pointType !== 'hold') continue;
      if (Math.abs(p.time - now) * 1000 > HOLD_WINDOW) continue;
      const sL = p.lane, eL = p.lane + (p.width || 1) - 1;
      let ok = false; for (let l = sL; l <= eL; l++) { if (pressedKeysRef.current.has(l)) { ok = true; break; } }
      if (ok) {
        judgedRef.current.add(p.id);
        const bp = 1010000 / totalValRef.current;
        s1Ref.current += bp; setS1(s1Ref.current);
        jRef.current = { ...jRef.current, holdH: jRef.current.holdH + 1 };
        setJudgments(jRef.current);
        comboRef.current++; setCombo(comboRef.current); setMaxCombo(pm => Math.max(pm, comboRef.current));
        playDrag();
      }
    }
  };

  // 按键处理
    const processKeyPress = (e) => {
    const km = {}; LANE_KEYS.forEach((k, i) => km[k.toLowerCase()] = i);
    const sk = {};
    for (const [l, ks] of Object.entries(SLIDE_MAP)) {
      const laneNum = parseInt(l);
      ks.forEach(k => { sk[k.toLowerCase()] = laneNum; });
    }
    const time = currentTimeRef.current + JUDGE_DELAY / 1000;
    const key = e.key.toLowerCase();

    // 暂停/退出在任何状态都可用
    if (e.key === '-') {
      if (['playing', 'paused'].includes(gameStateRef.current)) togglePause();
      return;
    }
    if (e.key === '=') {
      if (gameStateRef.current === 'paused') { endGame(); navigate(`/fresco/${songId}`); }
      return;
    }

    if (gameStateRef.current !== 'playing') return;
// ==================== Slide 判定（最简化版）===================
  const isSlideKey = ['z','x','c','v','b','n','m',','].includes(key);
  
   if (isSlideKey) {
    const slideTime = time; // 不延迟，直接以 tap 时间为基准

    let bestS = null;
    let bestDiff = 99999;

    for (const p of notesRef.current) {
      if (p.pointType !== 'slide' || judgedRef.current.has(p.id)) continue;

      const diff = Math.abs(p.time - slideTime) * 1000;
      if (diff <= 450 && diff < bestDiff) { // 最大 450ms
        bestS = p;
        bestDiff = diff;
      }
    }

    if (bestS) {
      judgedRef.current.add(bestS.id);
      const dm = Math.abs(bestS.time - slideTime) * 1000;
      const bp = 1010000 / totalValRef.current;
      const pp = 1000000 / totalValRef.current;
      
      let sc = bp; // 0-360ms 大P
      let type = 'bigP';
      if (dm > 360 && dm <= 400) { sc = 0.6 * pp; type = 'great'; } // 360-400ms Great
      else if (dm > 400 && dm <= 450) { sc = 0.3 * pp; type = 'good'; } // 400-450ms Good
      
      s1Ref.current += sc;
      setS1(s1Ref.current);

      jRef.current = { ...jRef.current, slideH: jRef.current.slideH + 1, [type]: jRef.current[type] + 1 };
      if (!showDetail) {
        if (type === 'bigP') jRef.current.bigP += 1;
        else if (type === 'great') jRef.current.great += 1;
        else if (type === 'good') jRef.current.good += 1;
      }
      setJudgments(jRef.current);
      comboRef.current++;
      setCombo(comboRef.current);
      setMaxCombo(pm => Math.max(pm, comboRef.current));

      setJudgeAnim({ type: type === 'bigP' ? 'bigPerfect' : type, time: Date.now() });
      setJudgeDetail('');
      playFlick();
    }
    return;
  }

    // Tap
    const lane = km[key];
    if (lane === undefined) return;

    let best = null, bd = 99999;
    for (const p of notesRef.current) {
      if (judgedRef.current.has(p.id) || p.pointType !== 'tap') continue;
      const sL = p.lane, eL = p.lane + (p.width || 1) - 1;
      if (lane < sL || lane > eL) continue;
      const adm = Math.abs((time - p.time) * 1000);
      if (adm < GOOD && adm < Math.abs(bd)) { best = p; bd = (time - p.time) * 1000; }
    }

    if (best) {
      judgedRef.current.add(best.id);
      const dm = Math.abs(best.time - time) * 1000;
      const isFast = (best.time - time) * 1000 > 0;
      const pn = chartRef.current?.notes?.find(n => n.id === best.parentId);
      const isEx = pn?.ex;
      const bp = 1010000 / totalValRef.current, pp = 1000000 / totalValRef.current;
      const nv = 1 + (pn?.slide ? 0 : 0) + (isEx ? 0 : 0);
      let type = 'good', sc = 0.3 * pp * nv, ft = isFast ? 'fast' : 'late';
      if (dm <= CPERFECT || (isEx && dm <= GOOD)) { type = 'bigP'; sc = bp * nv; }
      else if (dm <= PERFECT) { type = 'smallP'; sc = pp * nv; }
      else if (dm <= GREAT_WIN) { type = 'great'; sc = 0.6 * pp * nv; }
      s1Ref.current += sc; setS1(s1Ref.current);
      jRef.current = { ...jRef.current, [type]: jRef.current[type] + 1, [ft]: jRef.current[ft] + 1 };
      setJudgments(jRef.current);
      comboRef.current++; setCombo(comboRef.current); setMaxCombo(pm => Math.max(pm, comboRef.current));
      const jt = dm <= CPERFECT ? 'CPERFECT' : dm <= PERFECT ? 'PERFECT' : dm <= GREAT_WIN ? 'GREAT' : 'GOOD';
            setJudgeAnim({ type: type === 'bigP' ? 'bigPerfect' : type === 'smallP' ? 'smallPerfect' : type, time: Date.now() });
      if (type === 'bigP' || (isEx && dm <= GOOD)) {
        setJudgeDetail('');
      } else {
        setJudgeDetail(isFast ? 'FAST' : 'LATE');
      }
      playHit();
    }
  };

  useEffect(() => {
    const km = {}; LANE_KEYS.forEach((k, i) => km[k.toLowerCase()] = i);
    const hd = (e) => {
      if (e.repeat) return;
      if (e.key === '-' || e.key === '=') { processKeyPress(e); return; }
      const lane = km[e.key.toLowerCase()];
      if (lane !== undefined) pressedKeysRef.current.add(lane);
      processKeyPress(e);
    };
    const hu = (e) => {
      const lane = km[e.key.toLowerCase()];
      if (lane !== undefined) pressedKeysRef.current.delete(lane);
    };
    window.addEventListener('keydown', hd);
    window.addEventListener('keyup', hu);
    return () => { window.removeEventListener('keydown', hd); window.removeEventListener('keyup', hu); };
  }, []);

  const startGame = () => {
    const c = chartRef.current; if (!c) return;
    const audio = audioRef.current; if (!audio) return;
    const bpm = c.meta.bpm;
    const allPoints = [];
    for (const n of c.notes) {
      const t = beatPosToTime(n.bar, n.beat, n.sub, bpm);
      allPoints.push({ ...n, time: t, pointType: 'tap', parentId: n.id });
      if (n.hold && n.holdEndBar) {
        const et = beatPosToTime(n.holdEndBar, n.holdEndBeat, n.holdEndSub, bpm);
        const step = getBeatDur(bpm); // 一整拍
        let ht = t + step, hi = 1;
        while (ht <= et + 0.001) {
          allPoints.push({ id: n.id + '_h' + hi, parentId: n.id, time: ht, pointType: 'hold', lane: n.lane, width: n.width || 1 });
          ht += step; hi++;
        }
      }
      if (n.slide) {
  allPoints.push({ 
    id: n.id + '_s', 
    parentId: n.id, 
    time: t, 
    pointType: 'slide', 
    lane: n.lane, 
    width: n.width || 1 
  });
  console.log(`Created Slide note at lane ${n.lane}, time ${t}`);
}
    }
    allPoints.sort((a, b) => a.time - b.time);
    notesRef.current = allPoints; judgedRef.current = new Set(); pressedKeysRef.current = new Set();
    comboRef.current = 0; s1Ref.current = 0; totalPausedRef.current = 0;
    let tv = 0;
    for (const p of allPoints) {
      if (p.pointType === 'tap') { tv += 1; }
      else if (p.pointType === 'slide') { tv += 1; }
      else if (p.pointType === 'hold') { tv += 1; }
    }
    totalValRef.current = tv;
    gameStateRef.current = 'playing'; setGameState('playing');
    setS1(0); setCombo(0); setMaxCombo(0);
    const zj = { bigP:0, smallP:0, great:0, good:0, miss:0, holdH:0, holdM:0, slideH:0, slideM:0, fast:0, late:0 };
    setJudgments(zj); jRef.current = zj;
    setFinalGrade(''); setFinalRating(0);
    currentTimeRef.current = 0; setCurrentTime(0);
    audio.src = audioUrl || ''; audio.load(); audio.currentTime = 0;
    startTimeRef.current = performance.now(); audio.play().catch(() => {});
    let ff = true;
    const loop = () => {
      if (gameStateRef.current === 'finished') return;
      if (gameStateRef.current === 'playing') {
        const elapsed = (performance.now() - startTimeRef.current) / 1000 - totalPausedRef.current;
        const ct = Math.max(0, elapsed + audioDelayRef.current / 1000);
        currentTimeRef.current = ct; setCurrentTime(ct);
        if (!ff) { checkMissed(ct); checkHoldPoints(); }
        ff = false;
        if (audio.ended && ct > (allPoints[allPoints.length - 1]?.time || 0) + 2) { endGame(); return; }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  };

  const togglePause = () => {
    if (gameStateRef.current === 'playing') { gameStateRef.current = 'paused'; setGameState('paused'); pauseTimeRef.current = performance.now(); audioRef.current?.pause(); }
    else if (gameStateRef.current === 'paused') { totalPausedRef.current += (performance.now() - pauseTimeRef.current) / 1000; gameStateRef.current = 'playing'; setGameState('playing'); const a = audioRef.current; if (a) { a.currentTime = currentTimeRef.current; a.play().catch(() => {}); } }
  };

  const checkMissed = (now) => {
    if (now <= 0.05) return;
    for (const p of notesRef.current) {
      if (judgedRef.current.has(p.id)) continue;
      if ((p.time - now) * 1000 < -GOOD) {
        judgedRef.current.add(p.id);
        if (p.pointType === 'tap') { jRef.current = { ...jRef.current, miss: jRef.current.miss + 1 }; setJudgments(jRef.current); comboRef.current = 0; setCombo(0); setJudgeAnim({ type: 'miss', time: Date.now() }); }
        else if (p.pointType === 'hold') { jRef.current = { ...jRef.current, holdM: jRef.current.holdM + 1 }; if (!showDetail) jRef.current.miss += 1; setJudgments(jRef.current); }
        else if (p.pointType === 'slide') { jRef.current = { ...jRef.current, slideM: jRef.current.slideM + 1 }; if (!showDetail) jRef.current.miss += 1; setJudgments(jRef.current); }
      }
    }
  };

  const endGame = async () => {
    if (gameStateRef.current === 'finished') return;
    gameStateRef.current = 'finished'; setGameState('finished');
    const fs = Math.round(s1Ref.current); setS1(fs);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); audioRef.current?.pause();
    const gr = getGrade(fs); const rt = chartRef.current ? getRating(fs, chartRef.current.meta.constant || 1.0) : 0;
    setFinalGrade(gr); setFinalRating(rt);
    const user = auth?.currentUser;
    if (user && chartRef.current) {
      try {
        const nid = await getNumericIdByUid(user.uid);
        if (nid) {
          const scoreRef = ref(db, `scores/${songId}/${difficulty}/${nid}`);
          const oldSnap = await get(scoreRef);
          const oldScore = oldSnap.exists() ? (oldSnap.val().score || 0) : 0;
          if (fs > oldScore) { await set(scoreRef, { score: fs, grade: gr, rating: rt, combo: maxCombo, judgments: jRef.current, date: Date.now() }); }
        }
      } catch (e) {}
    }
  };

  useEffect(() => { if (!judgeAnim) return; const t = setTimeout(() => { setJudgeAnim(null); setJudgeDetail(''); }, 400); return () => clearTimeout(t); }, [judgeAnim]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const w = CANVAS_WIDTH, h = 700;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    ctx.fillStyle = '#0a0a16'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < LANE_COUNT; i++) { ctx.fillStyle = i % 2 === 0 ? '#0d0d1f' : '#0a0a18'; ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, h); }
    for (let i = 1; i <= 7; i++) { ctx.fillStyle = 'rgba(100,50,180,0.06)'; ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, h); }
    ctx.strokeStyle = '#1e1e30'; ctx.lineWidth = 1;
    for (let i = 1; i < LANE_COUNT; i++) { ctx.beginPath(); ctx.moveTo(i * LANE_WIDTH, 0); ctx.lineTo(i * LANE_WIDTH, h); ctx.stroke(); }
    ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, JUDGE_LINE_Y); ctx.lineTo(w, JUDGE_LINE_Y); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#555'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < LANE_COUNT; i++) ctx.fillText(LANE_KEYS[i], i * LANE_WIDTH + LANE_WIDTH / 2, JUDGE_LINE_Y + 18);
    if (combo > 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.fillText(combo + ' combo', w / 2, 30); }

    const cc = chartRef.current;
    const drawnHolds = new Set();
    for (const p of notesRef.current) {
      if (p.pointType !== 'tap') continue;
      const pn = cc?.notes?.find(n => n.id === p.parentId);
      if (!pn?.hold || drawnHolds.has(pn.id)) continue;
      drawnHolds.add(pn.id);
      const y1 = noteTimeToY(p.time);
      const y2 = noteTimeToY(beatPosToTime(pn.holdEndBar, pn.holdEndBeat, pn.holdEndSub, cc.meta.bpm));
      const topY = Math.min(y1, y2), barH = Math.abs(y2 - y1);
      if (barH <= 0) continue;
      const nw = (p.width || 1) * LANE_WIDTH * NOTE_WIDTH_SCALE;
      const ox = ((p.width || 1) * LANE_WIDTH - nw) / 2;
      const px = (p.lane || 0) * LANE_WIDTH + ox + 2, py = topY + NOTE_H / 2;
      let fc = '#2a6099'; if (pn.ex && pn.slide) fc = '#cc8800'; else if (pn.ex) fc = '#cc9900'; else if (pn.slide) fc = '#553388';
      const rr = parseInt(fc.slice(1,3),16), gg = parseInt(fc.slice(3,5),16), bb = parseInt(fc.slice(5,7),16);
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.32)`;
      ctx.strokeStyle = `rgba(${rr},${gg},${bb},0.75)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(px, py, nw - 4, barH, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(px + 3, py + barH - 20, nw - 10, 16);
    }

    for (const p of notesRef.current) {
      if (judgedRef.current.has(p.id) || p.pointType !== 'tap') continue;
      const y = noteTimeToY(p.time); if (y < -50 || y > h + 50) continue;
      const nw = (p.width || 1) * LANE_WIDTH * NOTE_WIDTH_SCALE;
      const ox = ((p.width || 1) * LANE_WIDTH - nw) / 2;
      const px = (p.lane || 0) * LANE_WIDTH + ox, py = y - NOTE_H / 2;
      const pn = cc?.notes?.find(n => n.id === p.parentId);
      const isEx = pn?.ex, isSlide = pn?.slide;
      let fc, sc, gc;
      if (isEx && isSlide) { fc = '#cc8800'; sc = '#ffaa22'; gc = '#ffbb33'; }
      else if (isEx) { fc = '#cc9900'; sc = '#eebb22'; gc = '#eebb22'; }
      else if (isSlide) { fc = '#553388'; sc = '#8855cc'; gc = '#9966dd'; }
      else { fc = '#2a6099'; sc = '#4499cc'; gc = '#5599dd'; }
      ctx.shadowColor = gc; ctx.shadowBlur = 6; ctx.fillStyle = fc; ctx.strokeStyle = sc; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(px, py, nw, NOTE_H, 3); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      if (isSlide) { const cx = px + nw / 2, vTop = py - 10, vSize = 6; const vc = (isEx && isSlide) ? '#ffdd66' : '#c8a0ff'; ctx.shadowColor = vc; ctx.shadowBlur = 4; ctx.strokeStyle = vc; ctx.fillStyle = vc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - vSize, vTop); ctx.lineTo(cx, vTop + vSize); ctx.lineTo(cx + vSize, vTop); ctx.stroke(); ctx.shadowBlur = 0; }
    }

    if (judgeAnim) {
      const cls = { bigPerfect: '#ffdd44', smallPerfect: '#ffaa00', great: '#44aaff', good: '#888', miss: '#ff4444' };
      const lbs = { bigPerfect: 'PERFECT', smallPerfect: 'PERFECT', great: 'GREAT', good: 'GOOD', miss: 'MISS' };
      ctx.fillStyle = cls[judgeAnim.type] || '#fff'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
      ctx.shadowColor = cls[judgeAnim.type] || '#fff'; ctx.shadowBlur = 12;
      ctx.fillText(lbs[judgeAnim.type] || judgeAnim.type, w / 2, JUDGE_LINE_Y - 60);
      ctx.shadowBlur = 0;
      if (showFastLate && judgeDetail) {
        ctx.fillStyle = judgeDetail === 'FAST' ? '#4488ff' : '#ff4444';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(judgeDetail, w / 2, JUDGE_LINE_Y - 85);
      }
    }

    if (gameState === 'paused') { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'; ctx.fillText('暂停', w / 2, h / 2); ctx.font = '16px monospace'; ctx.fillText('按 - 继续 | 按 = 退出', w / 2, h / 2 + 40); }
    if (gameState === 'finished') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center'; ctx.fillText(finalGrade, w / 2, h / 2 - 20); ctx.fillStyle = '#fff'; ctx.font = '18px monospace'; ctx.fillText(Math.round(s1).toLocaleString() + ' | Rating: ' + finalRating, w / 2, h / 2 + 30); }
  }, [currentTime, gameState, combo, judgeAnim, judgeDetail, showFastLate, noteTimeToY, s1, finalGrade, finalRating]);

  useEffect(() => { let r = true; const loop = () => { if (!r) return; draw(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); return () => { r = false; }; }, [draw]);

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#888' }}>加载中...</div>;

  const jColors = { bigP: '#ffdd44', smallP: '#ffaa00', great: '#44aaff', good: '#888', miss: '#ff4444', holdH: '#88ccff', holdM: '#446688', slideH: '#c8a0ff', slideM: '#6644aa', fast: '#4488ff', late: '#ff4444' };
  const jLabels = { bigP: 'PERFECT', smallP: 'PERFECT', great: 'GREAT', good: 'GOOD', miss: 'MISS', holdH: 'Hold✓', holdM: 'Hold✗', slideH: 'Slide✓', slideM: 'Slide✗', fast: 'FAST', late: 'LATE' };

  const displayKeys = showDetail ? Object.keys(jLabels) : ['bigP','smallP','great','good','miss'];

  return (
    <div style={{display:'flex',height:'calc(100vh - 60px)',background:'#080812',color:'#ccc'}}>
      <div style={{width:240,flexShrink:0,background:'#0e0e1c',borderRight:'1px solid #1e1e30',padding:16,display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}}>
        <button onClick={() => navigate(`/fresco/${songId}`)} style={{background:'none',border:'none',color:'#ff6688',cursor:'pointer',fontSize:13,textAlign:'left',padding:0}}>← 返回</button>
        <h3 style={{margin:0,color:'#ff6688'}}>{chart?.meta?.title||'游玩'}</h3>
        <div style={{fontSize:12,color:'#888'}}>{chart?.meta?.artist} | {difficulty} | 定数{chart?.meta?.constant||1.0}</div>
        {gameState==='ready'&&(<div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{fontSize:11,color:'#777'}}>流速: {speed.toFixed(1)}x</div>
          <input type="range" min={0.5} max={5} step={0.1} value={speed} onChange={e=>{setSpeed(parseFloat(e.target.value));saveSettings();}}/>
          <div style={{fontSize:11,color:'#777'}}>延迟: {audioDelay}ms</div>
          <input type="range" min={-2000} max={2000} step={5} value={audioDelay} onChange={e=>{setAudioDelay(parseInt(e.target.value));saveSettings();}}/>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:'#888'}}><input type="checkbox" checked={showDetail} onChange={e=>{setShowDetail(e.target.checked);saveSettings();}}/>显示 Hold/Slide</label>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:'#888'}}><input type="checkbox" checked={showFastLate} onChange={e=>{setShowFastLate(e.target.checked);saveSettings();}}/>显示 FAST/LATE</label>
          <button onClick={startGame} style={{padding:'12px 24px',fontSize:16,background:'#ff4466',border:'none',borderRadius:6,color:'#fff',cursor:'pointer'}}>▶ 开始游戏</button>
        </div>)}
        {(gameState==='playing'||gameState==='paused')&&(<>
          <div style={{fontSize:28,fontWeight:'bold',color:'#fff'}}>{Math.round(s1).toLocaleString()}</div>
          <div style={{fontSize:14,color:'#ffdd44'}}>{combo} combo</div>
          {displayKeys.filter(k => judgments[k] > 0).map(k => (<div key={k} style={{fontSize:12,color:jColors[k]||'#888'}}>{jLabels[k]}: {judgments[k]}</div>))}
          <div style={{fontSize:10,color:'#666'}}>-暂停 | 暂停后=退出</div>
        </>)}
        {gameState==='finished'&&(<>
          <div style={{fontSize:32,fontWeight:'bold',color:'#ffdd44'}}>{finalGrade}</div>
          <div style={{fontSize:22,color:'#fff'}}>{Math.round(s1).toLocaleString()}</div>
          <div>Rating: {finalRating}</div>
          <div>Max Combo: {maxCombo}</div>
          {displayKeys.filter(k => judgments[k] > 0).map(k => (<div key={k} style={{fontSize:12,color:jColors[k]||'#888'}}>{jLabels[k]}: {judgments[k]}</div>))}
          <div style={{display:'flex',gap:8,marginTop:12}}><button onClick={startGame} style={{padding:'6px 12px',background:'#1a1a30',color:'#ccc',border:'1px solid #2a2a3e',borderRadius:4,cursor:'pointer'}}>🔄 重试</button><button onClick={()=>navigate(`/fresco/${songId}`)} style={{padding:'6px 12px',background:'#1a1a30',color:'#ccc',border:'1px solid #2a2a3e',borderRadius:4,cursor:'pointer'}}>← 返回</button></div>
        </>)}
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#060610',overflow:'hidden'}}><canvas ref={canvasRef}/><audio ref={audioRef} preload="auto" style={{display:'none'}}/></div>
    </div>
  );
}