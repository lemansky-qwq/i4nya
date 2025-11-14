// src/lib/pu.js
import { ref, get, runTransaction, set } from 'firebase/database';
import { db } from './firebase';

// 获取下一个数字 ID
export const getNextId = async () => {
  const r = ref(db, 'profiles/nextId');
  const snap = await runTransaction(r, c => (c || 0) + 1);
  return snap.snapshot.val();
};

// 创建 profile（返回数字 ID）
export const createProfile = async (uid, nickname) => {
  try {
    const numericId = await getNextId();
    const idStr = String(numericId);  // 强制转字符串
    const path = `profiles/${idStr}`;

    await set(ref(db, path), {
      id: numericId,
      uid: uid,
      nickname: nickname || '匿名',
      bio: '',
      createdAt: Date.now(),
    });

    console.log('Profile created →', path);
    return numericId;
  } catch (error) {
    console.error('createProfile 失败:', error);
    throw error;
  }
};

export const getProfileById = async (numericId) => {
  const idStr = String(numericId);  // 强制转字符串
  const snap = await get(ref(db, `profiles/${idStr}`));
  const data = snap.val();

  console.log(`[getProfileById] ${idStr} →`, data);
  return data;
};

// 通过 uid 找回数字 ID（登录后用）
export const getNumericIdByUid = async (uid) => {
  if (!uid) return null;

  try {
    const snap = await get(ref(db, 'profiles'));
    const all = snap.val();

    if (!all) {
      console.warn('profiles 节点为空');
      return null;
    }

    for (const [key, val] of Object.entries(all)) {
      if (key === 'nextId') continue;
      if (val && val.uid === uid) {
        const numericId = Number(key);  // key 是字符串，转 number
        console.log(`找到用户: uid=${uid} → id=${numericId}`);
        return numericId;
      }
    }
    console.warn(`未找到 uid=${uid} 的 profile`);
    return null;

  } catch (error) {
    console.error('getNumericIdByUid 出错:', error);
    return null;
  }
};