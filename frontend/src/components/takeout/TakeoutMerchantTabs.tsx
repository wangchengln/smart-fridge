export type TakeoutMerchantTab = 'nearby' | 'special';

interface TakeoutMerchantTabsProps {
  activeTab: TakeoutMerchantTab;
  onTabChange: (tab: TakeoutMerchantTab) => void;
}

const TakeoutMerchantTabs = ({ activeTab, onTabChange }: TakeoutMerchantTabsProps) => (
  <div className="flex items-center justify-between border-b border-mt-border/60 bg-white px-4 py-2.5">
    <div className="flex items-center gap-5">
      {(
        [
          { id: 'nearby' as const, label: '附近商家' },
          { id: 'special' as const, label: '特价外卖' },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`relative pb-1 text-sm transition-colors ${
            activeTab === tab.id ? 'font-bold text-mt-text' : 'text-mt-text-secondary'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute -bottom-2.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-mt-yellow" />
          )}
        </button>
      ))}
    </div>
    <button
      type="button"
      className="rounded-full border border-mt-orange px-2.5 py-1 text-[10px] font-medium text-mt-orange"
    >
      一键下单
    </button>
  </div>
);

export default TakeoutMerchantTabs;
