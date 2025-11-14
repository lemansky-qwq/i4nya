// src/lib/gs.js
import { ref, get, set, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from './firebase';

export const save = async (uid, game, score) => {
  const r = ref(db, `users/${uid}/scores/${game}`);
  const s = await get(r);
  const c = s.val() || 0;
  if (score > c) {
    await set(r, score);
    return true;
  }
  return false;
};

export const top = async (game) => {
  const q = query(ref(db, 'users'), orderByChild(`scores/${game}`), limitToLast(10));
  const s = await get(q);
  const l = [];
  s.forEach(c => {
    const u = c.val();
    const sc = u.scores?.[game];
    const n = u.profiles?.nickname || '匿名';
    if (sc) l.unshift({ n, s: sc });
  });
  return l;
};