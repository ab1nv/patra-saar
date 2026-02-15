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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      router.push(`/chat/${res.data.id}`)
      setSidebarOpen(false)
    } catch (err) {
      console.error('Failed to create chat:', err)
    }
  }

  return (
    <div className={styles.appShell}>
      {/* Mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarLogo}>PatraSaar</span>
          <button className={styles.newChatButton} onClick={createChat}>
            + New
          </button>
        </div>

        <nav className={styles.chatList}>
          {chats.map((chat) => (
            <a
              key={chat.id}
              href={`/chat/${chat.id}`}
              className={styles.chatItem}
              onClick={() => setSidebarOpen(false)}
            >
              {chat.title}
            </a>
          ))}
          {chats.length === 0 && (
            <p className={styles.emptyState}>No chats yet. Start a new one.</p>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <main className={styles.mainContent}>{children}</main>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
    </div>
  )
}
