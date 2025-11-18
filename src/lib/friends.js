import { db } from './firebase';
import { ref, set, get, child, update, remove } from 'firebase/database';
import { getProfileById, getProfileByUid } from './pu';

// 发送好友请求
export const sendFriendRequest = async (fromUid, toUid) => {
  if (!fromUid || !toUid) throw new Error('用户ID不能为空');
  if (fromUid === toUid) throw new Error('不能添加自己为好友');

  console.log('发送好友请求:', { fromUid, toUid });

  // 获取双方资料（通过UID）
  const fromProfile = await getProfileByUid(fromUid);
  const toProfile = await getProfileByUid(toUid);
  
  console.log('获取到的资料:', { fromProfile, toProfile });
  
  if (!fromProfile || !toProfile) throw new Error('用户不存在');

  // 检查是否已经是好友
  if (fromProfile.friends && fromProfile.friends[toProfile.id] === 'accepted') {
    throw new Error('已经是好友了');
  }

  // 检查是否已发送过请求
  if (toProfile.friendRequests && toProfile.friendRequests[fromProfile.id]) {
    throw new Error('已发送过好友请求');
  }

  // 更新接收方的好友请求列表
  const updates = {};
  updates[`profiles/${toProfile.id}/friendRequests/${fromProfile.id}`] = {
    from: fromUid,
    fromNickname: fromProfile.nickname,
    status: 'pending',
    createdAt: Date.now()
  };

  await update(ref(db), updates);
  return true;
};

// 接受好友请求
export const acceptFriendRequest = async (userUid, fromUid) => {
  const userProfile = await getProfileByUid(userUid);
  const fromProfile = await getProfileByUid(fromUid);

  console.log('接受好友请求:', { userUid, fromUid, userProfile, fromProfile });

  if (!userProfile || !fromProfile) {
    throw new Error('用户不存在');
  }

  // 检查请求是否存在
  if (!userProfile.friendRequests || !userProfile.friendRequests[fromProfile.id]) {
    throw new Error('好友请求不存在');
  }

  const updates = {};
  
  // 在双方的好友列表中建立关系（使用数字ID作为键）
  updates[`profiles/${userProfile.id}/friends/${fromProfile.id}`] = 'accepted';
  updates[`profiles/${fromProfile.id}/friends/${userProfile.id}`] = 'accepted';
  
  // 删除请求
  updates[`profiles/${userProfile.id}/friendRequests/${fromProfile.id}`] = null;

  await update(ref(db), updates);
};

// 拒绝好友请求
export const rejectFriendRequest = async (userUid, fromUid) => {
  const userProfile = await getProfileByUid(userUid);
  
  if (!userProfile) throw new Error('用户不存在');

  const fromProfile = await getProfileByUid(fromUid);
  if (!fromProfile) throw new Error('发送方用户不存在');

  const updates = {};
  updates[`profiles/${userProfile.id}/friendRequests/${fromProfile.id}`] = null;
  
  await update(ref(db), updates);
};

// 删除好友
export const removeFriend = async (userUid, friendUid) => {
  const userProfile = await getProfileByUid(userUid);
  const friendProfile = await getProfileByUid(friendUid);

  if (!userProfile || !friendProfile) {
    throw new Error('用户不存在');
  }

  const updates = {};
  updates[`profiles/${userProfile.id}/friends/${friendProfile.id}`] = null;
  updates[`profiles/${friendProfile.id}/friends/${userProfile.id}`] = null;
  
  await update(ref(db), updates);
};

// 获取好友列表
export const getFriends = async (userUid) => {
  if (!userUid) return [];
  
  const profile = await getProfileByUid(userUid);
  if (!profile || !profile.friends) return [];
  
  const friends = [];
  for (const [friendId, status] of Object.entries(profile.friends)) {
    if (status === 'accepted') {
      const friendProfile = await getProfileById(friendId);
      if (friendProfile) {
        friends.push({
          ...friendProfile,
          friendId: friendProfile.id
        });
      }
    }
  }
  
  return friends;
};

// 获取待处理的好友请求
export const getPendingRequests = async (userUid) => {
  if (!userUid) return [];
  
  const profile = await getProfileByUid(userUid);
  if (!profile || !profile.friendRequests) return [];
  
  const requests = [];
  for (const [fromUserId, requestData] of Object.entries(profile.friendRequests)) {
    if (requestData.status === 'pending') {
      const fromProfile = await getProfileById(fromUserId);
      if (fromProfile) {
        requests.push({
          ...requestData,
          fromUserId,
          profile: fromProfile
        });
      }
    }
  }
  
  return requests;
};

// 检查好友关系状态
export const getFriendStatus = async (userUid, otherUserUid) => {
  if (!userUid || !otherUserUid || userUid === otherUserUid) return 'self';
  
  const userProfile = await getProfileByUid(userUid);
  const otherProfile = await getProfileByUid(otherUserUid);
  
  if (!userProfile || !otherProfile) return 'none';
  
  // 检查是否已经是好友
  if (userProfile.friends && userProfile.friends[otherProfile.id] === 'accepted') {
    return 'friend';
  }
  
  // 检查是否有待处理的请求（我发给对方的）
  if (otherProfile.friendRequests && otherProfile.friendRequests[userProfile.id]) {
    return 'request_sent';
  }
  
  // 检查对方是否发送了请求给我
  if (userProfile.friendRequests && userProfile.friendRequests[otherProfile.id]) {
    return 'request_received';
  }
  
  return 'none';
};