import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const { uid } = useParams();
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
        setBio(data.bio || '');
      }
    };

    fetchData();
  }, [uid]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bio })
      .eq('id', uid);

    setSaving(false);

    if (!error) {
      setEditing(false);
    } else {
      alert('更新失败：' + error.message);
    }
  };

  if (notFound) return <p>用户不存在</p>;
  if (!profile) return <p>加载中...</p>;

  const isOwner = currentUser?.id === profile.user_uuid;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>用户资料</h1>
      <p>UID: {profile.id}</p>
      <p>昵称: {profile.nickname || '（未设置）'}</p>
      <p>邮箱: {profile.email || '（未公开）'}</p>

      <div>
        <h3>个性签名</h3>
        {isOwner ? (
          <>
            {editing ? (
              <>
                <textarea
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{ width: '100%' }}
                />
                <br />
                <button onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
                <button onClick={() => setEditing(false)} style={{ marginLeft: '0.5rem' }}>
                  取消
                </button>
              </>
            ) : (
              <>
                <p>{bio || '（点击下方编辑）'}</p>
                <button onClick={() => setEditing(true)}>编辑签名</button>
              </>
            )}
          </>
        ) : (
          <p>{profile.bio || '这个人很懒，什么都没写'}</p>
        )}
      </div>
    </div>
  );
}
