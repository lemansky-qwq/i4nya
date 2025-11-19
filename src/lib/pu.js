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

// 在 pu.js 中添加角色相关函数
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

// 检查用户角色
export const getUserRole = async (uid) => {
  try {
    const profile = await getProfileByUid(uid);
    return profile?.role || ROLES.USER;
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return ROLES.USER;
  }
};

// 检查是否是管理员
export const isAdmin = async (uid) => {
  const role = await getUserRole(uid);
  return role === ROLES.ADMIN;
};

export const getAllUsers = async () => {
  try {
    const snapshot = await get(ref(db, 'profiles'));
    if (!snapshot.exists()) return [];
    
    const profiles = snapshot.val();
    const users = [];
    
    for (const [id, data] of Object.entries(profiles)) {
      if (id !== 'nextId') {
        users.push({
          id: parseInt(id),
          ...data
        });
      }
    }
    
    return users;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    throw error;
  }
};

// 更新用户角色（仅管理员可调用）
export const updateUserRole = async (adminUid, targetUid, newRole) => {
  const isAdminUser = await isAdmin(adminUid);
  if (!isAdminUser) {
    throw new Error('无权执行此操作');
  }

  if (!Object.values(ROLES).includes(newRole)) {
    throw new Error('无效的角色');
  }

  const targetProfile = await getProfileByUid(targetUid);
  if (!targetProfile) {
    throw new Error('目标用户不存在');
  }

  const updates = {};
  updates[`profiles/${targetProfile.id}/role`] = newRole;

  await update(ref(db), updates);
  return true;
};

export const addAnnouncement = async (adminUid, title, content, priority = 'normal') => {
  const isAdminUser = await isAdmin(adminUid);
  if (!isAdminUser) {
    throw new Error('无权发布公告');
  }

  if (!title.trim() || !content.trim()) {
    throw new Error('标题和内容不能为空');
  }

  try {
    // 获取公告列表
    const announcementsRef = ref(db, 'announcements');
    const snapshot = await get(announcementsRef);
    
    let announcements = [];
    if (snapshot.exists()) {
      announcements = Object.values(snapshot.val());
    }

    const newAnnouncement = {
      id: Date.now(),
      title: title.trim(),
      content: content.trim(),
      author: adminUid,
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 添加到公告列表
    announcements.unshift(newAnnouncement);
    
    // 只保留最新的50条公告
    if (announcements.length > 50) {
      announcements = announcements.slice(0, 50);
    }

    // 保存到数据库
    await set(announcementsRef, announcements);
    
    return newAnnouncement;
  } catch (error) {
    console.error('发布公告失败:', error);
    throw new Error('发布公告失败: ' + error.message);
  }
};

export const getAnnouncements = async (limit = 20) => {
  try {
    const announcementsRef = ref(db, 'announcements');
    const snapshot = await get(announcementsRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    let announcements = Object.values(snapshot.val());
    
    // 按时间倒序排序
    announcements.sort((a, b) => b.createdAt - a.createdAt);
    
    // 限制数量
    if (limit && announcements.length > limit) {
      announcements = announcements.slice(0, limit);
    }
    
    return announcements;
  } catch (error) {
    console.error('获取公告失败:', error);
    throw new Error('获取公告失败: ' + error.message);
  }
};

export const deleteAnnouncement = async (adminUid, announcementId) => {
  const isAdminUser = await isAdmin(adminUid);
  if (!isAdminUser) {
    throw new Error('无权删除公告');
  }

  try {
    const announcementsRef = ref(db, 'announcements');
    const snapshot = await get(announcementsRef);
    
    if (!snapshot.exists()) {
      throw new Error('公告不存在');
    }

    let announcements = Object.values(snapshot.val());
    const initialLength = announcements.length;
    
    // 过滤掉要删除的公告
    announcements = announcements.filter(ann => ann.id !== announcementId);
    
    if (announcements.length === initialLength) {
      throw new Error('公告不存在');
    }

    // 保存更新后的列表
    await set(announcementsRef, announcements);
    
    return true;
  } catch (error) {
    console.error('删除公告失败:', error);
    throw error;
  }
};

// 简化函数名
export const getLastSeen = async (uid) => {
  try {
    const id = await getNumericIdByUid(uid);
    if (!id) return 0;
    
    const snap = await get(ref(db, `profiles/${id}/lastSeenAnnounce`));
    return snap.exists() ? snap.val() : 0;
  } catch (error) {
    console.error('获取时间失败:', error);
    return 0;
  }
};

// 更新用户最后查看公告的时间
export const updateLastSeen = async (uid) => {
  try {
    const id = await getNumericIdByUid(uid);
    if (!id) return;
    
    await set(ref(db, `profiles/${id}/lastSeenAnnounce`), Date.now());
  } catch (error) {
    console.error('更新时间失败:', error);
  }
};

// 检查是否有新公告
export const hasNewAnnounce = async (uid) => {
  try {
    const [lastSeen, announces] = await Promise.all([
      getLastSeen(uid),
      getAnnouncements(1)
    ]);
    
    if (announces.length === 0) return false;
    
    const latest = announces[0];
    return latest.createdAt > lastSeen;
  } catch (error) {
    console.error('检查新公告失败:', error);
    return false;
  }
};

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