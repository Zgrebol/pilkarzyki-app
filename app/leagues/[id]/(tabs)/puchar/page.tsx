import { Card } from '@/app/components/ui/Card'
import { TrophyIcon } from '@heroicons/react/24/outline'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PucharPage({ params: _ }: Props) {
  return (
    <Card className="p-8 text-center">
      <TrophyIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" />
      <h2 className="text-xl font-semibold mb-2">Puchar Piłkarzyków</h2>
      <p className="text-gray-400 text-sm">Ta funkcja jest w przygotowaniu.</p>
    </Card>
  )
}
