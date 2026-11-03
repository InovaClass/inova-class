const LegalLayout = ({ children }: LayoutProps<'/'>) => (
  <main className="flex flex-1 justify-center bg-background px-4 py-12">
    <article className="flex w-full max-w-2xl flex-col gap-6 text-xs leading-relaxed [&_h1]:text-lg [&_h1]:leading-relaxed [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:leading-relaxed [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
      {children}
    </article>
  </main>
)

export default LegalLayout
