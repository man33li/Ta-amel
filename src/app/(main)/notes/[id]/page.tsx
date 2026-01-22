export default function NotePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Note: {params.id}</h1>
    </div>
  )
}
