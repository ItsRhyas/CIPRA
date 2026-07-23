'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useT } from '@/lib/i18n/useT';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export interface ImageDropzoneProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export function ImageDropzone({ onSelect, disabled = false }: ImageDropzoneProps) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (candidate: File): string | null => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      return 'unsupported type';
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      return 'file too large';
    }
    return null;
  };

  const handleFile = useCallback(
    (candidate: File) => {
      const validationError = validateFile(candidate);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setError(null);
      setFile(candidate);
      onSelect(candidate);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onSelect]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) {
        handleFile(dropped);
      }
    },
    [disabled, handleFile]
  );

  const onClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleFile(selected);
      }
    },
    [handleFile]
  );

  return (
    <div className="space-y-2">
      <div
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          'rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          isDragOver
            ? 'border-ci-accent bg-ci-accent-subtle'
            : 'border-ci-rule hover:border-ci-rule-strong',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ].join(' ')}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onChange}
          className="hidden"
          disabled={disabled}
        />
        {disabled ? (
          file ? (
            <div>
              <p className="font-body text-sm font-medium text-ci-text">{file.name}</p>
              <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <p className="font-body text-sm text-ci-muted">{t('dropzone.uploading')}</p>
          )
        ) : file ? (
          <div>
            <p className="font-body text-sm font-medium text-ci-text">{file.name}</p>
            <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="font-body text-sm font-medium text-ci-text">
              {t('dropzone.empty')}
            </p>
            <p className="mt-1 font-body text-xs tracking-precise text-ci-muted">
              {t('dropzone.formats')}
            </p>
          </div>
        )}
      </div>
      {error && (
        <p
          className="rounded-md bg-ci-danger-bg px-2 py-1.5 font-body text-xs text-ci-danger"
          role="alert"
        >
          {error === 'unsupported type'
            ? t('dropzone.error.type')
            : t('dropzone.error.size')}
        </p>
      )}
    </div>
  );
}
