import { useEffect } from 'react';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';

export function FrontChatWidget() {
  const { isFeatureEnabled } = useCompanyFeatures();
  const isFrontChatEnabled = isFeatureEnabled('front_chat');

  useEffect(() => {
    if (!isFrontChatEnabled) return;

    // Check if script is already loaded
    if (document.getElementById('front-chat-script')) return;

    // Load Front chat script
    const script = document.createElement('script');
    script.id = 'front-chat-script';
    script.src = 'https://chat-assets.frontapp.com/v1/chat.bundle.js';
    script.async = true;

    script.onload = () => {
      // Initialize Front chat after script loads
      if (window.FrontChat) {
        window.FrontChat('init', {
          chatId: 'ab1d3dfe626b58e8af2b7d4b4e4b5cfa',
          useDefaultLauncher: true
        });
      }
    };

    document.body.appendChild(script);

    // Cleanup function
    return () => {
      const existingScript = document.getElementById('front-chat-script');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Destroy Front chat instance if it exists
      if (window.FrontChat) {
        try {
          window.FrontChat('shutdown');
        } catch (error) {
          console.error('Error shutting down Front chat:', error);
        }
      }
    };
  }, [isFrontChatEnabled]);

  return null;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    FrontChat?: (command: string, options?: any) => void;
  }
}
