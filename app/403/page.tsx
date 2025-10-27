export default function ForbiddenPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">403</h1>
        <p className="text-lg text-gray-600">No tienes permiso para acceder a esta página.</p>
      </div>
    </div>
  );
}
