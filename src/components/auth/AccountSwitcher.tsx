import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getRecentEmails } from "@/lib/recentEmails";
import { ChevronDownIcon, ChevronUpIcon, UserIcon } from "lucide-react";

interface AccountSwitcherProps {
  onSelect: (email: string) => void;
  currentEmail?: string;
}

export function AccountSwitcher({
  onSelect,
  currentEmail,
}: AccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const recentEmails = getRecentEmails().filter(
    (e) => e.email !== currentEmail
  );

  if (recentEmails.length === 0) return null;

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm w-full flex items-center justify-center gap-1"
      >
        <span>Not you? Switch account</span>
        {isOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
      </Button>

      {isOpen && (
        <div className="mt-2 space-y-1 border rounded-md p-2 bg-background">
          {recentEmails.map((email) => (
            <button
              key={email.email}
              className="w-full text-left px-3 py-2 rounded-sm text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => {
                onSelect(email.email);
                setIsOpen(false);
              }}
            >
              <UserIcon size={14} className="opacity-70" />
              <span>{email.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
