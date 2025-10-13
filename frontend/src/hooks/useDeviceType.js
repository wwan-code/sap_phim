import { useState, useEffect } from 'react';

const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) {
    return 'mobile';
  } else if (width >= 768 && width < 992) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState(getDeviceType());

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
};
