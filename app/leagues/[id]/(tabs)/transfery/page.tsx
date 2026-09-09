import { Card } from '@/app/components/ui/card'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TransferyPage({ params: _ }: Props) {
  return (
    <Card className="p-8 text-center">
      <ArrowsRightLeftIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" />
      <h2 className="text-xl font-semibold mb-2">Transfery</h2>
      <p className="text-gray-400 text-sm">Ta funkcja jest w przygotowaniu.</p>
    </Card>
  )
}
