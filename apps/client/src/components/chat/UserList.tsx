import type { User } from '@shared/types';
import { Icon } from '@/components/ui/Icon';

interface UserListProps {
  users: User[];
  selfUsername: string;
}

export function UserList({ users, selfUsername }: UserListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
        <Icon name="users" className="h-4 w-4" />
        <span>Online ({users.length})</span>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {users.map((user) => {
          const isSelf = user.username.toLowerCase() === selfUsername.toLowerCase();
          return (
            <li key={user.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200">
              <span className="h-2 w-2 flex-none rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="truncate">{user.username}</span>
              {isSelf && <span className="flex-none text-xs text-slate-500">(kamu)</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
