import { Spinner } from '@/app/components/ui/8bit/spinner'

const Loading = () => (
  <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
    <Spinner className="size-8" />
  </main>
)

export default Loading
