export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvOrWarn } = await import('@/lib/env')
    validateEnvOrWarn()
  }
}
