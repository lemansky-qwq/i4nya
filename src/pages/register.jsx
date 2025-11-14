import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e) => {
  e.preventDefault();
  setMessage('');
  console.log('开始注册', { email, password, nickname });

  // 1. 注册用户
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log('注册响应:', { data, error });

  if (error) {
    console.error('注册错误:', error);
    setMessage(error.message);
    return;
  }

  // 2. 获取用户ID
  const userId = data.user?.id;
  console.log('用户ID:', userId);
  
  if (!userId) {
    setMessage('注册成功，但无法获取用户ID');
    return;
  }

  // 3. 插入profile
  console.log('准备插入profile:', { user_uuid: userId, nickname });
  
  const insertResponse = await supabase
    .from('profiles')
    .insert([{ 
      user_uuid: userId, 
      nickname 
    }]);
  
  console.log('插入响应:', insertResponse);

  if (insertResponse.error) {
    console.error('插入profile失败:', insertResponse.error);
    // 尝试获取更详细的错误信息
    if (insertResponse.error.details) {
      console.error('错误详情:', insertResponse.error.details);
    }
    if (insertResponse.error.hint) {
      console.error('错误提示:', insertResponse.error.hint);
    }
    
    // 4. 回滚：删除用户
    const deleteResponse = await supabase.auth.admin.deleteUser(userId);
    console.log('删除用户响应:', deleteResponse);
    
    setMessage(`注册失败: ${insertResponse.error.message}`);
  } else {
    setMessage('注册成功！请检查邮箱验证');
  }
};

  return (
    <div>
      <h2>注册</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="用户名"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">注册</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
