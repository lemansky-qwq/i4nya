import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { getNumericIdByUid, createProfile } from './pu';

export const initAuthListener = () => {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const hasProfile = await getNumericIdByUid(user.uid);
      if (hasProfile) return;

      // GitHub-safe 昵称生成
      const nickname =
        user.displayName ||
        user.email?.split('@')[0] ||
        user.providerData[0]?.providerId ||
        'user';

      await createProfile(user.uid, nickname);

      console.log('profile 创建完成', {
        uid: user.uid,
        provider: user.providerData[0]?.providerId
      });
    } catch (err) {
      console.error('创建 profile 失败', err, user);
    }
  });
};
