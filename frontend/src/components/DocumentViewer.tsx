'use client';

import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/stores/useDocumentStore';
import { ChatInterface } from '@/components/ChatInterface';
import { FileText, RotateCcw, Loader2 } from 'lucide-react';

export function DocumentViewer() {
  const { 
    filename, 
    rawText, 
    summary, 
    status, 
    clearDocument, 
    pollDocumentStatus 
  } = useDocumentStore();

  // Poll for document status updates
  useEffect(() => {
    if (status === 'PENDING' || status === 'PROCESSING') {
      const interval = setInterval(() => {
        pollDocumentStatus();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [status, pollDocumentStatus]);

  const handleNewDocument = () => {
    clearDocument();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
      {/* Left Column - Document Text */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {filename}
            </h3>
          </div>
          <Button
            onClick={handleNewDocument}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>New Document</span>
          </Button>
        </div>
        
        <Textarea
          value={rawText}
          readOnly
          className="h-full min-h-[500px] resize-none font-mono text-sm"
          placeholder="Document text will appear here..."
        />
      </div>

      {/* Right Column - Summary and Q&A */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Tabs defaultValue="summary" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="qa">Q&A Chat</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="flex-1 p-6 pt-4">
            <div className="h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Document Summary
              </h3>
              
              {status === 'PENDING' || status === 'PROCESSING' ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">
                      {status === 'PENDING' ? 'Preparing to generate summary...' : 'Generating summary...'}
                    </p>
                  </div>
                </div>
              ) : status === 'COMPLETED' && summary ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                </div>
              ) : status === 'FAILED' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">
                    Failed to generate summary. Please try uploading the document again.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600">
                    Summary will appear here once processing is complete.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="qa" className="flex-1 p-6 pt-4">
            <ChatInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}