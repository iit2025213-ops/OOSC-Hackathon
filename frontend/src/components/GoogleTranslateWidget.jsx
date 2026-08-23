import React, { useEffect, useRef, memo } from 'react';

const GoogleTranslateWidget = memo(() => {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize the widget once
    if (!isInitialized.current && window.google && window.google.translate) {
      isInitialized.current = true;
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,ta,te,bn,mr,gu,ur,kn,ml,pa',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
      } catch (e) {
        console.error("Google Translate error:", e);
      }
    }
  }, []);

  return <div id="google_translate_element" className="-ml-1 mt-0.5"></div>;
});

export default GoogleTranslateWidget;
