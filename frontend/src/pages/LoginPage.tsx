import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Smartphone, Refrigerator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

interface LoginLocationState {
  from?: string;
}

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LoginLocationState | null)?.from ?? '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!phone.trim() || !code.trim()) {
      setError('请输入手机号和验证码');
      return;
    }

    try {
      await login({ phone: phone.trim(), code: code.trim() });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('登录失败:', err);
      const message = err instanceof Error ? err.message : '登录失败，请稍后重试';
      setError(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-mt-gray-50">
      <div className="mt-gradient-header px-6 pb-16 pt-12">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-card">
              <Refrigerator className="h-7 w-7 text-mt-orange" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-mt-text">智能云冰箱</h1>
              <p className="text-sm text-mt-text-secondary">美团内部 · 食材管理助手</p>
            </div>
          </div>
          <p className="text-sm text-mt-text/80">
            拍照识食材 · 智能推菜谱 · 一键美团补购
          </p>
        </div>
      </div>

      <div className="relative -mt-8 flex flex-1 justify-center px-4 pb-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
          <h2 className="mb-1 text-lg font-bold text-mt-text">手机号登录</h2>
          <p className="mb-6 text-sm text-mt-text-secondary">验证码登录，安全便捷</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-mt-text">手机号</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mt-text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入11位手机号"
                  className="mt-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-mt-text">验证码</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                className="mt-input"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-mt-red">{error}</p>
            )}

            <Button type="submit" fullWidth size="lg" disabled={isLoading}>
              {isLoading ? '登录中...' : '立即登录'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-mt-text-muted">
            开发模式下任意手机号与验证码均可登录
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
