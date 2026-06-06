import { cn } from '../../lib/utils';

interface MeituanCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
  id?: string;
}

const MeituanCard = ({ children, className, padding = true, onClick, id }: MeituanCardProps) => {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      id={id}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-white shadow-sm',
        padding && 'p-4',
        onClick && 'w-full text-left transition-transform active:scale-[0.98]',
        className
      )}
    >
      {children}
    </Comp>
  );
};

export default MeituanCard;
