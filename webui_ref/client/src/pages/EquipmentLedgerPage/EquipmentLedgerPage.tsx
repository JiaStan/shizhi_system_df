import { useState, useEffect, useCallback } from 'react';
import {
  getEquipmentList,
  getEquipmentStats,
  deleteEquipment,
  updateEquipmentStatus,
  EQUIPMENT_STATUS_MAP,
  EQUIPMENT_TYPE_MAP,
  type Equipment,
  type EquipmentListParams,
} from '@client/src/api/resource/equipment';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Pagination } from '@client/src/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/src/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit3,
  Wrench,
  RefreshCw,
} from 'lucide-react';

// 区域选项
const ZONE_OPTIONS = [
  { value: 'SZC', label: '仓库装配区' },
  { value: 'SZA', label: '装配一期车间' },
  { value: 'SZB', label: '装配二期车间' },
  { value: 'JP1', label: '竞品装配一区' },
  { value: 'JP2', label: '竞品装配二区' },
  { value: 'LH', label: '联合装配区' },
  { value: 'CX1', label: '外委畅行车间' },
  { value: 'CX2', label: '外委交石车间' },
];

// 设备类型选项
const TYPE_OPTIONS = [
  { value: 'lift', label: '举升机' },
  { value: 'island', label: '试制岛' },
  { value: 'station', label: '工位' },
];

// 状态选项
const STATUS_OPTIONS = [
  { value: 'idle', label: '空闲' },
  { value: 'busy', label: '占用' },
  { value: 'error', label: '故障' },
  { value: 'maintenance', label: '维护中' },
];

// KPI卡片组件
function KpiCards({ stats }: { stats: { total: number; idle: number; busy: number; error: number; maintenance: number } }) {
  const cards = [
    { label: '设备总数', value: stats.total, color: '#1677FF' },
    { label: '空闲', value: stats.idle, color: '#10B981' },
    { label: '占用', value: stats.busy, color: '#1677FF' },
    { label: '故障', value: stats.error, color: '#EF4444' },
    { label: '维护中', value: stats.maintenance, color: '#F59E0B' },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">{card.label}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: card.color }}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 状态徽章组件
function StatusBadge({ status }: { status: string }) {
  const statusInfo = EQUIPMENT_STATUS_MAP[status] || { label: status, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: statusInfo.color,
        backgroundColor: statusInfo.bgColor,
        border: `1px solid ${statusInfo.color}`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: statusInfo.color }} />
      {statusInfo.label}
    </span>
  );
}

// 设备详情对话框
function EquipmentDetailDialog({
  equipment,
  open,
  onClose,
}: {
  equipment: Equipment | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>设备详情</DialogTitle>
          <DialogDescription>{equipment.equipment_code}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">设备编号</label>
              <div className="font-mono font-medium">{equipment.equipment_code}</div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">设备名称</label>
              <div>{equipment.equipment_name}</div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">设备类型</label>
              <div>{EQUIPMENT_TYPE_MAP[equipment.equipment_type] || equipment.equipment_type}</div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">所属区域</label>
              <div>{equipment.zone_name || equipment.zone_code}</div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">当前状态</label>
              <div><StatusBadge status={equipment.status} /></div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">操作员</label>
              <div>{equipment.current_operator || '-'}</div>
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">最后更新时间</label>
                <div className="font-mono text-sm">{equipment.last_update_time || '-'}</div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">创建时间</label>
                <div className="font-mono text-sm">{equipment.created_at || '-'}</div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 删除确认对话框
function DeleteConfirmDialog({
  open,
  equipment,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  equipment: Equipment | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除设备 {equipment?.equipment_code} 吗？此操作不可恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 状态更新对话框
function StatusUpdateDialog({
  open,
  equipment,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  equipment: Equipment | null;
  onConfirm: (status: string) => void;
  onCancel: () => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState<string>('idle');

  useEffect(() => {
    if (equipment) {
      setSelectedStatus(equipment.status);
    }
  }, [equipment]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>更新设备状态</DialogTitle>
          <DialogDescription>
            设备: {equipment?.equipment_code}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">新状态</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={() => onConfirm(selectedStatus)}>确认更新</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 主组件
export default function EquipmentLedgerPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, idle: 0, busy: 0, error: 0, maintenance: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 筛选条件
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  
  // 对话框状态
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [deleteEquipment, setDeleteEquipment] = useState<Equipment | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statusEquipment, setStatusEquipment] = useState<Equipment | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // 加载设备列表
  const loadEquipmentList = useCallback(async () => {
    setLoading(true);
    try {
      const params: EquipmentListParams = {
        page,
        page_size: pageSize,
        keyword: keyword || undefined,
      };
      if (statusFilter !== 'all') params.status = statusFilter as 'idle' | 'busy' | 'error' | 'maintenance';
      if (zoneFilter !== 'all') params.zone_code = zoneFilter;
      if (typeFilter !== 'all') params.equipment_type = typeFilter as 'lift' | 'island' | 'station';

      const response = await getEquipmentList(params);
      setEquipmentList(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('加载设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, zoneFilter, typeFilter, keyword]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const response = await getEquipmentStats();
      setStats({
        total: response.data.total,
        idle: response.data.idle,
        busy: response.data.busy,
        error: response.data.error,
        maintenance: response.data.maintenance,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadEquipmentList();
    loadStats();
  }, [loadEquipmentList, loadStats]);

  // 重置筛选条件
  const resetFilters = () => {
    setStatusFilter('all');
    setZoneFilter('all');
    setTypeFilter('all');
    setKeyword('');
    setPage(1);
  };

  // 搜索
  const handleSearch = () => {
    setPage(1);
    loadEquipmentList();
  };

  // 查看详情
  const handleViewDetail = (equipment: Equipment) => {
    setDetailEquipment(equipment);
    setShowDetailDialog(true);
  };

  // 打开删除确认
  const handleDeleteClick = (equipment: Equipment) => {
    setDeleteEquipment(equipment);
    setShowDeleteDialog(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteEquipment) return;
    try {
      await deleteEquipment(deleteEquipment.equipment_code);
      setShowDeleteDialog(false);
      setDeleteEquipment(null);
      loadEquipmentList();
      loadStats();
    } catch (error) {
      console.error('删除设备失败:', error);
    }
  };

  // 打开状态更新对话框
  const handleStatusClick = (equipment: Equipment) => {
    setStatusEquipment(equipment);
    setShowStatusDialog(true);
  };

  // 确认状态更新
  const handleConfirmStatusUpdate = async (newStatus: string) => {
    if (!statusEquipment) return;
    try {
      await updateEquipmentStatus(statusEquipment.equipment_code, { status: newStatus as any });
      setShowStatusDialog(false);
      setStatusEquipment(null);
      loadEquipmentList();
      loadStats();
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和工具栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">设备台账</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理试制车间所有设备的信息、状态和维护记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadEquipmentList}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新增设备
          </Button>
        </div>
      </div>

      {/* KPI统计卡片 */}
      <KpiCards stats={stats} />

      {/* 筛选器 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 区域筛选 */}
            <div className="w-48">
              <label className="text-xs text-muted-foreground mb-1 block">区域</label>
              <Select value={zoneFilter} onValueChange={(val) => { setZoneFilter(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择区域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部区域</SelectItem>
                  {ZONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 类型筛选 */}
            <div className="w-40">
              <label className="text-xs text-muted-foreground mb-1 block">设备类型</label>
              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 状态筛选 */}
            <div className="w-40">
              <label className="text-xs text-muted-foreground mb-1 block">状态</label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 搜索框 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索设备编号或名称..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                />
              </div>
            </div>

            {/* 重置按钮 */}
            <div className="self-end">
              <Button variant="ghost" onClick={resetFilters} className="mb-0">
                重置筛选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 设备列表表格 */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/50">
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">设备编号</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">设备名称</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">类型</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">区域</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">状态</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作员</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">最后更新</TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : equipmentList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无设备数据
                    </TableCell>
                  </TableRow>
                ) : (
                  equipmentList.map((equipment) => (
                    <TableRow
                      key={equipment.id}
                      className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="px-4 py-3 font-mono text-sm font-medium">{equipment.equipment_code}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{equipment.equipment_name}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{EQUIPMENT_TYPE_MAP[equipment.equipment_type] || equipment.equipment_type}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{equipment.zone_name || equipment.zone_code}</TableCell>
                      <TableCell className="px-4 py-3"><StatusBadge status={equipment.status} /></TableCell>
                      <TableCell className="px-4 py-3 text-sm">{equipment.current_operator || '-'}</TableCell>
                      <TableCell className="px-4 py-3 font-mono text-sm text-muted-foreground">
                        {equipment.last_update_time || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(equipment)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusClick(equipment)}>
                              <Wrench className="mr-2 h-4 w-4" />
                              更新状态
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(equipment)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录
            </div>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize)}
              onPageChange={(newPage) => {
                setPage(newPage);
                loadEquipmentList();
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 对话框 */}
      <EquipmentDetailDialog
        equipment={detailEquipment}
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
      />
      <DeleteConfirmDialog
        open={showDeleteDialog}
        equipment={deleteEquipment}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setShowDeleteDialog(false); setDeleteEquipment(null); }}
      />
      <StatusUpdateDialog
        open={showStatusDialog}
        equipment={statusEquipment}
        onConfirm={handleConfirmStatusUpdate}
        onCancel={() => { setShowStatusDialog(false); setStatusEquipment(null); }}
      />
    </div>
  );
}
