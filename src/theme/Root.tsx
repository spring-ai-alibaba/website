import React from 'react';
import PineconeFloatingSearch from '../components/PineconeFloatingSearch';

interface RootProps {
  children: React.ReactNode;
}

export default function Root({ children }: RootProps) {
  return (
    <>
      {children}
      <PineconeFloatingSearch />
    </>
  );
}
