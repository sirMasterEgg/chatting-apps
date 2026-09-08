import { useParams } from 'react-router-dom';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-8 py-10 text-center shadow-xl">
        <h1 className="text-2xl font-semibold">Room {roomId}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Room page placeholder — chat UI dibangun di Issue #2.
        </p>
      </div>
    </main>
  );
}
