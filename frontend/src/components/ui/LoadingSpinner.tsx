interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-[3px]',
  lg: 'h-12 w-12 border-[3px]',
};

const LoadingSpinner = ({ text = '加载中...', size = 'lg' }: LoadingSpinnerProps) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center">
    <div
      className={`${sizeMap[size]} animate-spin rounded-full border-mt-yellow border-t-transparent`}
    />
    {text && <p className="mt-4 text-sm text-mt-text-secondary">{text}</p>}
  </div>
);

export default LoadingSpinner;
