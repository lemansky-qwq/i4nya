// src/lib/gs.js
import { db } from './firebase';
import { ref, set, get, update } from 'firebase/database';
import { getProfileById } from './pu';

// 保存分数（只保存最高分）
export async function save(uid, game, score) {
  if (!uid || !game) return false;
  
  try {
    // 获取用户的数字ID
    const numericId = await getNumericIdByUid(uid);
    if (!numericId) return false;
    
    const profileScoresRef = ref(db, `profiles/${numericId}/scores/${game}`);
    const currentSnap = await get(profileScoresRef);
    const currentScore = currentSnap.val() || 0;
    
    // 只保存更高的分数
    if (score > currentScore) {
      await set(profileScoresRef, score);
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存分数失败:', error);
    return false;
  }
}

// 获取排行榜
export async function top(game, limit = 5) {
  if (!game) return [];
  
  try {
    const profilesRef = ref(db, 'profiles');
    const snap = await get(profilesRef);
    
    if (!snap.exists()) return [];
    
    const profiles = snap.val();
    const scores = [];
    
    // 收集所有用户的该游戏分数
    for (const profileId in profiles) {
      // 跳过 nextId 等非用户数据
      if (profileId === 'nextId') continue;
      
      const profile = profiles[profileId];
      if (profile.scores && profile.scores[game]) {
        scores.push({
          profileId: parseInt(profileId),
          score: profile.scores[game],
          nickname: profile.nickname || '匿名用户'
        });
      }
    }
    
    scores.sort((a, b) => b.score - a.score);

// 方法1: 包含所有同分用户
let topScores = [];
if (scores.length <= limit) {
  // 如果总数不超过限制，全部包含
  topScores = scores;
} else {
  // 找到第 limit 名的分数
  const cutoffScore = scores[limit - 1].score;
  
  // 包含所有达到这个分数的用户
  topScores = scores.filter(item => item.score >= cutoffScore);
  
  // 如果同分用户太多，可以设置一个最大限制（可选）
  if (topScores.length > limit * 2) {
    topScores = topScores.slice(0, limit * 2);
  }
}

// 格式化结果
const result = topScores.map(item => ({
  n: item.nickname,
  s: item.score,
  id: item.profileId
}));

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
    // 获取用户的数字ID
    const numericId = await getNumericIdByUid(uid);
    if (!numericId) return 0;
    
    const scoreRef = ref(db, `profiles/${numericId}/scores/${game}`);
    const snap = await get(scoreRef);
    return snap.val() || 0;
  } catch (error) {
    console.error('获取个人最佳成绩失败:', error);
    return 0;
  }
}

// 辅助函数：通过UID获取数字ID
async function getNumericIdByUid(uid) {
  if (!uid) return null;
  const snap = await get(ref(db, `uidToId/${uid}`));
  return snap.val() || null;
}