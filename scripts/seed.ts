import { hashPassword } from '../src/lib/auth/password'
import { createUser, findUserByEmail } from '../src/lib/db/store'

try {
  process.loadEnvFile('.env')
} catch {
  // .env is optional; fall back to real environment variables.
}

async function main() {
  const email = (process.env.DEMO_USER_EMAIL ?? 'abhinav@test.com').toLowerCase()
  const password = process.env.DEMO_USER_PASSWORD ?? 'abhinav'

  const existing = await findUserByEmail(email)
  if (existing) {
    console.log(`Demo user already exists: ${email}`)
    return
  }

  await createUser(email, hashPassword(password))
  console.log(`Seeded demo user: ${email} / ${password}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
