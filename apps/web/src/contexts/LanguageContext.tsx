'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ar } from '@/locales/ar';
import { en } from '@/locales/en';

type Language = 'ar' | 'en';
type Dictionary = typeof ar;

interface LanguageContextProps {
  language: Language;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedLang = localStorage.getItem('calm_wms_lang') as Language;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      setLanguage(savedLang);
    } else {
      setLanguage('ar');
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      document.documentElement.lang = language;
      document.documentElement.dir = 'ltr'; // Keep HTML LTR to lock the scrollbar on the right
      document.body.dir = language === 'ar' ? 'rtl' : 'ltr'; // Apply RTL to body only
      localStorage.setItem('calm_wms_lang', language);
    }
  }, [language, isMounted]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (keyPath: string): string => {
    const dict = language === 'ar' ? ar : en;
    const keys = keyPath.split('.');
    let result: any = dict;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return keyPath; // fallback to key path if missing
      }
    }
    return typeof result === 'string' ? result : keyPath;
  };

  // Provide default context during SSR to prevent useLanguage from throwing
  const contextValue = {
    language,
    t,
    toggleLanguage
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
