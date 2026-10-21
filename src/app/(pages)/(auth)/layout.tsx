const AuthLayout = ({ children }: LayoutProps<'/'>) => (
  <main className="flex flex-1 items-center justify-center bg-background px-4 py-12">
    <div className="w-full max-w-md">{children}</div>
  </main>
)

export default AuthLayout
