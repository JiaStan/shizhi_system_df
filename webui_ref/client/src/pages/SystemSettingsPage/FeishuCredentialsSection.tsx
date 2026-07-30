import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  KeyIcon,
  LinkIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircle2Icon,
  XCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STORAGE_KEY = '__global_dfmc_feishu_credentials';

interface ICredentials {
  appId: string;
  appSecret: string;
  sheetToken: string;
  lastUpdated: string;
  isValid: boolean | null;
}

const emptyCredentials: ICredentials = {
  appId: '',
  appSecret: '',
  sheetToken: '',
  lastUpdated: '',
  isValid: null,
};

function loadCredentials(): ICredentials {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...emptyCredentials, ...parsed };
    }
  } catch {
    // ignore
  }
  return emptyCredentials;
}

function saveCredentials(creds: ICredentials) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  } catch {
    // ignore
  }
}

export default function FeishuCredentialsSection() {
  const [credentials, setCredentials] = useState<ICredentials>(loadCredentials);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    saveCredentials(credentials);
  }, [credentials]);

  const handleFieldChange = (field: keyof ICredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({ ...prev, [field]: e.target.value, isValid: null }));
  };

  const handleVerify = async () => {
    if (!credentials.appId || !credentials.appSecret || !credentials.sheetToken) {
      toast.error('请填写完整的凭证信息');
      return;
    }
    toast.info('后端接口未对接，验证功能待接入');
  };

  const handleSave = () => {
    toast.info('后端接口未对接，保存功能待接入');
  };

  const hasCredentials = credentials.appId && credentials.appSecret && credentials.sheetToken;

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <KeyIcon className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground tracking-tight">飞书共享表凭证</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ─── 左侧：凭证录入 ─── */}
        <div className="rounded-sm border border-border bg-card p-5 space-y-5">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-foreground">凭证配置</h4>
            <p className="text-xs text-muted-foreground">
              录入飞书开放平台应用凭证与共享表访问信息
            </p>
          </div>

          {/* App ID */}
          <div className="space-y-2">
            <Label htmlFor="appId" className="text-xs font-medium text-muted-foreground">
              App ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="appId"
              placeholder="cli_xxxxxxxxxxxxxxx"
              value={credentials.appId}
              onChange={handleFieldChange('appId')}
              className="font-mono text-sm"
            />
          </div>

          {/* App Secret */}
          <div className="space-y-2">
            <Label htmlFor="appSecret" className="text-xs font-medium text-muted-foreground">
              App Secret <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="appSecret"
                type={showSecret ? 'text' : 'password'}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={credentials.appSecret}
                onChange={handleFieldChange('appSecret')}
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          {/* Sheet Token */}
          <div className="space-y-2">
            <Label htmlFor="sheetToken" className="text-xs font-medium text-muted-foreground">
              共享表 Token <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="sheetToken"
                type={showToken ? 'text' : 'password'}
                placeholder="https://dfmc.feishu.cn/sheets/xxxxxxxxxxxxxx"
                value={credentials.sheetToken}
                onChange={handleFieldChange('sheetToken')}
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              从飞书共享表 URL 中提取，如：<code className="font-mono text-xs bg-accent px-1 py-0.5 rounded">sheets/abc123</code>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleVerify}
              disabled={isValidating || !hasCredentials}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <RefreshCwIcon className="size-4 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="size-4 mr-2" />
                  验证连接
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!hasCredentials}
            >
              保存凭证
            </Button>
          </div>
        </div>

        {/* ─── 右侧：凭证状态 ─── */}
        <div className="space-y-4">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-sm border border-border bg-card p-5"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              当前凭证状态
            </span>
            <div className="mt-3 space-y-3">
              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                {credentials.isValid === null ? (
                  <>
                    <span className="relative flex size-3 shrink-0">
                      <span className="relative inline-flex size-3 rounded-full bg-[hsl(215_12%_75%)]" />
                    </span>
                    <Badge variant="secondary" className="font-medium">
                      未验证
                    </Badge>
                  </>
                ) : credentials.isValid ? (
                  <>
                    <span className="relative flex size-3 shrink-0">
                      <span className="absolute inset-0 rounded-full bg-[hsl(152_55%_40%)] opacity-40 animate-ping" />
                      <span className="relative inline-flex size-3 rounded-full bg-[hsl(152_55%_40%)]" />
                    </span>
                    <Badge className="bg-[hsl(152_45%_95%)] text-[hsl(152_60%_22%)] border border-[hsl(152_55%_40%)] font-medium">
                      <CheckCircle2Icon className="size-3 mr-1" />
                      有效
                    </Badge>
                  </>
                ) : (
                  <>
                    <span className="relative flex size-3 shrink-0">
                      <span className="relative inline-flex size-3 rounded-full bg-[hsl(4_65%_48%)]" />
                    </span>
                    <Badge className="bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] border border-[hsl(4_65%_48%)] font-medium">
                      <XCircleIcon className="size-3 mr-1" />
                      无效
                    </Badge>
                  </>
                )}
              </div>

              {/* Credentials Preview */}
              {hasCredentials && (
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">App ID</span>
                    <span className="font-mono text-foreground">
                      {credentials.appId.length > 20
                        ? `${credentials.appId.slice(0, 10)}...${credentials.appId.slice(-6)}`
                        : credentials.appId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">App Secret</span>
                    <span className="font-mono text-foreground">
                      {credentials.appSecret ? '••••••••••••••••' : '未配置'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sheet Token</span>
                    <span className="font-mono text-foreground">
                      {credentials.sheetToken.length > 20
                        ? `${credentials.sheetToken.slice(0, 8)}...${credentials.sheetToken.slice(-6)}`
                        : credentials.sheetToken}
                    </span>
                  </div>
                </div>
              )}

              {/* Last Updated */}
              {credentials.lastUpdated && (
                <div className="pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">最后更新</span>
                    <span className="font-mono text-foreground">{credentials.lastUpdated}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Warning Tip */}
          {credentials.isValid === false && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-start gap-3 rounded-sm border border-[hsl(4_65%_48%)]/30 bg-[hsl(4_55%_95%)] p-4"
            >
              <ShieldAlertIcon className="size-4 shrink-0 text-[hsl(4_60%_28%)] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[hsl(4_60%_28%)]">
                  凭证验证失败
                </p>
                <p className="text-xs text-[hsl(4_60%_28%)]/70 mt-0.5">
                  请确认 App ID、App Secret 正确且应用已获取共享表读取权限，然后重新验证
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
