import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-yellow-300 p-8">
      <div className="border-4 border-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="mb-4 text-5xl font-black uppercase">PlexMesh</h1>
        <p className="mb-8 text-xl font-bold">RF Propagation Analysis Tool</p>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button className="border-2 border-black bg-cyan-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-cyan-500">
              Login
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className="border-2 border-black bg-pink-400 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-500">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
