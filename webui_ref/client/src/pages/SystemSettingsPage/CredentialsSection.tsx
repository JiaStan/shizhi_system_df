import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  LogInIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  RefreshCwIcon,
  SaveIcon,
  KeyRoundIcon,
  CookieIcon,
  EyeIcon,
  EyeOffIcon,
  ClockIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

/* ─── 常量 & Schema ────────────────────────────────────── */

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});
type ILoginForm = z.infer<typeof loginSchema>;

const credSchema = z.object({
  authorization: z.string().min(1, '请输入 Authorization'),
  cookie: z.string().min(1, '请输入 Cookie'),
});
type ICredForm = z.infer<typeof credSchema>;

type IValidity = 'valid' | 'invalid' | null;

/* ─── 凭证管理 Section ──────────────────────────────────── */

export default function CredentialsSection() {
  /* ── 登录表单 ── */
  const loginForm = useForm<ILoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  /* ── 手动凭证表单 ── */
  const credForm = useForm<ICredForm>({
    resolver: zodResolver(credSchema),
    defaultValues: { authorization: '', cookie: '' },
  });

  /* ── 状态 ── */
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginValidity, setLoginValidity] = useState<IValidity>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [credValidity, setCredValidity] = useState<IValidity>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showCookie, setShowCookie] = useState(false);
  const [storedCreds, setStoredCreds] = useState<{
    authorization: string;
    cookie: string;
    lastUpdated: string;
  } | null>(null);

  /* ── 初始化读取 sessionStorage ── */
  useEffect(() => {
    const raw = sessionStorage.getItem('__global_dfmc_credentials');
    if (raw) {
      try {
        setStoredCreds(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  /* ── 登录获取凭证（待后端对接） ── */
  const handleLogin = async (_data: ILoginForm) => {
    toast.info('后端接口未对接，登录功能待接入');
  };

  /* ── 手动保存凭证（待后端对接） ── */
  const handleSave = async (_data: ICredForm) => {
    toast.info('后端接口未对接，保存功能待接入');
  };

  /* ── 验证凭证有效性（待后端对接） ── */
  const handleVerify = async () => {
    toast.info('后端接口未对接，验证功能待接入');
  };

  /* ── 工具函数 ── */
  const truncate = (s: string, max = 40) =>
    s.length > max ? s.slice(0, max) + '…' : s;

  /* ── 渲染 ── */
  return (
    <section className="w-full space-y-6">
      <div className="flex items-center gap-2">
        <KeyRoundIcon className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">
          爬虫凭证管理
        </h2>
      </div>

      {/* ─── 自动获取（模拟登录） ─── */}
      <Card className="rounded-sm border border-border border-t-2 border-t-[hsl(210_60%_48%)]">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-[hsl(210_55%_95%)]">
                <LogInIcon className="size-4 text-[hsl(210_55%_25%)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  自动获取
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  模拟登录 di360.dfmc.com.cn 获取 Authorization 和 Cookie
                </p>
              </div>
            </div>

            {loginValidity && (
              <Badge
                variant={loginValidity === 'valid' ? 'default' : 'destructive'}
                className={`rounded-full text-xs font-medium ${
                  loginValidity === 'valid'
                    ? 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border border-[hsl(152_55%_40%)]'
                    : ''
                }`}
              >
                {loginValidity === 'valid' ? (
                  <>
                    <CheckCircleIcon className="size-3 mr-1" />
                    获取成功
                  </>
                ) : (
                  <>
                    <XCircleIcon className="size-3 mr-1" />
                    获取失败
                  </>
                )}
              </Badge>
            )}
          </div>

          {/* Login Form */}
          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-username"
                  className="text-xs font-medium text-foreground"
                >
                  用户名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="login-username"
                  placeholder="请输入 di360 用户名"
                  {...loginForm.register('username')}
                />
                {loginForm.formState.errors.username && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="text-xs font-medium text-foreground"
                >
                  密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="请输入密码"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={loginLoading}
                className="gap-1.5"
              >
                <LogInIcon
                  className={`size-3.5 ${loginLoading ? 'animate-spin' : ''}`}
                />
                {loginLoading ? '登录中...' : '登录获取凭证'}
              </Button>
              <p className="text-xs text-muted-foreground">
                凭证有效期约 24 小时，过期后需重新获取
              </p>
            </div>
          </form>
        </div>
      </Card>

      {/* ─── 手动更新 ─── */}
      <Card className="rounded-sm border border-border border-t-2 border-t-[hsl(152_55%_40%)]">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-[hsl(152_45%_95%)]">
              <RefreshCwIcon className="size-4 text-[hsl(152_60%_22%)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                手动更新
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                手动粘贴 Authorization 和 Cookie 值，适用于自动获取失败的场景
              </p>
            </div>
          </div>

          {/* Credential Form */}
          <form
            onSubmit={credForm.handleSubmit(handleSave)}
            className="space-y-4"
          >
            {/* Authorization */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="cred-auth"
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                >
                  <KeyRoundIcon className="size-3 text-muted-foreground" />
                  NEW_AUTHORIZATION{' '}
                  <span className="text-destructive">*</span>
                </Label>
                {storedCreds?.authorization && (
                  <button
                    type="button"
                    onClick={() => setShowAuth(!showAuth)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAuth ? (
                      <EyeOffIcon className="size-3.5" />
                    ) : (
                      <EyeIcon className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
              <Controller
                name="authorization"
                control={credForm.control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="cred-auth"
                    placeholder="Bearer eyJhbGciOiJIUzI1NiIs..."
                    className="font-mono text-xs min-h-[72px] resize-none"
                    rows={2}
                  />
                )}
              />
              {credForm.formState.errors.authorization && (
                <p className="text-xs text-destructive">
                  {credForm.formState.errors.authorization.message}
                </p>
              )}
            </div>

            {/* Cookie */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="cred-cookie"
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                >
                  <CookieIcon className="size-3 text-muted-foreground" />
                  NEW_COOKIE <span className="text-destructive">*</span>
                </Label>
                {storedCreds?.cookie && (
                  <button
                    type="button"
                    onClick={() => setShowCookie(!showCookie)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCookie ? (
                      <EyeOffIcon className="size-3.5" />
                    ) : (
                      <EyeIcon className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
              <Controller
                name="cookie"
                control={credForm.control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="cred-cookie"
                    placeholder="session_id=xxx; domain=di360.dfmc.com.cn; ..."
                    className="font-mono text-xs min-h-[72px] resize-none"
                    rows={2}
                  />
                )}
              />
              {credForm.formState.errors.cookie && (
                <p className="text-xs text-destructive">
                  {credForm.formState.errors.cookie.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="submit"
                disabled={saveLoading}
                className="gap-1.5"
              >
                <SaveIcon className="size-3.5" />
                {saveLoading ? '保存中...' : '保存凭证'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={verifyLoading || !storedCreds}
                onClick={handleVerify}
                className="gap-1.5"
              >
                <ShieldCheckIcon
                  className={`size-3.5 ${verifyLoading ? 'animate-spin' : ''}`}
                />
                {verifyLoading ? '验证中...' : '验证凭证'}
              </Button>

              {credValidity && (
                <Badge
                  variant={
                    credValidity === 'valid' ? 'default' : 'destructive'
                  }
                  className={`rounded-full text-xs font-medium ${
                    credValidity === 'valid'
                      ? 'bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border border-[hsl(152_55%_40%)]'
                      : ''
                  }`}
                >
                  {credValidity === 'valid' ? (
                    <>
                      <ShieldCheckIcon className="size-3 mr-1" />
                      凭证有效
                    </>
                  ) : (
                    <>
                      <ShieldAlertIcon className="size-3 mr-1" />
                      凭证无效
                    </>
                  )}
                </Badge>
              )}
            </div>
          </form>
        </div>
      </Card>

      {/* ─── 当前凭证状态 ─── */}
      {storedCreds && (
        <Card className="rounded-sm border border-border">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="size-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                当前凭证状态
              </h3>
            </div>

            <div className="space-y-3">
              {/* 上次更新 */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground w-28 shrink-0">
                  上次更新
                </span>
                <span className="font-mono text-foreground">
                  {storedCreds.lastUpdated}
                </span>
              </div>

              {/* Authorization */}
              <div className="flex items-start gap-4 text-xs">
                <span className="text-muted-foreground w-28 shrink-0 pt-0.5">
                  Authorization
                </span>
                <span className="font-mono text-foreground bg-accent/50 rounded-sm px-2.5 py-1.5 break-all flex-1 min-w-0">
                  {showAuth
                    ? storedCreds.authorization
                    : truncate(storedCreds.authorization, 60)}
                </span>
              </div>

              {/* Cookie */}
              <div className="flex items-start gap-4 text-xs">
                <span className="text-muted-foreground w-28 shrink-0 pt-0.5">
                  Cookie
                </span>
                <span className="font-mono text-foreground bg-accent/50 rounded-sm px-2.5 py-1.5 break-all flex-1 min-w-0">
                  {showCookie
                    ? storedCreds.cookie
                    : truncate(storedCreds.cookie, 60)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
