// src/lib/gs.js
import { db } from './firebase';
import { ref, set, get, update } from 'firebase/database';
import { getProfileById } from './pu';

export async function saveJumpRecord(uid, game, target, time, score) {
  if (!uid || !game) return false;
  
  try {
    const numericId = await getNumericIdByUid(uid);
    if (!numericId) return false;
    
    // 将跳跃记录存储在 scores 中，格式为 jump_{target}
    const jumpRef = ref(db, `profiles/${numericId}/scores/jump_${target}`);
    const currentSnap = await get(jumpRef);
    
    console.log(`保存跳跃记录: target=${target}, time=${time}ms, current=`, currentSnap.val()); // 调试
    
    // 如果没有记录或者新时间更短，才保存（毫秒比较）
    if (!currentSnap.exists() || time < currentSnap.val()) {
      await set(jumpRef, time);
      console.log(`成功保存跳跃记录: jump_${target} = ${time}ms`);
      return true;
    }
    console.log(`未保存: 已有更优记录 ${currentSnap.val()}ms < ${time}ms`);
    return false;
  } catch (error) {
    console.error('保存跳跃记录失败:', error);
    return false;
  }
}

// 获取跳跃记录
export async function getJumpRecords(uid, game) {
  if (!uid || !game) return {};
  
  try {
    const numericId = await getNumericIdByUid(uid);
    if (!numericId) return {};
    
    const scoresRef = ref(db, `profiles/${numericId}/scores`);
    const snap = await get(scoresRef);
    const scores = snap.val() || {};
    
    console.log('用户所有分数记录:', scores); // 调试信息
    
    // 过滤出跳跃记录 (jump_ 开头的)
    const jumpRecords = {};
    Object.keys(scores).forEach(key => {
      if (key.startsWith('jump_')) {
        const target = parseInt(key.replace('jump_', ''));
        jumpRecords[target] = {
          time: scores[key], // 毫秒时间
          score: 0
        };
      }
    });
    
    console.log('提取的跳跃记录:', jumpRecords); // 调试信息
    return jumpRecords;
  } catch (error) {
    console.error('获取跳跃记录失败:', error);
    return {};
  }
}

// 获取跳跃排行榜（毫秒版本）
export async function getJumpLeaderboard(target, limit = 5) {
  if (!target) return [];
  
  try {
    const profilesRef = ref(db, 'profiles');
    const snap = await get(profilesRef);
    
    if (!snap.exists()) return [];
    
    const profiles = snap.val();
    const jumps = [];
    
    console.log(`开始查找目标 ${target} 的记录`); // 调试
    
    // 收集所有用户该目标的记录
    for (const profileId in profiles) {
      if (profileId === 'nextId') continue;
      
      const profile = profiles[profileId];
      const scoreKey = `jump_${target}`;
      
      console.log(`检查用户 ${profileId} 的 ${scoreKey}:`, profile.scores?.[scoreKey]); // 调试
      
      // 检查 scores 中是否有 jump_{target} 的记录
      if (profile.scores && profile.scores[scoreKey] !== undefined) {
        jumps.push({
          profileId: parseInt(profileId),
          time: profile.scores[scoreKey], // 毫秒时间
          nickname: profile.nickname || '匿名用户'
        });
      }
    }
    
    console.log(`目标 ${target} 找到 ${jumps.length} 条记录:`, jumps); // 调试信息
    
    // 按时间排序（时间短的在前）- 毫秒比较
    jumps.sort((a, b) => a.time - b.time);
    
    // 处理排名逻辑 - 同时间同名次
    let rankedJumps = [];
    let currentRank = 1;
    let previousTime = null;
    
    for (let i = 0; i < jumps.length; i++) {
      const currentTime = jumps[i].time;
      
      if (previousTime !== null && currentTime === previousTime) {
        // 同时间时使用相同的排名
        rankedJumps.push({
          ...jumps[i],
          rank: currentRank - 1
        });
      } else {
        rankedJumps.push({
          ...jumps[i],
          rank: currentRank
        });
        currentRank++;
        previousTime = currentTime;
      }
    }
    
    // 取前 limit 名（按排名）
    const topJumps = rankedJumps.filter(item => item.rank <= limit);
    
    // 格式化结果
    const result = topJumps.map(item => ({
      n: item.nickname,
      t: item.time, // 毫秒时间
      id: item.profileId,
      rank: item.rank
    }));

    return result;
  } catch (error) {
    console.error('获取跳跃排行榜失败:', error);
    return [];
  }
}

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
  //if (game == "2048") limit = 8;
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