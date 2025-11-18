// src/lib/gs.js
import { db } from './firebase';
import { ref, set, get, update, query, orderByChild, limitToLast, startAt } from 'firebase/database';
import { getProfileById } from './pu';

// 保存分数（只保存最高分）
export async function save(uid, game, score) {
  if (!uid || !game) return false;
  
  try {
    const userScoresRef = ref(db, `users/${uid}/scores/${game}`);
    const currentSnap = await get(userScoresRef);
    const currentScore = currentSnap.val() || 0;
    
    // 只保存更高的分数
    if (score > currentScore) {
      await set(userScoresRef, score);
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存分数失败:', error);
    return false;
  }
}

// 获取排行榜
export async function top(game, limit = 8) {  // 改为8
  if (!game) return [];
  
  try {
    const scoresRef = ref(db, 'users');
    const snap = await get(scoresRef);
    
    if (!snap.exists()) return [];
    
    const users = snap.val();
    const scores = [];
    
    // 收集所有用户的该游戏分数
    for (const uid in users) {
      if (users[uid].scores && users[uid].scores[game]) {
        scores.push({
          uid,
          score: users[uid].scores[game]
        });
      }
    }
    
    // 按分数排序
    scores.sort((a, b) => b.score - a.score);
    
    // 限制数量并获取用户信息
    const topScores = scores.slice(0, limit);
    const result = [];
    
    for (const item of topScores) {
      try {
        // 获取用户数字ID
        const uidToIdRef = ref(db, `uidToId/${item.uid}`);
        const idSnap = await get(uidToIdRef);
        const numericId = idSnap.val();
        
        if (numericId) {
          const profile = await getProfileById(numericId);
          result.push({
            n: profile?.nickname || '匿名用户',
            s: item.score,
            id: numericId,  // 添加数字ID
            uid: item.uid
          });
        } else {
          result.push({
            n: '未知用户',
            s: item.score,
            id: 0,  // 未知ID设为0
            uid: item.uid
          });
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        result.push({
          n: '加载失败',
          s: item.score,
          id: 0,
          uid: item.uid
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return [];
  }
}

// 获取用户个人最佳成绩
export async function getPersonalBest(uid, game) {
  if (!uid || !game) return 0;
  
  try {
    const scoreRef = ref(db, `users/${uid}/scores/${game}`);
    const snap = await get(scoreRef);
    return snap.val() || 0;
  } catch (error) {
    console.error('获取个人最佳成绩失败:', error);
    return 0;
  }
}