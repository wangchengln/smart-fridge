export type PremadeChannelTab = 'all' | 'xiaoxiang' | 'convenience_flash';

const tabs: { id: PremadeChannelTab; label: string; emoji: string }[] = [
  { id: 'all', label: '全部', emoji: '📋' },
  { id: 'xiaoxiang', label: '小象鲜食', emoji: '🐘' },
  { id: 'convenience_flash', label: '便利店', emoji: '🏪' },
];

interface PremadeChannelTabsProps {
  activeTab: PremadeChannelTab;
  onTabChange: (tab: PremadeChannelTab) => void;
}

const PremadeChannelTabs = ({ activeTab, onTabChange }: PremadeChannelTabsProps) => (
  <div className="flex gap-2 overflow-x-auto bg-white px-4 py-2 scrollbar-hide">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onTabChange(tab.id)}
        className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
          activeTab === tab.id
            ? 'bg-violet-500 text-white shadow-sm'
            : 'bg-mt-gray-50 text-mt-text-secondary'
        }`}
      >
        {tab.emoji} {tab.label}
      </button>
    ))}
  </div>
);

export default PremadeChannelTabs;
