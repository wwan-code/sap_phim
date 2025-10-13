import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, accessToken } = useSelector((state) => state.auth);

  if (!accessToken) {
    // Chưa đăng nhập, chuyển hướng đến trang đăng nhập
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && user.roles) {
    const userRoles = user.roles.map(role => role.name);
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));
    if (!hasPermission) {
      // Không có quyền, chuyển hướng đến trang không có quyền
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default PrivateRoute;