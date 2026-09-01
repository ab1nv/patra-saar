export interface User {
  id: string
  googleId: string
  email: string
  name: string
  pictureUrl?: string
  plan: 'free' | 'professional' | 'enterprise'
  createdAt: number
  updatedAt: number
}
