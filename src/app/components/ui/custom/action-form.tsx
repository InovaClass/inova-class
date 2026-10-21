'use client'

import {
  type ComponentProps,
  type ComponentType,
  createContext,
  type ReactNode,
  use
} from 'react'

import { FormField } from '@/app/components/ui/custom/form-field'

// Only what fieldProps reads, so any text field fits whatever the form's validator types are
export type TextFieldApi = {
  name: string
  state: { value: unknown; meta: { errors: unknown[]; isBlurred: boolean } }
  handleChange: (value: string) => void
  handleBlur: () => void
}

type BoundFieldProps = Pick<
  ComponentProps<typeof FormField>,
  'name' | 'value' | 'error' | 'onChange' | 'onBlur'
>

export type ActionFormFields = {
  Field: ComponentType<{
    name: string
    children: (field: TextFieldApi) => ReactNode
  }>
  fieldProps: (field: TextFieldApi) => BoundFieldProps
}

export type ActionFieldProps<TName extends string = string> = Omit<
  ComponentProps<typeof FormField>,
  keyof BoundFieldProps | 'defaultValue'
> & { name: TName }

const ActionFormContext = createContext<ActionFormFields | undefined>(undefined)

// Declared once at module level and fed through context: a component created inside the hook
// would get a new identity on every render and remount its input on each keystroke
export const ActionForm = ({
  fields,
  ...props
}: ComponentProps<'form'> & { fields: ActionFormFields }) => (
  <ActionFormContext value={fields}>
    <form {...props} />
  </ActionFormContext>
)

export const ActionField = ({ name, ...props }: ActionFieldProps) => {
  const fields = use(ActionFormContext)
  if (!fields) throw new Error('ActionField must be rendered inside ActionForm')
  const { Field, fieldProps } = fields

  return (
    <Field name={name}>
      {(field) => <FormField {...props} {...fieldProps(field)} />}
    </Field>
  )
}
