'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import UpstreamsList from '@/components/UpstreamsList';

function UpstreamsContent() {
  const { token, user } = useAuth();

  return (
    <AppLayout>
      <UpstreamsList token={token} isAdmin={user?.role === 'admin'} />
    </AppLayout>
  );
}

export default function UpstreamsPage() {
  return (
    <ProtectedRoute>
      <UpstreamsContent />
    </ProtectedRoute>
  );
}
