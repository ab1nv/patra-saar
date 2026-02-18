'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import styles from './chat-layout.module.css'

interface Chat {
  id: string
  title: string
  updated_at: string
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadChats()
  }, [])

  async function loadChats() {
    try {
      const res = await api<{ data: Chat[] }>('/api/chats')
      setChats(res.data)
    } catch {
      // not logged in, redirect
      router.push('/login')
    }
  }

  async function createChat() {
    try {
      const res = await api<{ data: Chat }>('/api/chats', {
        method: 'POST',
        json: {},
      })
      setChats((prev) => [res.data, ...prev])
      router.push(`/chat?id=${res.data.id}`)
      // close sidebar on mobile after creating
      if (window.innerWidth <= 768) setSidebarOpen(false)
    } catch (err) {
      console.error('Failed to create chat:', err)
    }
  }

  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${
          sidebarOpen ? '' : styles.sidebarCollapsed
        } ${sidebarOpen ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.sidebarTop}>
          <button
            className={styles.sidebarToggle}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            {/* Sidebar icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <button
            className={styles.newChatButton}
            onClick={createChat}
            aria-label="New chat"
          >
            {/* Pen/edit icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        <div className={styles.chatListSection}>
          {chats.length > 0 && (
            <div className={styles.chatListLabel}>Your chats</div>
          )}
          {chats.map((chat) => (
            <a
              key={chat.id}
              href={`/chat?id=${chat.id}`}
              className={styles.chatItem}
              onClick={() => {
                if (window.innerWidth <= 768) setSidebarOpen(false)
              }}
            >
              {chat.title}
            </a>
          ))}
          {chats.length === 0 && (
            <p className={styles.emptyState}>No chats yet. Start a new one.</p>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className={styles.mainArea}>
        <div className={styles.mainHeader}>
          {/* Show toggle button when sidebar is collapsed */}
          <button
            className={`${styles.headerToggle} ${!sidebarOpen ? styles.headerToggleVisible : ''}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <span className={styles.headerLogo}>PatraSaar</span>
        </div>

        <main className={styles.mainContent}>{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
