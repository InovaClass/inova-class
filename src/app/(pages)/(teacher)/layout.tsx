import { AppHeader } from '@/app/components/blocks/app-header'
import { requireRole } from '@/entry/session'

const TeacherLayout = async ({ children }: LayoutProps<'/'>) => {
  const { user } = await requireRole('teacher')

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="flex flex-1 flex-col gap-4 px-4 py-8">{children}</main>
    </>
  )
}

export default TeacherLayout
