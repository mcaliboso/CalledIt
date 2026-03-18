import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight">
            Called<span className="text-primary">It</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Social betting with your friend group.
          </p>
          <p className="text-sm text-muted-foreground">
            Wager virtual points on sports and custom events. No real money, all the fun.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Virtual points only. No real money involved.
        </p>
      </div>
    </main>
  )
}
