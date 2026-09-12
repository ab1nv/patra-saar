import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

const SLIDES_URL =
  'https://docs.google.com/presentation/d/1VQ5b7dM5oLITqzzztjpJQ1HaI_a3E5WifxjLqKkRcBw/edit?usp=sharing'

export function GET() {
  redirect(SLIDES_URL)
}
