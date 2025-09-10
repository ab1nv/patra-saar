'use client';

import { FileUpload } from '@/components/FileUpload';
import { DocumentViewer } from '@/components/DocumentViewer';
import MetaballBackground from '@/components/MetaballBackground';
import { useDocumentStore } from '@/stores/useDocumentStore';
import Image from 'next/image';

export default function Home() {
  const { documentId } = useDocumentStore();

  return (
    <>
  {/* Metaball Background */}
  <MetaballBackground className="fixed inset-0 w-screen h-screen z-0" />
      
      {/* Content overlay */}
      <div className="min-h-screen relative z-10">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
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
                <h1 className="text-2xl font-bold text-white">PatraSaar</h1>
              </div>
              <p className="text-sm text-white/80">
                Simplifying Indian Legal Documents
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!documentId ? (
            <div className="text-center">
              <div className="max-w-md mx-auto bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-white/10">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Upload Your Legal Document
                </h2>
                <p className="text-white/80 mb-8">
                  Get clear, simple explanations of complex legal jargon in your documents
                </p>
                <FileUpload />
              </div>
            </div>
          ) : (
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <DocumentViewer />
            </div>
          )}
      </main>
      </div>
    </>
  );
}