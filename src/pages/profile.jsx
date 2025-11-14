// src/pages/profile.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProfileById } from '../lib/pu';

export default function Profile() {
  const params = useParams();
  console.log('useParams() 返回:', params); // 必须打印！

  const { id } = params;
  console.log('当前 URL 中的 id:', id);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('当前 URL 中的 id:', id); // 必须打印！

    const fetch = async () => {
      // 必须判断 id 是否有效
      if (!id || id === 'null' || id === 'undefined') {
        setError('ID 无效');
        setLoading(false);
        return;
      }

      try {
        const data = await getProfileById(id);
        console.log('数据库返回:', data); // 必须打印！
        if (data) {
          setProfile(data);
        } else {
          setError('用户不存在');
        }
      } catch (e) {
        setError('加载出错');
        console.error(e);
      } finally {
        setLoading(false); // 必须执行！
      }
    };

    fetch();
  }, [id]);

  if (loading) return <p>加载中…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
      <h1>{profile.nickname}</h1>
      <p><strong>ID:</strong> {profile.id}</p>
      <p><strong>简介:</strong> {profile.bio || '暂无简介'}</p>
    </div>
  );
}