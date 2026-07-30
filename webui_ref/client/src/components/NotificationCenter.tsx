import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellIcon,
  AlertTriangleIcon,
  PackageIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  CheckCheckIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ─── 类型 ─── */
type NotificationType = 'delivery_alert' | 'critical_shortage' | 'spider_complete' | 'credential_expiry';

interface INotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

/* ─── Mock 通知数据 ─── */
const MOCK_NOTIFICATIONS: INotification[] = [
  {
    id: 'n1',
    type: 'delivery_alert',
    title: '到货率跌破阈值',
    description: '项目 E70 迭代改款到货率降至 72.3%，低于 80% 预警线',
    time: '10 分钟前',
    read: false,
  },
  {
    id: 'n2',
    type: 'critical_shortage',
    title: '关键件缺料提醒',
    description: '安全气囊模块（A220010V5301）缺口 2 件，预计 06-25 到货',
    time: '25 分钟前',
    read: false,
  },
  {
    id: 'n3',
    type: 'spider_complete',
    title: '爬虫同步完成',
    description: '仓库系统全量同步完成，新增 3500 条，更新 1847 条',
    time: '1 小时前',
    read: false,
  },
  {
    id: 'n4',
    type: 'credential_expiry',
    title: '凭证即将过期',
    description: 'di360 仓库系统 Cookie 将在 2 小时后失效，请及时更新',
    time: '2 小时前',
    read: true,
  },
  {
    id: 'n5',
    type: 'delivery_alert',
    title: '到货率回升',
    description: '项目 V530 新能源改款到货率回升至 95.2%，恢复正常',
    time: '3 小时前',
    read: true,
  },
  {
    id: 'n6',
    type: 'critical_shortage',
    title: '关键件齐套率预警',
    description: '配置 M102 齐套率降至 82.5%，3 个关键件尚未入库',
    time: '5 小时前',
    read: true,
  },
];

/* ─── 通知类型视觉映射 ─── */
const TYPE_CONFIG: Record<
  NotificationType,
  {
    Icon: typeof BellIcon;
    iconBg: string;
    iconColor: string;
  }
> = {
  delivery_alert: {
    Icon: AlertTriangleIcon,
    iconBg: 'bg-[hsl(4_55%_95%)]',
    iconColor: 'text-[hsl(4_60%_28%)]',
  },
  critical_shortage: {
    Icon: PackageIcon,
    iconBg: 'bg-[hsl(40_75%_94%)]',
    iconColor: 'text-[hsl(40_65%_25%)]',
  },
  spider_complete: {
    Icon: CheckCircle2Icon,
    iconBg: 'bg-[hsl(152_45%_95%)]',
    iconColor: 'text-[hsl(152_60%_22%)]',
  },
  credential_expiry: {
    Icon: KeyRoundIcon,
    iconBg: 'bg-[hsl(40_75%_94%)]',
    iconColor: 'text-[hsl(40_65%_25%)]',
  },
};

/* ─── 组件 ─── */
export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  /* 点击外部关闭 */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* ── 铃铛触发按钮 ── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative inline-flex size-8 items-center justify-center rounded-md transition-colors',
          open
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <BellIcon className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[hsl(4_65%_48%)] text-white text-[10px] font-bold leading-none border border-card">
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── 下拉面板 ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-[380px] rounded-sm border border-border bg-card shadow-lg z-50 overflow-hidden"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">通知</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[hsl(4_55%_95%)] text-[hsl(4_60%_28%)] text-[10px] font-bold border border-[hsl(4_65%_48%)]">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={markAllRead}
                  >
                    <CheckCheckIcon className="size-3 mr-1" />
                    全部已读
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* 通知列表 */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <BellIcon className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">暂无通知</p>
                </div>
              ) : (
                <div>
                  {notifications.map((n) => {
                    const cfg = TYPE_CONFIG[n.type];
                    const IconComp = cfg.Icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => markOneRead(n.id)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-b-0',
                          !n.read
                            ? 'bg-[hsl(42_96%_52%/0.04)] hover:bg-[hsl(42_96%_52%/0.08)]'
                            : 'hover:bg-accent/50',
                        )}
                      >
                        {/* 图标 */}
                        <div
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-sm mt-0.5',
                            cfg.iconBg,
                          )}
                        >
                          <IconComp className={cn('size-4', cfg.iconColor)} />
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-sm truncate',
                                !n.read
                                  ? 'font-semibold text-foreground'
                                  : 'font-medium text-foreground/80',
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {n.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                            {n.time}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="border-t border-border px-4 py-2 bg-accent/30">
              <p className="text-[10px] text-muted-foreground text-center">
                共 {notifications.length} 条通知 · {unreadCount} 条未读
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
