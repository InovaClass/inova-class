'use client'

// Ported from 8bitcn's toast (MIT, https://www.8bitcn.com/docs/components/toast) onto Base UI's Toast
import { Toast } from '@base-ui/react/toast'
import type { ReactNode } from 'react'

import { Button } from './button'

const ToastList = () => {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      // Nothing moves with the finger, so a swipe would take the undo away without warning
      swipeDirection={[]}
      className="pixel-border bg-background p-4 retro transition-opacity duration-150 data-ending-style:opacity-0 data-limited:hidden data-starting-style:opacity-0 motion-reduce:transition-none"
    >
      <Toast.Content className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-2">
          <Toast.Title className="text-xs leading-relaxed wrap-anywhere" />
          <Toast.Description className="text-xs leading-relaxed text-muted-foreground" />
        </div>
        {toast.actionProps && (
          <div className="p-1.5">
            <Toast.Action render={<Button variant="outline" />} />
          </div>
        )}
      </Toast.Content>
    </Toast.Root>
  ))
}

const ToastProvider = ({ children }: { children: ReactNode }) => (
  <Toast.Provider>
    {children}
    <Toast.Portal>
      {/* Above the bottom bar of the screens that have one */}
      <Toast.Viewport className="fixed right-6 bottom-28 z-50 flex w-[calc(100vw-3rem)] flex-col gap-6 sm:w-md">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>
)

const useToast = Toast.useToastManager

export { ToastProvider, useToast }
