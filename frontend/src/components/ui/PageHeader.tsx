import { Link } from 'react-router-dom';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

const PageHeader = ({ title, subtitle, backTo, backLabel, action, icon: Icon }: PageHeaderProps) => (
  <div className="mb-4">
    {backTo && (
      <Link
        to={backTo}
        className="mb-3 inline-flex items-center gap-1 text-sm text-mt-text-secondary transition-colors hover:text-mt-text"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{backLabel ?? '返回'}</span>
      </Link>
    )}
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mt-yellow/20">
            <Icon className="h-5 w-5 text-mt-orange" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-mt-text">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-mt-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  </div>
);

export default PageHeader;
