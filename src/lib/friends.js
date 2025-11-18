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
export const acceptFriendRequest = async (userUid, fromRequestId) => {
  console.log('接受好友请求:', { userUid, fromRequestId });

  // fromRequestId 是数字ID，不是UID！
  const userProfile = await getProfileByUid(userUid);
  
  if (!userProfile) {
    throw new Error('当前用户不存在');
  }

  // 检查请求是否存在 - fromRequestId 是数字ID
  if (!userProfile.friendRequests || !userProfile.friendRequests[fromRequestId]) {
    console.log('好友请求数据:', userProfile.friendRequests);
    throw new Error('好友请求不存在');
  }

  const requestData = userProfile.friendRequests[fromRequestId];
  console.log('请求数据:', requestData);

  // 通过请求中的 from 字段获取发送者的UID
  const fromUid = requestData.from;
  const fromProfile = await getProfileByUid(fromUid);

  if (!fromProfile) {
    throw new Error('发送请求的用户不存在');
  }

  const updates = {};
  
  // 在双方的好友列表中建立关系（使用数字ID作为键）
  updates[`profiles/${userProfile.id}/friends/${fromProfile.id}`] = 'accepted';
  updates[`profiles/${fromProfile.id}/friends/${userProfile.id}`] = 'accepted';
  
  // 删除请求
  updates[`profiles/${userProfile.id}/friendRequests/${fromRequestId}`] = null;

  await update(ref(db), updates);
  console.log('好友请求接受成功');
};

// 拒绝好友请求
export const rejectFriendRequest = async (userUid, fromRequestId) => {
  const userProfile = await getProfileByUid(userUid);
  
  if (!userProfile) throw new Error('用户不存在');

  const updates = {};
  updates[`profiles/${userProfile.id}/friendRequests/${fromRequestId}`] = null;
  
  await update(ref(db), updates);
  console.log('好友请求拒绝成功');
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
  console.log('getFriends: 当前用户资料', profile);
  
  if (!profile || !profile.friends) {
    console.log('getFriends: 没有好友数据');
    return [];
  }
  
  console.log('getFriends: 好友列表数据', profile.friends);
  
  const friends = [];
  for (const [friendId, status] of Object.entries(profile.friends)) {
    if (status === 'accepted') {
      console.log('getFriends: 处理好友', { friendId, status, type: typeof friendId });
      
      try {
        // 确保 friendId 是数字
        const numericFriendId = parseInt(friendId);
        if (isNaN(numericFriendId)) {
          console.warn('getFriends: 好友ID不是数字', friendId);
          continue;
        }
        
        const friendProfile = await getProfileById(numericFriendId);
        console.log('getFriends: 好友资料', friendProfile);
        
        if (friendProfile) {
          friends.push({
            ...friendProfile,
            friendId: friendProfile.id
          });
        } else {
          console.warn('getFriends: 无法找到好友资料', numericFriendId);
        }
      } catch (error) {
        console.error('getFriends: 获取好友资料失败', { friendId, error });
      }
    }
  }
  
  console.log('getFriends: 最终好友列表', friends);
  return friends;
};

// 获取待处理的好友请求
export const getPendingRequests = async (userUid) => {
  if (!userUid) return [];
  
  const profile = await getProfileByUid(userUid);
  console.log('getPendingRequests: 当前用户资料', profile);
  
  if (!profile || !profile.friendRequests) {
    console.log('getPendingRequests: 没有好友请求');
    return [];
  }
  
  console.log('getPendingRequests: 好友请求数据', profile.friendRequests);
  
  const requests = [];
  for (const [fromUserId, requestData] of Object.entries(profile.friendRequests)) {
    if (requestData.status === 'pending') {
      console.log('getPendingRequests: 处理请求', { fromUserId, requestData, type: typeof fromUserId });
      
      try {
        // 确保 fromUserId 是数字
        const numericFromUserId = parseInt(fromUserId);
        if (isNaN(numericFromUserId)) {
          console.warn('getPendingRequests: 请求者ID不是数字', fromUserId);
          continue;
        }
        
        const fromProfile = await getProfileById(numericFromUserId);
        console.log('getPendingRequests: 请求者资料', fromProfile);
        
        if (fromProfile) {
          requests.push({
            ...requestData,
            fromUserId: numericFromUserId, // 存储数字ID
            profile: fromProfile
          });
        } else {
          console.warn('getPendingRequests: 无法找到请求者资料', numericFromUserId);
        }
      } catch (error) {
        console.error('getPendingRequests: 获取请求者资料失败', { fromUserId, error });
      }
    }
  }
  
  console.log('getPendingRequests: 最终请求列表', requests);
  return requests;
};

// 检查好友关系状态
export const getFriendStatus = async (userUid, otherUserUid) => {
  if (!userUid || !otherUserUid || userUid === otherUserUid) return 'self';
  
  console.log('getFriendStatus: 检查状态', { userUid, otherUserUid });
  
  const userProfile = await getProfileByUid(userUid);
  const otherProfile = await getProfileByUid(otherUserUid);
  
  console.log('getFriendStatus: 用户资料', { userProfile, otherProfile });
  
  if (!userProfile || !otherProfile) {
    console.log('getFriendStatus: 用户资料不存在');
    return 'none';
  }
  
  // 检查是否已经是好友
  if (userProfile.friends && userProfile.friends[otherProfile.id] === 'accepted') {
    console.log('getFriendStatus: 已经是好友');
    return 'friend';
  }
  
  // 检查是否有待处理的请求（我发给对方的）
  if (otherProfile.friendRequests && otherProfile.friendRequests[userProfile.id]) {
    console.log('getFriendStatus: 已发送请求');
    return 'request_sent';
  }
  
  // 检查对方是否发送了请求给我
  if (userProfile.friendRequests && userProfile.friendRequests[otherProfile.id]) {
    console.log('getFriendStatus: 收到请求');
    return 'request_received';
  }
  
  console.log('getFriendStatus: 无关系');
  return 'none';
};