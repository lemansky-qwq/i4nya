// src/pages/login.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getNumericIdByUid } from '../lib/pu';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const numericId = await getNumericIdByUid(cred.user.uid);

      if (!numericId) {
        setMsg('用户未完成注册');
        return;
      }

      setMsg('登录成功！');
      setTimeout(() => navigate(`/profile/${numericId}`), 600);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ maxWidth: 360, margin: '2rem auto' }}>
      <input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit">登录</button>
      {msg && <p>{msg}</p>}
    </form>
  );
}