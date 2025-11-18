// src/lib/pu.js
import { db } from './firebase';
import { ref, set, get, update } from 'firebase/database';

// 确保所有函数都有 export
export async function getNumericIdByUid(uid) {
  if (!uid) {
    console.warn('getNumericIdByUid: uid 为空');
    return null;
  }

  try {
    const snap = await get(ref(db, `uidToId/${uid}`));
    return snap.val() || null;
  } catch (error) {
    console.error('获取用户ID失败:', error);
    throw new Error('获取用户信息失败');
  }
}

// 添加这个关键函数 - 通过 UID 获取用户资料
export async function getProfileByUid(uid) {
  if (!uid) {
    console.warn('getProfileByUid: uid 为空');
    return null;
  }

  try {
    console.log('getProfileByUid: 查找 UID', uid);
    
    // 先通过 uidToId 映射找到数字 ID
    const numericId = await getNumericIdByUid(uid);
    console.log('getProfileByUid: 找到数字 ID', numericId);
    
    if (!numericId) {
      console.log('getProfileByUid: 未找到对应的数字 ID');
      return null;
    }

    // 通过数字 ID 获取用户资料
    const profile = await getProfileById(numericId);
    console.log('getProfileByUid: 找到用户资料', profile);
    
    return profile;
  } catch (error) {
    console.error('通过 UID 获取用户资料失败:', error);
    return null;
  }
}

export async function createProfile(uid, nickname = null) {
  if (!uid) {
    throw new Error('用户ID不能为空');
  }

  console.log('创建档案，uid:', uid, 'nickname:', nickname);

  // 清理和验证昵称 - 确保不为空
  let safeNickname;
  if (nickname && nickname.trim()) {
    safeNickname = nickname.trim().slice(0, 12).replace(/[<>]/g, '');
  } else {
    // 如果昵称为空，生成默认昵称
    safeNickname = `用户${Math.floor(Math.random() * 9999)}`;
  }

  console.log('最终使用的昵称:', safeNickname);

  try {
    // 先读取当前的 nextId
    const nextIdRef = ref(db, 'profiles/nextId');
    const nextSnap = await get(nextIdRef);
    
    let newNumericId = 1;
    if (nextSnap.exists()) {
      newNumericId = nextSnap.val();
    }

    const profileData = {
      uid,
      nickname: safeNickname,
      bio: '',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    console.log('准备写入的数据:', profileData);

    // 使用 update 方法批量写入多个路径
    const updates = {};
    updates[`profiles/${newNumericId}`] = profileData;
    updates[`uidToId/${uid}`] = newNumericId;
    updates['profiles/nextId'] = newNumericId + 1;

    await update(ref(db), updates);

    console.log('用户档案创建成功，ID:', newNumericId);
    return newNumericId;

  } catch (error) {
    console.error('创建用户档案失败:', error);
    throw new Error('创建用户档案失败: ' + error.message);
  }
}

export async function getProfileById(id) {
  console.log('getProfileById: 输入ID', id, '类型:', typeof id);
  
  // 处理各种输入类型
  let numericId;
  if (typeof id === 'number') {
    numericId = id;
  } else if (typeof id === 'string') {
    numericId = parseInt(id);
  } else if (id && typeof id === 'object') {
    // 如果是对象，尝试从中提取ID
    console.log('getProfileById: 输入是对象，尝试提取ID', id);
    if (id.id) {
      numericId = parseInt(id.id);
    } else if (id.uid) {
      // 如果是UID，需要先转换为数字ID
      return await getProfileByUid(id.uid);
    } else {
      throw new Error('无效的用户ID格式');
    }
  } else {
    throw new Error('无效的用户ID类型');
  }
  
  if (isNaN(numericId) || numericId <= 0) {
    console.error('getProfileById: 无效的用户ID', id);
    throw new Error('无效的用户ID');
  }

  try {
    const snap = await get(ref(db, `profiles/${numericId}`));
    
    if (!snap.exists()) {
      console.log('getProfileById: 用户资料不存在', numericId);
      return null;
    }

    const data = snap.val();
    console.log('getProfileById: 成功获取用户资料', { id: numericId, data });
    
    return {
      id: numericId,
      ...data
    };
  } catch (error) {
    console.error('获取用户档案失败:', error);
    throw new Error('获取用户信息失败');
  }
}

// 更新最后登录时间
export async function updateLastLogin(id) {
  try {
    await set(ref(db, `profiles/${id}/lastLoginAt`), Date.now());
  } catch (error) {
    console.error('更新登录时间失败:', error);
  }
}

export async function updateProfileBio(profileId, bio, uid) {
  if (!profileId || !uid) {
    throw new Error('参数不能为空');
  }

  try {
    // 验证用户权限
    const profileRef = ref(db, `profiles/${profileId}`);
    const profileSnap = await get(profileRef);
    
    if (!profileSnap.exists()) {
      throw new Error('用户资料不存在');
    }
    
    const profileData = profileSnap.val();
    if (profileData.uid !== uid) {
      throw new Error('无权修改此用户资料');
    }

    // 更新 bio
    const updates = {
      bio: bio.slice(0, 200) // 限制长度
    };
    
    await update(profileRef, updates);
    console.log('Bio 更新成功');
    return true;
    
  } catch (error) {
    console.error('更新 bio 失败:', error);
    throw error;
  }
}

// 调试函数
export async function debugUserProfile(uid) {
  console.log('=== 调试用户档案 ===');
  console.log('UID:', uid);
  
  const numericId = await getNumericIdByUid(uid);
  console.log('Numeric ID:', numericId);
  
  if (numericId) {
    const profile = await getProfileById(numericId);
    console.log('Profile 数据:', profile);
  }
  
  console.log('=== 调试结束 ===');
}