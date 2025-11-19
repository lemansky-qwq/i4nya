// src/pages/GitHubCallback.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('处理 GitHub 登录...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      console.log('=== GitHub OAuth 调试信息 ===');
      console.log('授权码:', code);

      if (error) {
        setMessage(`GitHub 授权失败: ${error}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setMessage('未收到授权码，请重新登录');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        setMessage('正在获取访问令牌...');
        
        const isDevelopment = import.meta.env.DEV;
        const clientId = isDevelopment 
          ? import.meta.env.VITE_DEV_GITHUB_CLIENT_ID
          : import.meta.env.VITE_PROD_GITHUB_CLIENT_ID;
        const clientSecret = isDevelopment
          ? import.meta.env.VITE_DEV_GITHUB_CLIENT_SECRET
          : import.meta.env.VITE_PROD_GITHUB_CLIENT_SECRET;

        console.log('使用的配置:', { clientId });

        if (!clientId || !clientSecret) {
          throw new Error('GitHub OAuth 配置缺失');
        }

        // 使用代理请求 GitHub OAuth
        const requestBody = {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
        };

        console.log('发送 OAuth 请求...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          // 使用正确的代理路径
          const tokenResponse = await fetch('/github-oauth/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log('OAuth 响应状态:', tokenResponse.status);

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('OAuth 响应内容:', errorText);
            throw new Error(`GitHub OAuth 错误: ${tokenResponse.status}`);
          }

          const tokenData = await tokenResponse.json();
          console.log('Token 响应数据:', tokenData);
          
          if (tokenData.error) {
            throw new Error(`GitHub OAuth 错误: ${tokenData.error} - ${tokenData.error_description}`);
          }

          if (!tokenData.access_token) {
            throw new Error('未收到访问令牌');
          }

          const accessToken = tokenData.access_token;
          console.log('成功获取访问令牌');

          setMessage('正在获取用户信息...');
          
          // 使用 GitHub API 代理获取用户信息
          const userResponse = await fetch(`/github-api/user`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'i3nya-app'
            },
          });

          console.log('用户信息响应状态:', userResponse.status);

          if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error('用户信息错误:', errorText);
            throw new Error(`获取用户信息失败: ${userResponse.status}`);
          }

          const userData = await userResponse.json();
          console.log('用户信息:', userData);

          // 获取邮箱信息
          const emailResponse = await fetch(`/github-api/user/emails`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'i3nya-app'
            },
          });

          console.log('邮箱信息响应状态:', emailResponse.status);

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('邮箱信息错误:', errorText);
            throw new Error(`获取邮箱信息失败: ${emailResponse.status}`);
          }

          const emails = await emailResponse.json();
          console.log('邮箱列表:', emails);
          
          const primaryEmail = emails.find(email => email.primary)?.email || emails[0]?.email;

          if (!primaryEmail) {
            throw new Error('无法获取 GitHub 邮箱地址');
          }

          console.log('使用邮箱:', primaryEmail);

          setMessage('正在检查账户状态...');
          
          // 直接尝试创建新用户，如果失败再处理
          await handleUserCreation(primaryEmail, {
            id: userData.id,
            email: primaryEmail,
            name: userData.name || userData.login,
            avatar: userData.avatar_url,
            login: userData.login
          });

        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
          }
          throw fetchError;
        }

      } catch (error) {
        console.error('GitHub OAuth 完整错误:', error);
        setMessage(`登录失败: ${error.message}`);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  // 直接尝试创建用户，如果失败则检查原因
  const handleUserCreation = async (email, githubUser) => {
    try {
      setMessage('正在创建账户...');
      
      // 生成符合 Firebase 要求的密码
      const generateSecurePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const securePassword = generateSecurePassword();
      console.log('生成的密码:', securePassword);
      
      console.log('创建 Firebase 用户...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        githubUser.email,
        securePassword
      );

      console.log('用户创建成功:', userCredential.user);

      // 更新用户资料
      await updateProfile(userCredential.user, {
        displayName: githubUser.name,
        photoURL: githubUser.avatar
      });

      console.log('用户资料更新成功');
      setMessage('GitHub 注册成功！正在跳转...');
      setTimeout(() => navigate('/'), 1000);
      
    } catch (error) {
      console.error('创建用户错误:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        // 邮箱已被使用，检查登录方式
        await checkExistingUserMethods(email);
      } else if (error.code === 'auth/weak-password') {
        setMessage('密码强度不足，请联系管理员');
        setTimeout(() => navigate('/login'), 3000);
      } else if (error.code === 'auth/invalid-email') {
        setMessage('邮箱格式无效');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMessage(`注册失败: ${error.message}`);
        setTimeout(() => navigate('/login'), 3000);
      }
    }
  };

  // 检查已存在用户的登录方式
  const checkExistingUserMethods = async (email) => {
    try {
      console.log('检查已存在用户的登录方式:', email);
      const methods = await fetchSignInMethodsForEmail(auth, email);
      console.log('该邮箱的登录方式:', methods);
      
      const providerNames = {
        'password': '邮箱密码',
        'google.com': 'Google', 
        'github.com': 'GitHub'
      };
      
      const existingMethods = methods.map(method => providerNames[method] || method);
      const methodText = existingMethods.join(' 或 ');
      
      setMessage(`该邮箱已使用 ${methodText} 注册，请使用原有方式登录`);
      setTimeout(() => navigate('/login'), 5000);
      
    } catch (error) {
      console.error('检查用户方法错误:', error);
      setMessage('该邮箱已被注册，但无法确定登录方式');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      textAlign: 'center'
    }}>
      <h2 className="text-primary">GitHub 登录</h2>
      <p className="text-secondary">{message}</p>
    </div>
  );
}