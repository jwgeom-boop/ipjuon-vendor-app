import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: ReactNode;
};

export function PageHeader({ title, onBack, showBack = true, right }: PageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };
  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border safe-top">
      <div className="flex items-center justify-between h-12 px-2">
        <div className="flex items-center gap-1 min-w-[44px]">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -m-2 text-foreground"
              aria-label="뒤로"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>
        <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
        <div className="flex items-center justify-end min-w-[44px]">{right}</div>
      </div>
    </header>
  );
}
