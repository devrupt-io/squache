'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import DomainsTable from '@/components/DomainsTable';

function DomainsContent() {
  const { token } = useAuth();

  return (
    <AppLayout>
      <DomainsTable token={token} />
    </AppLayout>
  );
}

export default function DomainsPage() {
  return (
    <ProtectedRoute>
      <DomainsContent />
    </ProtectedRoute>
  );
}
