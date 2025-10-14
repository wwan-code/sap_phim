import React from 'react';
import ReactDOM from 'react-dom';
import '@/assets/scss/components/common/_loader.scss';

const Loader = () => {
  return ReactDOM.createPortal(
    <div className="loader-overlay">
      <div className="loader-spinner"></div>
    </div>,
    document.body
  );
};

export default Loader;
