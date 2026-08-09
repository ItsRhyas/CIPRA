'use client';

import React from 'react';

export interface EmptyStateProps {
  children: React.ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-ci-rule bg-ci-bg/60">
      <p className="font-body text-sm tracking-precise text-ci-muted">{children}</p>
    </div>
  );
}
