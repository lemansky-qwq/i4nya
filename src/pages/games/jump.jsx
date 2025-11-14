import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function JumpGame() {
    const canvasRef = useRef(null);
    const [player, setPlayer] = useState({ x: 0, y: 250 });
    const [platforms, setPlatforms] = useState([
        { x: 0, width: 80 },
        { x: 100, width: 80 },
    ]);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('jumpHighScore') || '0'));
    const [gameOver, setGameOver] = useState(false);
    const [charging, setCharging] = useState(false);
    const [chargeStart, setChargeStart] = useState(0);
    const [isJumping, setIsJumping] = useState(false);
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // User authentication
    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Fetch leaderboard
    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);

            try {
                // 确保使用正确的排序方式（descending）
                const { data, error } = await supabase
                    .from('gamescores')
                    .select('jump, profiles(nickname)')
                    .not('jump', 'is', null)  // 确保只获取有jump分数的记录
                    .order('jump', { ascending: false })  // 明确降序排列
                    .limit(10);

                if (error) throw error;

                // 确保数据正确排序后再设置state
                const sortedData = data.sort((a, b) => b.jump - a.jump);
                setLeaderboard(sortedData);
            } catch (err) {
                setError('获取排行榜失败：' + err.message);
                console.error('获取排行榜错误:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    // 修改后的saveScore函数
    const saveScore = async () => {
        if (!user) {
            setMessage('请先登录');
            return;
        }

        try {
            // 首先检查用户是否存在记录
            const { data: existing, error: fetchError } = await supabase
                .from('gamescores')
                .select('jump')
                .eq('user_uuid', user.id)
                .single();

            // 移除了updated_at字段
            let upsertData = {
                user_uuid: user.id,
                jump: score
            };

            // 如果已有记录且新分数更高，或者没有记录
            if (!existing || (existing && score > existing.jump)) {
                const { error: upsertError } = await supabase
                    .from('gamescores')
                    .upsert(upsertData, { onConflict: 'user_uuid' });

                if (upsertError) throw upsertError;

                setMessage(existing ? '新纪录，分数已更新' : '首次提交，分数已保存');
                
                // 刷新排行榜
                const { data: newLeaderboard } = await supabase
                    .from('gamescores')
                    .select('jump, profiles(nickname)')
                    .not('jump', 'is', null)
                    .order('jump', { ascending: false })
                    .limit(10);
                
                setLeaderboard(newLeaderboard);
            } else {
                setMessage(`未超过历史最高分：${existing.jump}，未更新`);
            }
        } catch (error) {
            console.error('保存分数错误:', error);
            setMessage('操作失败: ' + error.message);
        }
    };

    // Game drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 300;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const viewOffset = Math.max(0, player.x - 150);

            ctx.fillStyle = '#eee';
            ctx.fillRect(0, 280, canvas.width, 20);

            ctx.fillStyle = '#888';
            platforms.forEach((p, i) => {
                ctx.fillStyle = (i === platforms.length - 1) ? '#555' : '#888';
                ctx.fillRect(p.x - viewOffset, 260, p.width, 20);
            });

            ctx.fillStyle = gameOver ? 'red' : '#007bff';
            ctx.fillRect(player.x - viewOffset, player.y, 20, 20);
        };

        draw();
    }, [player, platforms, gameOver, score, highScore]);

    const animateJump = (power) => {
        setIsJumping(true);
        const distance = Math.min(200, power * 2);
        const jumpHeight = Math.min(100, power * 1.5);

        let frame = 0;
        const totalFrames = 30;
        const startX = player.x;
        const startY = player.y;

        const jumpFrame = () => {
            frame++;
            const t = frame / totalFrames;
            const x = startX + distance * t;
            const y = startY - (4 * jumpHeight * t * (1 - t));
            setPlayer({ x, y });

            if (frame < totalFrames) {
                requestAnimationFrame(jumpFrame);
            } else {
                finishJump(x);
            }
        };

        requestAnimationFrame(jumpFrame);
    };

    const finishJump = (x) => {
        const playerMidX = x + 10;
        const currentPlatform = platforms[platforms.length - 2];
        const nextPlatform = platforms[platforms.length - 1];

        const isOnNext = playerMidX >= nextPlatform.x && playerMidX <= nextPlatform.x + nextPlatform.width;
        const isOnCurrent = playerMidX >= currentPlatform.x && playerMidX <= currentPlatform.x + currentPlatform.width;

        if (isOnNext) {
            setPlayer({ x, y: 250 });
            setScore(prev => prev + 1);
            const difficultyScale = Math.min(score / 10, 1);
            const minGap = 80 + difficultyScale * 40;
            const maxGap = 140 + difficultyScale * 60;
            const minWidth = 60 - difficultyScale * 20;
            const maxWidth = 100 - difficultyScale * 30;

            const newPlatform = {
                x: nextPlatform.x + minGap + Math.random() * (maxGap - minGap),
                width: minWidth + Math.random() * (maxWidth - minWidth),
            };

            setPlatforms([...platforms, newPlatform]);
        } else if (isOnCurrent) {
            setPlayer({ x, y: 250 });
        } else {
            setGameOver(true);
            if (score > highScore) {
                setHighScore(score);
                localStorage.setItem('jumpHighScore', score);
            }
        }

        setIsJumping(false);
    };

    const reset = () => {
        setGameOver(false);
        setScore(0);
        setPlayer({ x: 0, y: 250 });
        setPlatforms([
            { x: 0, width: 80 },
            { x: 100, width: 80 },
        ]);
        setIsJumping(false);
    };

    const startCharge = () => {
        if (!isJumping && !gameOver) {
            setCharging(true);
            setChargeStart(performance.now());
        }
    };

    const releaseJump = () => {
        if (charging && !isJumping && !gameOver) {
            const duration = performance.now() - chargeStart;
            const power = Math.min(duration / 10, 100);
            setCharging(false);
            animateJump(power);
        }
    };


    return (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <h1>跳一跳！Jump 1 Jump 3.6</h1>
            <canvas ref={canvasRef} style={{ border: '1px solid #ccc' }}></canvas>
            <p>得分：{score} | 最高分：{highScore}</p>

            {gameOver ? (
                <div>
                    <p style={{ color: 'red' }}>你掉了！</p>
                    <button onClick={reset}>重新开始</button>
                    <button onClick={saveScore} style={{ marginLeft: '10px' }}>保存分数</button>
                    {message && <p>{message}</p>}
                </div>
            ) : (
                <button
                    onMouseDown={startCharge}
                    onMouseUp={releaseJump}
                    onTouchStart={(e) => { e.preventDefault(); startCharge(); }}
                    onTouchEnd={(e) => { e.preventDefault(); releaseJump(); }}
                    disabled={isJumping}
                    style={{
                        marginTop: '1rem',
                        padding: '1rem 2rem',
                        fontSize: '1.2rem',
                        userSelect: 'none',
                    }}
                >
                    {charging ? '蓄力中...' : '跳！'}
                </button>
            )}

            
        </div>
    );
}