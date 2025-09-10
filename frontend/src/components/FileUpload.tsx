'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { ErrorModal } from '@/components/ErrorModal';
import { Upload, FileText, Loader2 } from 'lucide-react';

const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const FileUpload: React.FC = () => {
  const { isUploading, error, uploadDocument, setError } = useDocumentStore();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
    }
  }, [error]);

  const handleCloseError = () => {
    setShowErrorModal(false);
    setError(null);
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
    if (!acceptedTypes.includes(file.type)) {
      return 'File type not supported. Please upload a .txt or .pdf file.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 50MB';
    }

    return null;
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      setError({
        message: 'File validation failed',
        details: validationError
      });
      return;
    }

    await uploadDocument(file);
  }, [uploadDocument, setError]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsDragActive(false);
    handleFileUpload(acceptedFiles);
  }, [handleFileUpload]);

  const onDragEnter = useCallback(() => {
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragEnter,
    onDragLeave,
    accept: ACCEPTED_FILE_TYPES,
    multiple: false,
    noClick: true,
    onDropRejected: (fileRejections) => {
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors.some(error => error.code === 'file-invalid-type')) {
          setError({
            message: 'File type not supported',
            details: 'Please upload a .txt or .pdf file.'
          });
        } else if (rejection.errors.some(error => error.code === 'file-too-large')) {
          setError({
            message: 'File size too large',
            details: 'File size must be less than 50MB'
          });
        }
      }
    },
    maxSize: MAX_FILE_SIZE,
    // Disable dropzone during SSR to prevent hydration mismatch
    disabled: !isMounted,
  });

  // Render a simple version during SSR to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 hover:border-gray-400">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
              <Upload className="h-8 w-8 text-gray-600" />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-700">
                Drop your document here
              </p>
              <p className="text-sm text-gray-500">
                or click to browse files
              </p>
            </div>

            <Button variant="outline" className="mt-4" disabled>
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>

            <div className="text-xs text-gray-400 space-y-1">
              <p>Supports: .txt, .pdf, .docx</p>
              <p>Maximum file size: 50MB</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-lg font-medium text-gray-700">Uploading...</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                <Upload className="h-8 w-8 text-gray-600" />
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  Drop your document here
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse files
                </p>
              </div>

              <Button
                onClick={open}
                variant="outline"
                className="mt-4"
                disabled={isUploading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </Button>

              <div className="text-xs text-gray-400 space-y-1">
                <p>Supports: .txt, .pdf</p>
                <p>Maximum file size: 50MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleCloseError}
        title={error?.code ? `Error (${error.code})` : 'Upload Error'}
        message={error?.message || 'An error occurred'}
        details={error?.details}
      />
    </div>
  );
};