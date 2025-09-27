import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useUserStore from '../store/userStore';

const DebugRouter = ({ children }) => {
  const location = useLocation();
  const { user, initialized, loading } = useUserStore();

  useEffect(() => {
    console.log('=== DEBUG ROUTER ===');
    console.log('Current path:', location.pathname);
    console.log('User:', user);
    console.log('Initialized:', initialized);
    console.log('Loading:', loading);
    console.log('===================');
  }, [location.pathname, user, initialized, loading]);

  return children;
};

export default DebugRouter;










