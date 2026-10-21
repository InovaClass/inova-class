// Adapted from 8bitcn's login-form block (MIT, https://www.8bitcn.com/docs/blocks/authentication/login-form)
import type { ReactNode } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  CardContent,
  CardDescription,
  CardTitle
} from '@/app/components/ui/shadcn/card'

type FormCardProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export const FormCard = ({
  title,
  description,
  children,
  footer
}: FormCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h1 className="text-lg leading-relaxed">{title}</h1>
      </CardTitle>
      <CardDescription className="text-xs leading-relaxed">
        {description}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {children}
      {footer && (
        <div className="mt-6 flex flex-col items-center gap-3 text-center text-xs leading-relaxed">
          {footer}
        </div>
      )}
    </CardContent>
  </Card>
)
