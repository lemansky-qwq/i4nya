// src/pages/fresco/board.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db, auth } from '../../lib/firebase';
import { getNumericIdByUid } from '../../lib/pu';

export default function Board() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMyDetail, setShowMyDetail] = useState(true);
  const [myNid, setMyNid] = useState(null);
  const [myDetail, setMyDetail] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        let nid = null;
        if (user) nid = await getNumericIdByUid(user.uid);
        setMyNid(nid);

        const [scoresSnap, chartsSnap, profilesSnap] = await Promise.all([
          get(ref(db, 'scores')),
          get(ref(db, 'charts')),
          get(ref(db, 'profiles')),
        ]);

        const scores = scoresSnap.val() || {};
        const charts = chartsSnap.val() || {};
        const profiles = profilesSnap.val() || {};

        const chartInfo = {};
        for (const [key, val] of Object.entries(charts)) {
          chartInfo[key] = val.meta || {};
        }

        const userData = {};

        for (const [uid, profile] of Object.entries(profiles)) {
          if (uid === 'nextId') continue;
          const id = parseInt(uid);
          const allPlays = [];

          for (const [songId, diffs] of Object.entries(scores)) {
            for (const [diff, players] of Object.entries(diffs)) {
              if (players[id]) {
                const chartKey = `${songId}_${diff}`;
                const meta = chartInfo[chartKey] || {};
                allPlays.push({
                  songId, diff, chartKey,
                  title: meta.title || songId,
                  constant: meta.constant || 1.0,
                  score: players[id].score || 0,
                  grade: players[id].grade || 'D',
                  rating: players[id].rating || 0,
                });
              }
            }
          }

          allPlays.sort((a, b) => b.rating - a.rating);
          const best10 = allPlays.slice(0, 10);
          const totalRating = best10.reduce((sum, p) => sum + p.rating, 0);

          if (totalRating > 0) {
            userData[id] = {
              id,
              nickname: profile.nickname || `User ${id}`,
              best10,
              totalRating,
            };
          }
        }

        const sorted = Object.values(userData).sort((a, b) => b.totalRating - a.totalRating);
        setUsers(sorted);

        if (nid && userData[nid]) {
          setMyDetail(userData[nid]);
        }

        setLoading(false);
      } catch (e) { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: '#888' }}>加载排行榜...</div>;

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#080812', color: '#ccc', padding: 30 }}>
      <div style={{ maxWidth: 750, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={() => navigate('/fresco')} style={{ background: 'none', border: 'none', color: '#ff6688', cursor: 'pointer', fontSize: 14 }}>← 返回曲库</button>
          <h2 style={{ color: '#ff6688', margin: 0 }}>🏆 排行榜</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', cursor: 'pointer' }}>
            <input type="checkbox" checked={showMyDetail} onChange={e => setShowMyDetail(e.target.checked)} />
            显示我的详情
          </label>
        </div>

        {/* 我的信息 */}
        {myDetail && showMyDetail && (
          <div style={{ background: '#0e0e1c', border: '1px solid #ff4466', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ff6688', marginBottom: 8 }}>
              我的 Rating: {myDetail.totalRating}
            </div>
            {myDetail.best10.map((p, i) => (
              <div key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e1e30' }}>
                <span>B{i+1}. {p.title} [{p.diff}] 定数{p.constant}</span>
                <span style={{ color: '#ffdd44' }}>{p.score.toLocaleString()} {p.grade} | {p.rating}</span>
              </div>
            ))}
          </div>
        )}

        {/* 排行榜 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map((u, i) => (
            <div key={u.id} style={{
              background: u.id === myNid ? '#1a1a30' : '#0e0e1c',
              border: `1px solid ${u.id === myNid ? '#ff4466' : '#1e1e30'}`,
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: i < 3 ? '#ffdd44' : '#888', minWidth: 28 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                  </span>
                  <span
                    onClick={() => navigate(`/profile/${u.id}`)}
                    style={{ fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', color: '#ccc' }}>
                    {u.nickname}
                  </span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ffaa00' }}>{u.totalRating}</span>
              </div>
              {/* B10 默认展开 */}
              <div style={{ marginTop: 8, paddingLeft: 40 }}>
                {u.best10.map((p, j) => (
                  <div key={j} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#888' }}>
                    <span>B{j+1}. {p.title} [{p.diff}] {p.constant}</span>
                    <span style={{ color: '#ffdd44' }}>{p.score.toLocaleString()} {p.grade} | {p.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}