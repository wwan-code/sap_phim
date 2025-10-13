import { useState, useEffect, useCallback } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    // Lấy theme từ localStorage hoặc mặc định là 'dark'
    const savedTheme = localStorage.getItem('ww-theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // Áp dụng theme vào thẻ html
    document.documentElement.setAttribute('data-ww-theme', theme);
    localStorage.setItem('ww-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggleTheme };
};