import { FaXTwitter, FaGithub, FaBilibili } from 'react-icons/fa6';
import './about.css';

export default function About() {
  return (
    <div className="about-page">
      <h1>关于</h1>
      <p>i3?nya! 是由站长 lemansky 使用 0 元经费开发的一个页面</p>
      <p>吉祥物 i3nya 参与建设（？</p>

      <h2>欢迎骚扰站长</h2>
      <ul className="links-list">
        <li>
          <FaXTwitter className="icon" />
          <a href="https://x.com/lemansky_qwq" target="_blank" rel="noopener noreferrer">
            @lemansky_qwq
          </a>
        </li>
        <li>
          <FaGithub className="icon" />
          <a href="https://github.com/lemansky-qwq" target="_blank" rel="noopener noreferrer">
            @lemansky-qwq
          </a>
        </li>
        <li>
          <FaBilibili className="icon" />
          <a href="https://space.bilibili.com/3546627457420105" target="_blank" rel="noopener noreferrer">
            东篱十三巷
          </a>
        </li>
      </ul>

      <h2>友情链接</h2>
      <ul className="links-list">
        <li>
          <a href="https://gu-ing.pages.dev" target="_blank" rel="noopener noreferrer">
            Gu-ing之首页
          </a>
        </li>
        <li>
          <a href="https://gugu114.pages.dev" target="_blank" rel="noopener noreferrer">
            Gugu的小窝
          </a>
        </li>
      </ul>

      <hr />

      <footer className="footer">
        © 2025.6-2025.11 Lem &amp; i3n All rights reserved.
      </footer>
    </div>
  );
}
