'use client';

import { FileUpload } from '@/components/FileUpload';
import { DocumentViewer } from '@/components/DocumentViewer';
import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { useDocumentStore } from '@/stores/useDocumentStore';
import Image from 'next/image';

export default function Home() {
  const { documentId } = useDocumentStore();

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <BackgroundAnimation />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Image 
                src="/assets/logo.png" 
                alt="PatraSaar Logo" 
                width={32} 
                height={32}
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold text-gray-900">PatraSaar</h1>
            </div>
            <p className="text-sm text-gray-600">
              Simplifying Indian Legal Documents
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!documentId ? (
          <div className="text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Upload Your Legal Document
              </h2>
              <p className="text-gray-600 mb-8">
                Get clear, simple explanations of complex legal jargon in your documents
              </p>
              <FileUpload />
            </div>
          </div>
        ) : (
          <DocumentViewer />
        )}
      </main>
    </div>
  );
}