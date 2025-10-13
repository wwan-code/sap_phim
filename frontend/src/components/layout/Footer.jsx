import React from 'react';
import { Link } from 'react-router-dom';
import '@/assets/scss/components/layout/_footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__content">
        <div className="footer__section">
          <h4>Về chúng tôi</h4>
          <p>WWAN là nền tảng giải trí và kết nối bạn bè hàng đầu.</p>
        </div>
        <div className="footer__section">
          <h4>Liên kết nhanh</h4>
          <ul>
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/movies">Phim</Link></li>
            <li><Link to="/friends">Bạn bè</Link></li>
            <li><Link to="/profile">Hồ sơ</Link></li>
          </ul>
        </div>
        <div className="footer__section">
          <h4>Liên hệ</h4>
          <p>Email: support@wwan.com</p>
          <p>Điện thoại: +84 123 456 789</p>
        </div>
        <div className="footer__social-links">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook-f"></i> {/* Placeholder for Facebook icon */}
          </a>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-discord"></i> {/* Placeholder for Discord icon */}
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-youtube"></i> {/* Placeholder for YouTube icon */}
          </a>
        </div>
      </div>
      <div className="footer__copyright">
        &copy; {new Date().getFullYear()} WWAN. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
