import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, firestore, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, limit, where, getDocs, deleteDoc, doc 
} from 'firebase/firestore';
import './chat.css';

const ChatPage = () => {
  const [user, setUser] = useState(null);
  const [userNickname, setUserNickname] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [userStats, setUserStats] = useState({ dailyCount: 0, lastMessageTime: null });
  const [isAdmin, setIsAdmin] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  // 添加点击昵称进入主页的函数
  const handleNicknameClick = async (userId, displayName) => {
    if (!user) return;
    
    try {
      // 获取用户的数字ID
      const numericId = await getNumericIdByUid(userId);
      if (numericId) {
        navigate(`/profile/${numericId}`);
      } else {
        console.log('未找到用户ID');
        // 如果找不到数字ID，可以显示提示或者跳转到默认页面
        alert(`无法访问 ${displayName} 的主页`);
      }
    } catch (error) {
      console.error('跳转用户主页失败:', error);
    }
  };

  // 添加缺失的 checkFirestoreConnection 函数
  const checkFirestoreConnection = async () => {
    try {
      const testQuery = query(collection(firestore, 'chatMessages'), limit(1));
      await getDocs(testQuery);
      setFirestoreError(null);
      return true;
    } catch (error) {
      console.error('Firestore 连接失败:', error);
      setFirestoreError('数据库连接失败，请检查 Firestore 是否启用');
      return false;
    }
  };

  // 从 Realtime Database 获取用户 nickname - 修复路径
  const getUserNickname = async (userId) => {
    try {
      console.log('正在获取用户昵称，用户ID:', userId);
      
      // 根据你的数据结构，路径应该是 profiles 下的数字ID，不是 UID
      // 先获取数字ID
      const numericId = await getNumericIdByUid(userId);
      console.log('数字ID:', numericId);
      
      if (numericId) {
        const userRef = ref(db, `profiles/${numericId}`);
        const snapshot = await get(userRef);
        console.log('用户数据:', snapshot.val());
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const nickname = userData.nickname;
          console.log('获取到昵称:', nickname);
          return nickname || '用户';
        }
      }
      console.log('未找到用户数据');
      return '用户';
    } catch (error) {
      console.error('获取用户昵称失败:', error);
      return '用户';
    }
  };

  // 添加 getNumericIdByUid 函数（如果不存在）
  const getNumericIdByUid = async (uid) => {
    try {
      const uidToIdRef = ref(db, 'uidToId');
      const snapshot = await get(uidToIdRef);
      if (snapshot.exists()) {
        const uidToIdMap = snapshot.val();
        return uidToIdMap[uid] || null;
      }
      return null;
    } catch (error) {
      console.error('获取数字ID失败:', error);
      return null;
    }
  };

  // 检查用户权限
  const checkUserRole = async (userId) => {
    try {
      const numericId = await getNumericIdByUid(userId);
      if (numericId) {
        const userRef = ref(db, `profiles/${numericId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          return userData.role === 'admin';
        }
      }
      return false;
    } catch (error) {
      console.error('检查用户权限失败:', error);
      return false;
    }
  };

// 检查用户发送频率
const checkUserRateLimit = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('统计今天日期:', today);
    console.log('统计用户ID:', userId);

    const messagesQuery = query(
      collection(firestore, 'chatMessages'),
      where('userId', '==', userId),
      where('timestamp', '>=', today)
    );
    
    const snapshot = await getDocs(messagesQuery);
    const dailyCount = snapshot.size;
    
    console.log('今日消息数量:', dailyCount);

    const lastMessageQuery = query(
      collection(firestore, 'chatMessages'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const lastMessageSnapshot = await getDocs(lastMessageQuery);
    const lastMessageTime = lastMessageSnapshot.empty ? null : lastMessageSnapshot.docs[0]?.data()?.timestamp;
    
    return { dailyCount, lastMessageTime };
  } catch (error) {
    console.error('检查频率限制失败:', error);
    return { dailyCount: 0, lastMessageTime: null };
  }
};

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
      await checkFirestoreConnection();
      
      // 获取用户昵称和权限
      const nickname = await getUserNickname(currentUser.uid);
      console.log('最终设置的昵称:', nickname);
      setUserNickname(nickname);
      
      const adminStatus = await checkUserRole(currentUser.uid);
      setIsAdmin(adminStatus);
      
      // 🔥 重要：页面加载时就获取统计数据
      const initialStats = await checkUserRateLimit(currentUser.uid);
      console.log('初始统计数据:', initialStats);
      setUserStats(initialStats);
    }
    setLoading(false);
  });
  return () => unsubscribe();
}, []);

  // 监听消息
  useEffect(() => {
    if (!user || firestoreError) return;

    console.log('开始监听 Firestore 消息...');

    const q = query(
      collection(firestore, 'chatMessages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        console.log('收到消息更新，数量:', querySnapshot.size);
        const messagesData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({ 
            id: doc.id, 
            ...data
          });
        });
        setMessages(messagesData);
        setFirestoreError(null);
      },
      (error) => {
        console.error('监听消息失败:', error);
        if (error.code === 'permission-denied') {
          setFirestoreError('数据库权限不足，请检查 Firestore 安全规则');
        } else {
          setFirestoreError('数据库错误: ' + error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [user, firestoreError]);

  // 冷却时间倒计时
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => {
        setCooldown(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 删除消息函数
  const deleteMessage = async (messageId, messageUserId) => {
    if (!user) return;
    
    if (messageUserId !== user.uid && !isAdmin) {
      alert('您只能删除自己的消息');
      return;
    }

    if (!confirm('确定要删除这条消息吗？')) return;

    try {
      await deleteDoc(doc(firestore, 'chatMessages', messageId));
      console.log('消息删除成功');
    } catch (error) {
      console.error('删除消息失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const sendMessage = async (e) => {
  e.preventDefault();
  
  // 立即检查冷却状态，避免快速点击
  if (!newMessage.trim() || !user || cooldown > 0 || firestoreError) {
    return;
  }

  // 立即设置冷却，防止快速重复发送
  setCooldown(10);
  
  const isConnected = await checkFirestoreConnection();
  if (!isConnected) {
    alert('数据库连接失败，无法发送消息');
    setCooldown(0); // 重置冷却
    return;
  }

  // 重新检查冷却（防止并发问题）
  if (cooldown > 0) {
    return;
  }

  if (userStats.dailyCount >= 20) {
    alert('今日消息发送已达上限（20条）');
    setCooldown(0); // 重置冷却
    return;
  }

  if (newMessage.length > 500) {
    alert('消息长度不能超过500字符');
    setCooldown(0); // 重置冷却
    return;
  }

  try {
    const displayName = userNickname || '用户';
    
    const messageData = {
      text: newMessage.trim(),
      userId: user.uid,
      userEmail: user.email,
      displayName: displayName,
      timestamp: serverTimestamp()
    };

    console.log('发送消息到 Firestore:', messageData);
    
    await addDoc(collection(firestore, 'chatMessages'), messageData);
    
    console.log('消息发送成功');
    setNewMessage('');
    // 冷却已经在函数开头设置了，这里不需要再设置
    
    // 更新统计
    const updatedStats = await checkUserRateLimit(user.uid);
    console.log('更新后统计:', updatedStats);
    setUserStats(updatedStats);
    
  } catch (error) {
    console.error('发送消息失败:', error);
    alert('发送失败: ' + error.message);
    setCooldown(0); // 发送失败时重置冷却
  }
};

  // 格式化时间显示
  const formatTime = (timestamp) => {
  if (!timestamp) return '刚刚';
  try {
    const date = timestamp.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // 如果是今天，显示时间
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } 
    // 如果是昨天，显示"昨天 + 时间"
    else if (messageDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit'
      })}`;
    }
    // 其他情况显示完整日期和时间
    else {
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    return '刚刚';
  }
};

  if (loading) return <div className="chat-loading">加载中...</div>;

  if (!user) {
    return (
      <div className="chat-auth-required">
        <h2>请先登录</h2>
        <p>需要登录后才能使用聊天室</p>
        <button onClick={() => navigate('/login')}>去登录</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>公共聊天室</h1>
        <p>欢迎，{userNickname}！{isAdmin && '(管理员)'}</p>
        <div className="chat-rules">
          <small>每日限制: 20条 | 冷却: 10秒 | 长度: 500字符</small>
          <small>今日已发送: {userStats.dailyCount}/20 条 | 冷却: {cooldown}s</small>
          {isAdmin && <small style={{color: 'var(--warning-color)'}}>管理员模式</small>}
        </div>
      </div>

      {firestoreError && (
        <div className="error-message">
          <strong>数据库错误:</strong> {firestoreError}
        </div>
      )}
      
      <div className="messages-container">
      {messages.length === 0 ? (
        <div className="no-messages">还没有消息，快来发言吧！</div>
      ) : (
        messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.userId === user.uid ? 'own-message' : 'other-message'}`}
          >
            <div className="message-header">
              <span 
                className="user-name clickable"
                onClick={() => handleNicknameClick(message.userId, message.displayName)}
                title={`查看 ${message.displayName} 的主页`}
              >
                {message.displayName}
                {isAdmin && message.userId !== user.uid}
              </span>
              <span className="message-time">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className="message-text">{message.text}</div>
            
            {/* 删除按钮 */}
            {(message.userId === user.uid || isAdmin) && (
              <button 
                className="message-delete"
                onClick={() => deleteMessage(message.id, message.userId)}
                title={isAdmin && message.userId !== user.uid ? '删除此消息(管理员)' : '删除我的消息'}
              >
                {isAdmin && message.userId !== user.uid ? '删除' : '删除'}
              </button>
            )}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>

      <form onSubmit={sendMessage} className="message-form">
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={cooldown > 0 ? `冷却中... ${cooldown}s` : "输入消息..."}
            maxLength={500}
            className="message-input"
            disabled={cooldown > 0 || !!firestoreError}
          />
          <div className="input-info">
            <span>{newMessage.length}/500</span>
          </div>
        </div>
        <button 
          type="submit" 
          disabled={!newMessage.trim() || cooldown > 0 || userStats.dailyCount >= 20 || !!firestoreError}
          className="send-button"
        >
          {cooldown > 0 ? `冷却(${cooldown}s)` : '发送'}
        </button>
      </form>
    </div>
  );
};

export default ChatPage;