import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from './hooks/useTheme'; // Import hook useTheme
import { initializeSocket, disconnectSocket } from './socket/socketManager'; // Import socket manager

const Root = ({ children }) => {
  useTheme();
  const { accessToken } = useSelector((state) => state.auth);

  useEffect(() => {
    if (accessToken) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    // Cleanup function for useEffect
    return () => {
      disconnectSocket();
    };
  }, [accessToken]); // Re-run effect when accessToken changes

  return (
    <>
      {children}
    </>
  );
};

export default Root;
