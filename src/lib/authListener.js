// src/lib/authListener.js   或直接放在 App.jsx 的 useEffect 里

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { createProfile } from './pu';
import { useNavigate } from 'react-router-dom';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const hasProfile = await getNumericIdByUid(user.uid);

      if (!hasProfile) {
        const nickname =
          user.displayName ||
          user.email?.split('@')[0] ||
          'user';

        const numericId = await createProfile(user.uid, nickname);

        console.log('用户 profile 已补写', {
          uid: user.uid,
          provider: user.providerData[0]?.providerId,
          numericId
        });
      }
    } catch (err) {
      console.error('检查/创建 profile 失败', err);
    }
  });

  return unsubscribe;
}, []);
