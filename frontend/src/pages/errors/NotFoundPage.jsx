import React from 'react';
import { Link } from 'react-router-dom';
import '@/assets/scss/pages/_error-pages.scss'; // Import error page styles

const NotFoundPage = () => {
  return (
    <div className="error-page">
      <div className="error-page__container">
        <h1 className="error-page__title">404</h1>
        <p className="error-page__message">Trang bạn tìm không tồn tại.</p>
        <Link to="/" className="error-page__home-link btn btn-primary">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
