export default function NewChatPage() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-4)',
          }}
        >
          PatraSaar
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
          Create a new chat from the sidebar, or select an existing conversation.
        </p>
      </div>
    </div>
  )
}
