export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight">
            Called<span className="text-primary">It</span>
          </h1>
        </div>
        {children}
      </div>
    </main>
  )
}
