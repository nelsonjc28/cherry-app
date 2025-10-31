import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useUserStore from '../store/userStore';

const DebugRouter = ({ children }) => {
  const location = useLocation();
  const { user, initialized, loading } = useUserStore();

  useEffect(() => {
    ;;;;;
  }, [location.pathname, user, initialized, loading]);

  return children;
};

export default DebugRouter;





























