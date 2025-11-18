// src/lib/authListener.js   或直接放在 App.jsx 的 useEffect 里

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { createProfile } from './pu';
import { useNavigate } from 'react-router-dom';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      // 关键时刻！用户首次验证成功
      const hasProfile = await getNumericIdByUid(user.uid);

      if (!hasProfile) {
        // 说明这是通过验证邮件回来的“真正完成注册”
        const nickname = user.displayName || user.email.split('@')[0];
        try {
          const numericId = await createProfile(user.uid, nickname);
          console.log('邮箱验证成功，用户正式完成注册！', numericId);

          // 可选：弹个 toast 或跳转到首页
          // toast.success('邮箱验证成功，欢迎正式加入！');
        } catch (err) {
          console.error('创建 profile 失败', err);
        }
      }
    }
  });

  return unsubscribe;
}, []);