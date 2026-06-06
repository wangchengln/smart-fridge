import { ArrowLeft, Search } from 'lucide-react';

interface TakeoutSearchHeaderProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onBack: () => void;
}

const TakeoutSearchHeader = ({
  value,
  placeholder = '搜索附近商家或菜品',
  onChange,
  onSearch,
  onBack,
}: TakeoutSearchHeaderProps) => (
  <div className="sticky top-0 z-30 bg-white px-3 pb-2 pt-2 shadow-sm">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mt-gray-50"
      >
        <ArrowLeft className="h-4 w-4 text-mt-text" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-mt-gray-50 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-mt-text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-mt-text outline-none placeholder:text-mt-text-muted"
        />
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="shrink-0 rounded-full bg-mt-yellow px-3 py-1.5 text-xs font-bold text-mt-text"
      >
        搜索
      </button>
    </div>
  </div>
);

export default TakeoutSearchHeader;
