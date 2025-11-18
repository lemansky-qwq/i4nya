import { Link } from 'react-router-dom';
import './games.css';

export default function Games() {
  const games = [
    { title: '点击', path: '/games/click', description: '全站首发，致敬老牌魔王' },
    { title: '🕹️ 跳一跳', path: '/games/jump', description: 'Jump 1 Jump 3.6' },
    { title: '2048', path: '/games/2048', description: '2048 1.9' },
    { title: '排行榜', path: '/games/score', description: '都有' },
  ];

  return (
    <div className="games-page" style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 className="text-primary">小游戏</h1>
      <div className="games-grid">
        {games.map((game, i) => (
          <Link to={game.path} className="game-card card" key={i} style={{ textDecoration: 'none' }}>
            <h3 className="text-primary">{game.title}</h3>
            <p className="text-secondary">{game.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}