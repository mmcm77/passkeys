import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getRecentEmails,
  removeRecentEmail,
  RECENT_EMAILS_UPDATED,
  getDebugLogs,
} from "@/lib/recentEmails";
import { User, XCircle, Loader2, Bug } from "lucide-react";

interface RecentEmailsProps {
  onSelect: (email: string) => void;
}

export function RecentEmails({ onSelect }: RecentEmailsProps) {
  const [recentEmails, setRecentEmails] = useState<
    Array<{ email: string; lastUsed: number }>
  >([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);

  useEffect(() => {
    // Load initial emails
    setRecentEmails(getRecentEmails());
    setDebugLogs(getDebugLogs());

    // Listen for updates to recent emails
    const handleEmailsUpdated = () => {
      setRecentEmails(getRecentEmails());
      setDebugLogs(getDebugLogs());
    };

    window.addEventListener(RECENT_EMAILS_UPDATED, handleEmailsUpdated);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener(RECENT_EMAILS_UPDATED, handleEmailsUpdated);
    };
  }, []);

  const handleRemove = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentEmail(email);
  };

  const handleSelect = (email: string) => {
    setSelectedEmail(email);
    onSelect(email);
  };

  if (recentEmails.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Recent emails:</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => setShowDebug(!showDebug)}
        >
          <Bug className="h-3 w-3" />
        </Button>
      </div>

      {showDebug && (
        <div className="bg-muted/50 rounded-lg p-2 mb-2 text-xs overflow-auto max-h-40">
          <p className="font-medium mb-1">Debug Logs:</p>
          {debugLogs.map((log, i) => (
            <div key={i} className="mb-1">
              <span className="text-muted-foreground">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {" - "}
              <span className="font-medium">{log.action}</span>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {recentEmails.map(({ email, lastUsed }) => (
          <div
            key={email}
            onClick={() => handleSelect(email)}
            className={`group flex items-center gap-3 p-2 rounded-lg border bg-card transition-colors cursor-pointer
              ${
                selectedEmail === email
                  ? "bg-primary/10 border-primary/20"
                  : "hover:bg-accent/50"
              }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(email);
              }
            }}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              {selectedEmail === email ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{email}</p>
              <p className="text-xs text-muted-foreground">
                Last used: {new Date(lastUsed).toLocaleDateString()}
              </p>
            </div>
            {selectedEmail !== email && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleRemove(email, e)}
                aria-label={`Remove ${email}`}
              >
                <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
