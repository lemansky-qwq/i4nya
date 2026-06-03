// src/pages/fresco/songlist.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../../lib/firebase';

export default function SongList() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, 'charts'));
        if (!snap.exists()) { setSongs([]); setLoading(false); return; }
        const data = snap.val();
        const songMap = {};
        for (const [key, val] of Object.entries(data)) {
          const sid = val.meta?.songId || key.split('_')[0];
          if (!songMap[sid]) songMap[sid] = { songId: sid, title: val.meta?.title || sid, artist: val.meta?.artist || '', difficulties: [] };
          songMap[sid].difficulties.push(val.meta?.difficulty || 'BS');
        }
        setSongs(Object.values(songMap).sort((a, b) => a.songId.localeCompare(b.songId)));
        setLoading(false);
      } catch (e) { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: '#888' }}>加载曲库...</div>;

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#080812', color: '#ccc', padding: 30 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <button onClick={() => navigate('/fresco/about')} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #ff6688', borderRadius: 6, color: '#ff6688', cursor: 'pointer', fontSize: 14 }}>📖 玩法</button>
        <h1 style={{ color: '#ff6688', margin: 0, fontSize: 32, letterSpacing: 2 }}>FRESCO</h1>
        <button onClick={() => navigate('/fresco/board')} style={{ padding: '8px 18px', background: '#ff4466', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 14 }}>🏆 排行榜</button>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {songs.map(s => (
          <div key={s.songId} onClick={() => navigate(`/fresco/${s.songId}`)}
            style={{ background: '#0e0e1c', border: '1px solid #1e1e30', borderRadius: 10, padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#ff4466'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e30'}>
            <img src={`/audio/${s.songId}.jpg`} onError={e => { e.target.style.display = 'none'; }} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#1a1a30' }} alt="" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.artist}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {s.difficulties.map(d => (
                <span key={d} style={{ padding: '2px 8px', background: '#1a1a30', borderRadius: 4, fontSize: 11, color: '#aaa' }}>{d}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}