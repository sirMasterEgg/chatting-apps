import type { User } from '@shared/types';
import { Icon } from '@/components/ui/Icon';

interface UserListProps {
  users: User[];
  selfUsername: string;
}

export function UserList({ users, selfUsername }: UserListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-frame px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
        <Icon name="users" className="h-4 w-4" />
        <span>Online ({users.length})</span>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {users.map((user) => {
          const isSelf = user.username.toLowerCase() === selfUsername.toLowerCase();
          return (
            <li key={user.id} className="flex items-center gap-2 rounded-[14px] px-2 py-1.5 font-sans text-sm text-white">
              <span className="h-2 w-2 flex-none rounded-full bg-mint" aria-hidden="true" />
              <span className="truncate">{user.username}</span>
              {isSelf && (
                <span className="flex-none font-mono text-[9px] uppercase tracking-[1px] text-muted">(kamu)</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
