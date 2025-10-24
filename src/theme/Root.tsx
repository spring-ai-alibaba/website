import React, { useEffect, useState } from 'react';
import PineconeFloatingSearch from '../components/PineconeFloatingSearch';
import DocNeuralBackground from '../components/DocNeuralBackground';

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps) {
  const [isDocPage, setIsDocPage] = useState(false);

  useEffect(() => {
    // Check if we're on a documentation page
    const checkPath = () => {
      const path = window.location.pathname;
      const isDoc = path.startsWith('/docs') ||
                    path.startsWith('/en/docs') ||
                    path.startsWith('/blog') ||
                    path.startsWith('/en/blog') ||
                    path.startsWith('/community') ||
                    path.startsWith('/en/community');
      setIsDocPage(isDoc);
    };

    checkPath();

    // Listen for route changes
    const handleLocationChange = () => {
      checkPath();
    };

    window.addEventListener('popstate', handleLocationChange);

    // Also check on navigation using MutationObserver
    const observer = new MutationObserver(() => {
      checkPath();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {isDocPage && <DocNeuralBackground />}
      {children}
      <PineconeFloatingSearch />
    </>
  );
}
