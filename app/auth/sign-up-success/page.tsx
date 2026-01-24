import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-yellow-300 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase">Success!</CardTitle>
            <CardDescription className="font-bold">Check your email to confirm</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold text-gray-700">
              You&apos;ve successfully signed up. Please check your email to confirm your account before signing in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
