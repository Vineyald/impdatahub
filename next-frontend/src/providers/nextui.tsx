'use client'

import {NextUIProvider} from '@nextui-org/react'

export function Providers({children}: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <main className="light">
        {children}
      </main>
    </NextUIProvider>
  )
}