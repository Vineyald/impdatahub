'use client'

import { useEffect } from 'react';
import { checkAndRefreshToken } from '../services/auth';

export default function Home() {
  useEffect(() => {
    checkAndRefreshToken();
  }, []);

  return <div>Conteúdo da Home</div>;
}
