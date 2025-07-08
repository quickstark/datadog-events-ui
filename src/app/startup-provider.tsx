import { performStartupCheck } from '@/lib/storage/startup-check'

export default async function StartupProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Run startup check on server side
  if (typeof window === 'undefined') {
    await performStartupCheck()
  }

  return <>{children}</>
}