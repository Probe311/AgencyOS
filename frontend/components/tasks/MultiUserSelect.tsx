import React, { useState, useRef, useEffect } from 'react';
import { Users, X, ChevronDown } from 'lucide-react';
import { User } from '../../types';

interface MultiUserSelectProps {
  users: User[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const MultiUserSelect: React.FC<MultiUserSelectProps> = ({
  users,
  selectedUserIds,
  onChange,
  label,
  placeholder = 'Sélectionner des utilisateurs...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
  const availableUsers = users.filter(u => !selectedUserIds.includes(u.id));

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedUserIds.filter(id => id !== userId));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-500"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedUsers.length === 0 ? (
              <span className="text-slate-400 text-sm">{placeholder}</span>
            ) : (
              <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-1 rounded-md flex-shrink-0"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {user.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => removeUser(user.id, e)}
                      className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-all duration-500 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto custom-scrollbar">
            {availableUsers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 text-center">
                Tous les utilisateurs sont sélectionnés
              </div>
            ) : (
              availableUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-all duration-500"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-200">
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

