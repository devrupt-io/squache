'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import SettingsPanel from '@/components/SettingsPanel';

function SettingsContent() {
  const { token, user } = useAuth();

  return (
    <AppLayout>
      <SettingsPanel token={token} isAdmin={user?.role === 'admin'} />
    </AppLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
