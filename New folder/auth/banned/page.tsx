import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Ban } from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'

export default function BannedPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
          <Ban className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-2xl">Account suspended</CardTitle>
        <CardDescription>
          Your account has been suspended by an administrator. Contact support if you believe this is a mistake.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignOutButton className="w-full" />
      </CardContent>
    </Card>
  )
}
