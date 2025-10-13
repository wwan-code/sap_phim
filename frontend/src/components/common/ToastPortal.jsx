import React from 'react';
import ReactDOM from 'react-dom';

const ToastPortal = ({ children }) => {
  const portalRoot = document.getElementById('toast-portal');
  if (!portalRoot) {
    console.error("Element with id 'toast-portal' not found. Please add <div id='toast-portal'></div> to your index.html.");
    return null;
  }
  return ReactDOM.createPortal(children, portalRoot);
};

export default ToastPortal;