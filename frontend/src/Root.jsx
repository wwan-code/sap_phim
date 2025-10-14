import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from './hooks/useTheme';
import { initializeSocket, disconnectSocket } from './socket/socketManager';
import { clearFriendState } from './store/slices/friendSlice';
import { useNotificationQueries } from './hooks/useNotificationQueries';

const Root = ({ children }) => {
  useTheme();
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const { clearNotificationCache } = useNotificationQueries();

  useEffect(() => {
    if (accessToken) {
      initializeSocket();
    } else {
      disconnectSocket();
      dispatch(clearFriendState());
      clearNotificationCache();
    }

    // Cleanup function for useEffect
    return () => {
      disconnectSocket();
    };
  }, [accessToken, dispatch, clearNotificationCache]); // Re-run effect when accessToken changes, include dispatch and clearNotificationCache

  return (
    <>
      {children}
    </>
  );
};

export default Root;
