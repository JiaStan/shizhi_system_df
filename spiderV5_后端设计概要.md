# spiderV5 后端架构设计概要

> 基于需求文档 V5 综合设计，参考 spiderV4 现有实现，按优先级分层实现

**文档版本**：1.1  
**生成日期**：2026-06-30  
**设计原则**：模块化分离 · 增量开发 · 不影响前序功能 · 可扩展性  

**已确认事项：**
- ✅ 数据库：沿用 `warehouse_data` 数据库
- ✅ 飞书/采购：暂无 API，先留框架，后续实现
- ✅ LLM：使用 DeepSeek（OpenAI 兼容接口）
- ✅ 架构设计支持后续修改（模块化 + 增量开发）

---

## 📋 目录

- [一、设计原则与指导思想](#一设计原则与指导思想)
- [二、整体架构与目录结构](#二整体架构与目录结构)
- [三、数据库设计](#三数据库设计)
- [四、模块划分与优先级](#四模块划分与优先级)
- [五、Phase 1 - 第一优先级：核心基础](#五phase-1---第一优先级核心基础)
- [六、Phase 2 - 第二优先级：数据分析增强](#六phase-2---第二优先级数据分析增强)
- [七、Phase 3 - 第三优先级：高级功能](#七phase-3---第三优先级高级功能)
- [八、API 设计](#八api-设计)
- [九、QR码现场到件](#九qr码现场到件)
- [十、核心业务流程](#十核心业务流程)
- [十一、技术栈与依赖](#十一技术栈与依赖)
- [十二、实施计划](#十二实施计划)

---

## 一、设计原则与指导思想

### 1.1 借鉴 spiderV4 的成熟实践

spiderV4 已经验证的架构直接沿用：
- ✅ **pymysql + DBUtils 连接池**：稳定成熟，直接复用
- ✅ **原生 SQL**：简单直接，避免 ORM 复杂度
- ✅ **FastAPI 路由分离**：按功能模块拆分路由器
- ✅ **python-dotenv 配置管理**：环境变量配置
- ✅ **RotatingFileHandler 日志轮转**：生产级日志
- ✅ **requests 同步爬虫**：稳定可靠，支持增量同步

### 1.2 扩展需求（V5 新增）

在 spiderV4 基础上增量添加：
- 支持**多数据源爬取**（仓库 WMS + 飞书共享表 + 采购系统）
- 支持 **PBOM 三层递进配置列检测**（规则 → LLM → 用户确认）
- 支持 **PBOM 多配置解析**（M101/M102 等不同车型配置）
- 支持 **四维关键件评分**（安全/大件/紧缺/工艺）
- 支持 **多源到货数据去重合并**（5维匹配 + 4级分级）
- 支持 **BFWS 阻塞流水车间调度 + CP-SAT 求解**

### 1.3 模块化设计原则

| 原则 | 说明 |
|------|------|
| **单向依赖** | 核心层 ← 基础模块 ← 高级模块，无循环依赖 |
| **开闭原则** | 新增功能不修改已有代码，通过增量添加实现 |
| **接口稳定** | Phase 1 API 稳定，Phase 2/3 在其基础上扩展 |
| **可测试** | 每个模块可独立测试 |
| **可部署** | Phase 1 完成即可独立部署运行 |

---

## 二、整体架构与目录结构

```
spiderV5/
├── backend/                    # 后端根目录
│   ├── __init__.py
│   ├── main.py                 # FastAPI 主应用（参考 V4）
│   ├── config.py               # 配置管理（参考 V4，扩展多数据源）
│   ├── database.py             # 数据库连接池（复用 V4 代码）
│   ├── logger.py               # 日志配置（复用 V4 代码）
│   ├── .env                    # 环境变量配置（参考 V4）
│   ├── requirements.txt        # Python 依赖
│   ├── core/                   # 核心基础设施（新增）
│   │   ├── __init__.py
│   │   └── exceptions.py       # 自定义异常
│   ├── crawlers/               # Phase 1: 多源爬虫模块（扩展 V4）
│   │   ├── __init__.py
│   │   ├── base.py             # 爬虫基类（抽象接口）
│   │   ├── wms_crawler.py      # di360 WMS 仓库爬虫（复用 V4 代码）
│   │   ├── feishu_crawler.py   # 飞书共享表爬虫（新增）
│   │   ├── purchase_crawler.py # 采购系统爬虫（新增）
│   │   └── crawler_manager.py  # 爬虫调度管理器
│   ├── projects/               # Phase 1: 项目管理模块（扩展 V4）
│   │   ├── __init__.py
│   │   ├── models.py           # 数据结构定义
│   │   ├── schemas.py          # Pydantic 模式
│   │   ├── crud.py             # 数据库操作
│   │   └── router.py           # API 路由
│   ├── pbom/                   # Phase 1: PBOM 解析匹配模块（核心新增）
│   │   ├── __init__.py
│   │   ├── excel_parser.py     # Excel 解析（扩展 V4，支持配置列）
│   │   ├── column_detector.py  # 三层递进配置列检测（新增核心）
│   │   ├── pbom_matcher.py     # PBOM 匹配（扩展 V4 匹配逻辑）
│   │   ├── schemas.py          # Pydantic 模式
│   │   ├── crud.py             # 数据库操作
│   │   └── router.py           # API 路由
│   ├── delivery/               # Phase 2: 多源去重合并（新增）
│   │   ├── __init__.py
│   │   ├── dedup_matcher.py    # 5维匹配算法
│   │   ├── merger.py           # 合并逻辑
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   └── router.py
│   ├── critical_parts/         # Phase 2: 关键件评分（新增）
│   │   ├── __init__.py
│   │   ├── scoring.py          # 四维加权评分
│   │   ├── llm_evaluator.py    # LLM 评估器
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   └── router.py
│   ├── scheduling/             # Phase 3: BFWS 排程（新增）
│   │   ├── __init__.py
│   │   ├── bfws_model.py       # BFWS 模型定义
│   │   ├── cp_sat_solver.py    # CP-SAT 求解器
│   │   ├── gantt_builder.py    # 甘特图数据构建
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   └── router.py
│   ├── qr_arrival/              # Phase 1: QR码现场到件（新增）
│   │   ├── __init__.py
│   │   ├── qr_generator.py     # 二维码生成
│   │   ├── arrival_handler.py  # 到件信息处理
│   │   ├── matcher.py          # 三端匹配逻辑
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   └── router.py
│   └── system/                 # Phase 3: 系统设置（扩展 V4）
│       ├── __init__.py
│       ├── credentials.py      # 多数据源凭证管理
│       ├── params.py           # 系统参数配置
│       ├── schemas.py
│       ├── crud.py
│       └── router.py
├── logs/                       # 日志目录（自动创建）
├── uploads/                    # 上传文件目录（自动创建）
├── scripts/                    # 工具脚本
│   ├── init_db.py              # 数据库初始化脚本
│   └── run_crawler.py          # 手动运行爬虫
└── README.md                   # 后端说明文档
```

### 架构说明

- **`backend/`**：根目录，包含 `main.py`、`config.py`、`database.py`、`logger.py`（参考 V4 结构）
- **`core/`**：仅放基础设施，不包含业务逻辑
- **`crawlers/`**：每个数据源一个爬虫类，继承基类，新增数据源不修改已有代码
- **按模块拆分**：每个业务模块独立目录，包含 `schemas.py`（请求响应模式）、`crud.py`（数据库操作）、`router.py`（API 路由）
- **增量添加**：Phase 1 只需要前 3 个模块，后续模块逐个添加，不影响已有代码

---

## 三、数据库设计

### 3.1 Phase 1 必需表

复用 spiderV4 已有表，新增 V5 需求表：

```sql
-- 复用 V4: projects 项目表（已有结构保留，扩展字段）
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200),
    project_code VARCHAR(100) NOT NULL,
    apply_code VARCHAR(100) NOT NULL,
    model_type VARCHAR(100),              -- V5 新增：车型
    parts_count INT NOT NULL DEFAULT 0,   -- V5 新增：PBOM零件总数
    delivery_rate DECIMAL(5,2) NOT NULL DEFAULT 0,  -- V5 新增：到货率
    critical_ready_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- V5 新增：关键件齐套率
    status VARCHAR(20) NOT NULL DEFAULT 'normal', -- V5 新增：项目状态
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

-- 复用 V4: project_parts 项目零件表（扩展字段）
CREATE TABLE IF NOT EXISTS project_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    part_code VARCHAR(200) NOT NULL,
    part_name VARCHAR(200) NOT NULL,
    demand_quantity INT NOT NULL,
    received_quantity INT NOT NULL DEFAULT 0,
    line_side_qty INT NOT NULL DEFAULT 0,       -- V5 新增：线边到货数量（QR码录入）
    line_side_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- V5 新增：线边到货状态 pending/partial/matched
    -- V5 新增：关键字段（Phase 2 添加）
    safety_score TINYINT,
    size_score TINYINT,
    scarcity_score TINYINT,
    process_score TINYINT,
    critical_level DECIMAL(3,2),
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    eta_date DATE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_part_code (part_code),
    UNIQUE KEY uk_project_part (project_id, part_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目零件表';

-- 复用 V4: delivery_detail 到货明细表（保留已有结构）
-- 字段: DELIVERY_CODE, APPLY_CODE, PRO_CODE, PRO_NAME, MATTER_CODE, MATTER_NAME,
--       STYLIST_USERNAME, ZYS_USERNAME, STATE, FROM_ORDER_CODE, ORDER_NUM,
--       SEND_NUM, RECIVE_NUM, IN_NUM, CANT_NUM, SEND_WH_NAME, WH_NAME,
--       RECIVE_USERNAME, RECIVE_TIME

-- V5 新增：配置表（PBOM解析出的配置）
CREATE TABLE IF NOT EXISTS configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    config_name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    key_parts_total INT NOT NULL DEFAULT 0,
    key_parts_ready INT NOT NULL DEFAULT 0,
    ready_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ready',
    processing_time_hours DECIMAL(5,2),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY uk_project_config (project_id, config_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置表（PBOM车型配置）';

-- V5 新增：零件-配置关联表
CREATE TABLE IF NOT EXISTS part_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    config_id INT NOT NULL,
    part_code VARCHAR(200) NOT NULL,
    config_qty INT NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE,
    UNIQUE KEY uk_config_part (config_id, part_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='零件-配置关联表';

-- V5 新增：QR码现场到件记录表
CREATE TABLE IF NOT EXISTS qr_arrival_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    part_code VARCHAR(200) NOT NULL COMMENT '零件号',
    arrival_qty INT NOT NULL COMMENT '到货数量',
    arrival_time DATETIME NOT NULL COMMENT '到货时间',
    remark VARCHAR(500) COMMENT '备注',
    submitter VARCHAR(100) COMMENT '提交人',
    matched_status VARCHAR(20) NOT NULL DEFAULT 'unmatched' COMMENT '匹配状态: unmatched/partial/matched',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_part_code (part_code),
    INDEX idx_matched_status (matched_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='QR码现场到件记录表';

-- 复用并扩展 V4: spider_credentials 爬虫凭证表
CREATE TABLE IF NOT EXISTS spider_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(50) NOT NULL UNIQUE COMMENT '数据源: wms/feishu/purchase',
    name VARCHAR(100) NOT NULL,
    config_json TEXT NOT NULL COMMENT 'JSON 格式配置（URL/Token/Authorization等）',
    is_active TINYINT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'normal',
    last_sync_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='爬虫凭证表';

-- 复用 V4: spider_logs 爬虫日志表
-- 复用 V4: spider_scheduler 爬虫调度配置表
```

### 3.2 Phase 2 新增表

```sql
-- 去重合并结果表
CREATE TABLE IF NOT EXISTS merged_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    merged_id VARCHAR(100) NOT NULL,
    part_code VARCHAR(200) NOT NULL,
    final_qty INT NOT NULL,
    source_ids TEXT NOT NULL COMMENT '原始来源ID列表JSON',
    match_level VARCHAR(20) NOT NULL COMMENT 'strong/weak/fuzzy/unique',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='去重合并结果表';

-- 系统参数表（存储可配置参数）
CREATE TABLE IF NOT EXISTS system_params (
    id INT AUTO_INCREMENT PRIMARY KEY,
    param_key VARCHAR(100) NOT NULL UNIQUE,
    param_value TEXT NOT NULL,
    param_type VARCHAR(20) NOT NULL COMMENT 'int/float/string/bool/json',
    description VARCHAR(200),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数表';

-- 初始化默认参数
INSERT INTO system_params (param_key, param_value, param_type, description) VALUES
('critical_weight_safety', '0.30', 'float', '安全件权重'),
('critical_weight_size', '0.20', 'float', '大件权重'),
('critical_weight_scarcity', '0.30', 'float', '紧缺件权重'),
('critical_weight_process', '0.20', 'float', '工艺件权重'),
('threshold_delivery_safe', '95', 'float', '到货率安全阈值'),
('threshold_delivery_warning', '80', 'float', '到货率预警阈值'),
('bfws_station_count', '3', 'int', 'BFWS工位数量'),
('bfws_weight_alpha', '0.40', 'float', '齐套优先权重α'),
('bfws_weight_beta', '0.30', 'float', '工时均衡权重β'),
('bfws_weight_gamma', '0.30', 'float', '风险分散权重γ'),
('bfws_timeout_seconds', '30', 'int', 'CP-SAT求解超时');
```

### 3.3 Phase 3 新增表

```sql
-- 装配计划表
CREATE TABLE IF NOT EXISTS assembly_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    plan_name VARCHAR(200),
    sequence_order INT NOT NULL,
    config_id INT NOT NULL,
    ready_rate DECIMAL(5,2) NOT NULL,
    composite_score DECIMAL(5,2) NOT NULL,
    missing_parts TEXT,
    status VARCHAR(20) NOT NULL,
    processing_time_hours DECIMAL(5,2) NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    station INT NOT NULL,
    solver_gap DECIMAL(5,2),
    makespan_hours DECIMAL(8,2),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='装配计划表';
```

---

## 四、模块划分与优先级

### 模块依赖关系

```
core ← projects ← crawlers ← pbom ← qr_arrival ← delivery ← critical_parts ← scheduling
core ← system (独立)
```

| 模块 | 依赖 | 优先级 | Phase | 说明 |
|------|------|--------|-------|------|
| `core` | 无 | 🔴 P0 | 1 | 基础设施 |
| `projects` | core | 🔴 P0 | 1 | 项目管理基础 |
| `crawlers` | core, projects | 🔴 P0 | 1 | 多源数据爬取 |
| `pbom` | core, projects | 🔴 P0 | 1 | 核心：PBOM解析+匹配 |
| `qr_arrival` | core, projects, crawlers, pbom | 🔴 P0 | 1 | QR码现场到件+三端匹配 |
| `delivery` | core, projects, crawlers | 🟡 P1 | 2 | 多源去重合并 |
| `critical_parts` | core, projects, pbom | 🟡 P1 | 2 | 关键件评分 |
| `scheduling` | core, projects, pbom, critical_parts | 🟢 P2 | 3 | BFWS排程 |
| `system` | core | 🟢 P2 | 3 | 系统参数配置 |

### 完成标准

- **Phase 1 完成即可独立运行**：支持创建项目 → 爬取数据 → 上传 PBOM → 匹配 → 生成QR码 → 现场扫码到件 → 三端匹配 → 查看结果
- **每个 Phase 不修改前序模块接口**：只新增代码，不改动已有
- **每个模块可独立测试**：单元测试可单独运行

---

## 五、Phase 1 - 第一优先级：核心基础

### 5.1 目标

**完成：仓库信息爬取到数据库 + PBOM匹配功能**

### 5.2 模块详细设计

#### 5.2.1 `core/` 核心基础设施

```python
# core/exceptions.py
class BusinessError(Exception):
    """业务异常基类"""
    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(message)
```

#### 5.2.2 `crawlers/` 多源爬虫模块

**设计模式：适配器模式 + 基类抽象**

```python
# crawlers/base.py
from abc import ABC, abstractmethod
from typing import List, Dict

class BaseCrawler(ABC):
    """爬虫基类"""

    source_name: str  # wms/feishu/purchase

    @abstractmethod
    async def fetch_data(self) -> List[Dict]:
        """抓取数据，返回原始记录列表"""
        pass

    @abstractmethod
    def parse_record(self, raw: Dict) -> Dict:
        """解析原始记录为标准到货格式"""
        pass

    @abstractmethod
    def get_source(self) -> str:
        """返回数据源标识"""
        pass
```

```python
# crawlers/wms_crawler.py
# 复用 spiderV4 spider_main.py 代码，改造为类
class WMSCrawler(BaseCrawler):
    """di360 WMS 仓库爬虫"""
    source_name = "wms"

    # 直接复用 V4 的:
    # - build_request_body()
    # - process_record()
    # - insert_records()
    # - run_spider_once()
```

```python
# crawlers/feishu_crawler.py
# 新增：飞书共享表爬虫
class FeishuCrawler(BaseCrawler):
    """飞书共享表爬虫"""
    source_name = "feishu"

    # 通过飞书开放 API 获取共享表数据
    # 解析后转为统一格式存入 deliveries 表
    # source = 'feishu'
```

```python
# crawlers/purchase_crawler.py
# 新增：采购系统爬虫
class PurchaseCrawler(BaseCrawler):
    """采购系统爬虫"""
    source_name = "purchase"
```

```python
# crawlers/crawler_manager.py
class CrawlerManager:
    """爬虫管理器：调度多个数据源爬虫"""

    def __init__(self):
        self.crawlers = self._load_active_crawlers()

    async def run_all(self, sync_type: str = "auto") -> Dict:
        """运行所有激活的爬虫"""
        results = {}
        for crawler in self.crawlers:
            result = await crawler.run(sync_type)
            results[crawler.source_name] = result
        return results
```

**扩展性：** 新增数据源只需新增一个 `BaseCrawler` 子类，不修改现有代码。

#### 5.2.3 `projects/` 项目管理模块

复用 spiderV4 `projects.py` 逻辑，扩展字段支持 V5 需求。

**CRUD 操作：**
- 创建/更新/删除项目
- 项目列表分页查询
- 项目详情查询

#### 5.2.4 `pbom/` PBOM 解析匹配模块（核心）

```python
# pbom/excel_parser.py
# 扩展 V4 _parse_excel() 逻辑，支持识别配置列
class PBOMExcelParser:
    """PBOM Excel解析器"""

    def __init__(self, filepath: str):
        self.filepath = filepath

    def parse(self) -> Dict:
        """解析Excel，返回零件列表和识别出的配置候选列"""
        # 1. 读取表头和数据
        # 2. 识别必填列（零件号、零件名、需求量）
        # 3. 识别候选配置列（三层检测在这里完成）
        # 4. 返回零件列表 + 配置列候选
        return {
            "parts": [...],          # 零件列表
            "config_candidates": [...], # 配置列候选
        }
```

```python
# pbom/column_detector.py
# 核心：三层递进配置列检测
class ThreeLayerColumnDetector:
    """三层递进配置列检测

    Layer 1: 规则引擎排除法（80% 命中）
    - 排除已知列（序号、线别、工序、零件号、零件名、总消耗等）
    - 排除元数据列（力矩、备注、自检、追溯等）
    - 剩下的作为候选

    Layer 2: LLM 补刀（对不确定列进行语义识别）
    - 调用 GPT-4o-mini 判断是否为配置列
    - 输出置信度

    Layer 3: 用户确认兜底（置信度 < 0.6 弹出确认）
    - 前端展示候选，用户确认哪些是真正的配置列
    - 用户可修改配置显示名
    """

    KNOWN_PATTERNS = [
        r'序号', r'线别', r'工序', r'零件号', r'物料', r'名称',
        r'总消耗', r'需求', r'接收', r'力矩', r'备注', r'自检',
        r'追溯', r'NM', r'★', r'范围'
    ]

    def layer1_rule_based(self, headers: List[str]) -> List[Dict]:
        """第一层：规则引擎排除法"""
        candidates = []
        for col in headers:
            if not self._matches_any(col, self.KNOWN_PATTERNS):
                # 检查数值分布：大部分单元格有数字且范围合理
                candidates.append({
                    "column": col,
                    "confidence": self._calculate_confidence(col),
                    "stats": self._get_column_stats(col),
                })
        return candidates

    async def layer2_llm_completion(self, candidates: List[Dict]) -> List[Dict]:
        """第二层：LLM 补刀识别"""
        # 调用 OpenAI API 进行语义判定
        # 返回带置信度的识别结果
        pass

    def layer3_user_confirm(self, candidates: List[Dict], user_confirm: Dict) -> List[Dict]:
        """第三层：用户确认兜底"""
        # 根据用户确认结果过滤
        pass
```

```python
# pbom/pbom_matcher.py
# 核心匹配逻辑：将 PBOM 零件与爬取的到货数据匹配
class PBOMMatcher:
    """PBOM 匹配器

    匹配逻辑：
    1. 按项目号 + 申请单号筛选到货数据
    2. 按零件号精确匹配
    3. 汇总已入库数量
    4. 更新零件和项目统计数据
    5. 计算到货率
    """

    def match_project(self, project_id: int) -> Dict:
        """执行匹配，返回统计结果"""
        # 1. 获取项目零件
        # 2. 获取项目到货数据
        # 3. 按零件号匹配汇总
        # 4. 更新零件 received_quantity
        # 5. 更新项目 delivery_rate
        # 6. 返回汇总概览
        pass
```

### 5.3 Phase 1 验收标准

| 验收项 | 标准 |
|--------|------|
| 多源爬取 | ✓ 支持 WMS/飞书/采购三个数据源，可分别配置凭证，可单独/批量执行爬取，数据正确存入数据库 |
| PBOM上传 | ✓ 支持 .xlsx/.xls 上传，正确解析零件列表 |
| 三层列检测 | ✓ Layer1 规则引擎能识别大多数配置列，Layer2 LLM能处理歧义列，Layer3支持用户确认 |
| PBOM匹配 | ✓ 正确匹配零件号，汇总入库数量，计算到货率 |
| 项目管理 | ✓ CRUD正常，分页查询正常 |
| API 文档 | ✓ FastAPI 自动文档可访问，所有接口可测试 |
| 不影响后续扩展 | ✓ 数据库结构预留 Phase 2/3 字段，接口可扩展 |

---

## 六、Phase 2 - 第二优先级：数据分析增强

### 6.1 目标

完成：多源到货数据去重合并 + 关键件四维评分

### 6.2 `delivery/` 多源去重合并

```python
# delivery/dedup_matcher.py
# 5维匹配键 × 4级分级
class DeduplicationMatcher:
    """多源数据去重匹配

    5维匹配键：
    1. 零件号 part_code
    2. 数量 quantity
    3. 批次号 batch_no
    4. 供应商 supplier
    5. 到货日期 arrival_date

    4级分级：
    | 级别 | 判定条件 | 处理方式 |
    |------|----------|----------|
    | 🟢 strong | 5维完全一致 | 自动合并 |
    | 🟡 weak | 零件号+数量+到货日期±3天 | 标黄，待人工确认 |
    | 🔴 fuzzy | 零件号+数量一致，日期差异大 | 标红，提示差异 |
    | ⚪ unique | 仅一个数据源 | 直接入库 |
    """

    def match_all(self, project_id: int) -> List[Dict]:
        """执行去重匹配，返回匹配结果"""
        pass

    def calculate_match_level(self, record1: Dict, record2: Dict) -> str:
        """计算两个记录的匹配级别"""
        pass
```

```python
# delivery/merger.py
class DeliveryMerger:
    """合并去重结果"""

    def merge(self, project_id: int, matching_result: List[Dict]) -> int:
        """执行合并，保存到 merged_deliveries 表"""
        # 根据匹配级别执行合并
        # strong: 合并数量
        # weak/fuzzy: 保留原记录，标记匹配级别
        # unique: 直接保留
        pass
```

### 6.3 `critical_parts/` 关键件评分

```python
# critical_parts/scoring.py
# 四维加权评分
class CriticalScorer:
    """关键件四维评分

    评分模型：
    最终加权总分 = 安全件×w1 + 大件×w2 + 紧缺件×w3 + 工艺件×w4
    满分 5.0 分

    分级：
    - 4.0+ → 高风险关键件（红）
    - 3.0-3.9 → 次关键（黄）
    - <3.0 → 常规（绿）

    权重可配置（存在 system_params 表）
    """

    def __init__(self):
        self.weights = self._load_weights_from_db()

    def calculate_score(
        self,
        safety: int,      # 1-5
        size: int,        # 1-5
        scarcity: int,    # 1-5
        process: int      # 1-5
    ) -> float:
        """计算加权总分"""
        w1, w2, w3, w4 = self.weights
        return safety * w1 + size * w2 + scarcity * w3 + process * w4

    def is_critical(self, score: float) -> bool:
        """是否为关键件"""
        return score >= 3.0
```

```python
# critical_parts/llm_evaluator.py
class LLMEvaluator:
    """LLM 评估零件关键度

    输入：零件号 + 零件名
    输出：四个维度的 1-5 评分 + 理由
    """

    async def evaluate_parts(self, parts: List[Dict]) -> List[Dict]:
        """批量评估零件"""
        # 构造 Prompt 调用 GPT-4o-mini
        # 返回评分结果
        pass
```

---

## 七、Phase 3 - 第三优先级：高级功能

### 7.1 目标

完成：BFWS 阻塞流水车间调度 + CP-SAT 求解 + 系统设置

### 7.2 `scheduling/` BFWS 排程

```python
# scheduling/bfws_model.py
# BFWS 阻塞流水车间模型定义
class BFWSModel:
    """BFWS 阻塞流水车间模型

    约束条件：
    1. 工序顺序约束：同一配置的工序必须按顺序加工
    2. 工位能力约束：同一工位同一时间只能加工一个配置
    3. 关键件到货约束：最早开工时间 >= 关键件到货日期
    4. BFWS 阻塞约束：工位间无缓冲，下一工位空闲才能进入
    5. 时间窗口约束

    目标函数：
    minimize makespan = max(end_time)
    多目标扩展：minimize α×makespan + β×总等待时间 + γ×阻塞工时
    """

    def build_model(self):
        """构建模型"""
        pass
```

```python
# scheduling/cp_sat_solver.py
# Google OR-Tools CP-SAT 求解器集成
class CPSATSolver:
    """CP-SAT 求解器"""

    def solve(self, model: BFWSModel, timeout: int = 30) -> Dict:
        """求解模型，返回结果"""
        # 1. 定义变量
        # 2. 添加约束
        # 3. 设置目标函数
        # 4. 调用求解器
        # 5. 返回解：甘特图数据 + makespan + gap + 求解时间
        pass
```

```python
# scheduling/gantt_builder.py
# 构建甘特图数据供前端 ECharts 展示
class GanttBuilder:
    """甘特图数据构建器"""

    def build(self, solution: Dict) -> Dict:
        """构建甘特图数据"""
        # 返回符合 ECharts 格式的数据
        pass
```

### 7.3 `system/` 系统设置

```python
# system/credentials.py
# 多数据源凭证管理
# 支持增删改查，测试连接

# system/params.py
# 系统参数管理
# - 关键件评分权重
# - 到货率阈值
# - BFWS 排程参数
# 所有参数存在 system_params 表，可通过界面修改
```

---

## 八、API 设计

### 8.1 Phase 1 API

```
# 项目管理
GET    /api/projects              # 获取项目列表
GET    /api/projects/{id}         # 获取项目详情
POST   /api/projects              # 创建项目
PUT    /api/projects/{id}         # 更新项目
DELETE /api/projects/{id}         # 删除项目

# 爬虫管理
GET    /api/crawlers/status       # 获取各数据源状态
POST   /api/crawlers/run         # 执行爬虫（可指定数据源）
GET    /api/crawlers/logs         # 获取爬虫日志
POST   /api/crawlers/stop         # 停止正在运行的爬虫

# PBOM 解析
POST   /api/pbom/upload           # 上传 PBOM Excel
POST   /api/pbom/detect-columns   # 检测配置列（三层检测）
POST   /api/pbom/parse            # 确认配置列，解析保存 PBOM
GET    /api/pbom/{project_id}/parts  # 获取零件清单

# PBOM 匹配
POST   /api/pbom/{project_id}/match  # 执行匹配
GET    /api/pbom/{project_id}/match-result  # 获取匹配结果
GET    /api/pbom/{project_id}/export    # 导出匹配结果

# QR码现场到件
GET    /api/qr-arrival/{project_id}/qr-code   # 生成项目二维码（返回PNG图片）
GET    /api/qr-arrival/{project_id}/info       # 获取项目信息（扫码后显示的页面数据）
POST   /api/qr-arrival/{project_id}/submit     # 提交到件信息（现场人员扫码填写）
GET    /api/qr-arrival/{project_id}/records    # 获取到件记录列表
GET    /api/qr-arrival/{project_id}/status     # 获取零件线边到货状态汇总
```

### 8.2 Phase 2 新增 API

```
# 多源去重合并
POST   /api/delivery/dedup-merge  # 执行去重合并
GET    /api/delivery/{project_id}/merged  # 获取合并结果
GET    /api/delivery/{project_id}/export-merged  # 导出合并结果

# 关键件评分
POST   /api/critical/{project_id}/evaluate  # 执行 LLM 评估
GET    /api/critical/{project_id}/parts  # 获取关键件清单
PUT    /api/critical/weights      # 更新评分权重
GET    /api/critical/weights      # 获取当前权重
```

### 8.3 Phase 3 新增 API

```
# BFWS 排程
POST   /api/schedule/solve        # 提交求解
GET    /api/schedule/{project_id}/result  # 获取求解结果（甘特图数据）
PUT    /api/schedule/weights      # 更新排程权重
GET    /api/schedule/weights      # 获取当前排程参数

# 系统设置
GET    /api/system/credentials    # 获取凭证列表
POST   /api/system/credentials    # 添加/更新凭证
DELETE /api/system/credentials/{id}  # 删除凭证
POST   /api/system/credentials/{id}/test  # 测试连接
GET    /api/system/params         # 获取系统参数
POST   /api/system/params         # 更新系统参数
```

---

## 九、QR码现场到件

### 9.1 功能概述

每个项目创建并完成PBOM匹配后，系统支持**生成项目专属二维码**。现场人员（仓库收货员）扫描二维码后，在手机网页上填写到件信息，系统自动将录入信息与PBOM需求、仓库到货数据进行**三端匹配**，匹配成功后更新零件状态为"线边到货"。

**核心价值：** 现场到件数据不需要从PBOM中手动获取，扫码即可录入，实现仓库到货 → 线边到货的状态追踪。

### 9.2 业务流程

```
1. 项目完成PBOM匹配后，用户点击"生成项目二维码"
   ↓
2. 系统生成包含项目ID的二维码图片
   • 二维码内容：https://系统地址/qr-arrival?project_id=xxx
   • 用户可下载/打印二维码贴在现场
   ↓
3. 现场人员用手机扫描二维码
   • 打开手机网页，显示当前项目信息
   • 填写：零件号、到货数量、到货时间、备注
   • 提交到件信息
   ↓
4. 系统执行三端匹配
   • 端1：PBOM需求清单（零件号 + 需求数量）
   • 端2：仓库到货/工联单到货（爬虫抓取的数据）
   • 端3：QR码现场录入（现场人员扫码填写）
   ↓
5. 匹配结果处理
   • 三端数量一致 → 更新状态为"线边到货"（matched）
   • 部分匹配 → 状态为"部分到货"（partial）
   • 未匹配 → 提示不匹配原因
   ↓
6. 更新 project_parts 表
   • line_side_qty：线边到货数量
   • line_side_status：pending → partial → matched
```

### 9.3 三端匹配逻辑

```
三端匹配规则：

端1: PBOM 需求清单
  - 来源：上传的 PBOM Excel 解析结果
  - 关键字段：零件号(part_code)、需求数量(demand_quantity)

端2: 仓库/工联单到货
  - 来源：爬虫抓取的 delivery_detail 表
  - 关键字段：零件号(MATTER_CODE)、已入库数量(IN_NUM)

端3: QR码现场录入
  - 来源：现场人员扫码填写
  - 关键字段：零件号(part_code)、到货数量(arrival_qty)

匹配步骤：
  Step 1: 用零件号精确定位 PBOM 中的零件
  Step 2: 查询该零件在仓库的到货数量（received_quantity）
  Step 3: 对比 QR码录入数量(arrival_qty) 与需求数量(demand_quantity)、仓库到货数量(received_quantity)
  Step 4: 三端数量一致 → line_side_status = 'matched'（线边到货）
  Step 5: 部分匹配 → line_side_status = 'partial'（部分到货）
  Step 6: 未匹配 → 返回不匹配原因，数据保留在 qr_arrival_records 表等待处理
```

### 9.4 零件状态流转

```
零件状态变化：

pending（待收货）
  ↓ 仓库到货入库
received（仓库到货）
  ↓ QR码现场录入 + 三端匹配成功
matched（线边到货） ← 最终目标状态
```

### 9.5 模块设计

#### 9.5.1 `qr_generator.py` - 二维码生成

```python
# qr_arrival/qr_generator.py
import qrcode
from io import BytesIO

class QRCodeGenerator:
    """项目二维码生成器"""

    def __init__(self, base_url: str):
        self.base_url = base_url  # 系统访问地址，如 http://xxx.com

    def generate(self, project_id: int) -> BytesIO:
        """生成项目二维码，返回图片二进制流

        二维码内容：
        {base_url}/qr-arrival?project_id={project_id}

        返回:
            BytesIO: PNG格式二维码图片的二进制流，可直接返回给前端下载
        """
        url = f"{self.base_url}/qr-arrival?project_id={project_id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf
```

#### 9.5.2 `arrival_handler.py` - 到件信息处理

```python
# qr_arrival/arrival_handler.py
class ArrivalHandler:
    """现场到件信息处理器"""

    def validate_input(self, data: dict) -> dict:
        """校验现场录入信息

        校验规则：
        - 零件号：必填，长度 1-200
        - 到货数量：必填，正整数 > 0
        - 到货时间：必填，合法的日期时间格式
        - 备注：选填，最长 500 字符
        """
        pass

    def save_record(self, project_id: int, data: dict) -> int:
        """保存到件记录到 qr_arrival_records 表"""
        pass
```

#### 9.5.3 `matcher.py` - 三端匹配

```python
# qr_arrival/matcher.py
class ThreeWayMatcher:
    """三端匹配器：PBOM需求 ↔ 仓库到货 ↔ QR码录入"""

    MATCH_RESULT_MATCHED = "matched"     # 三端数量一致，线边到货
    MATCH_RESULT_PARTIAL = "partial"     # 部分匹配
    MATCH_RESULT_UNMATCHED = "unmatched" # 未匹配

    def match(self, project_id: int, part_code: str, arrival_qty: int) -> dict:
        """执行三端匹配

        返回:
            {
                "status": "matched" | "partial" | "unmatched",
                "message": "匹配说明",
                "detail": {
                    "demand_qty": 10,        # PBOM需求数量
                    "warehouse_qty": 10,      # 仓库到货数量
                    "arrival_qty": 10,        # QR码录入数量
                    "line_side_qty": 10,      # 线边到货数量（匹配后更新）
                }
            }
        """
        pass

    def update_part_status(self, project_id: int, part_code: str, result: dict):
        """根据匹配结果更新 project_parts 表的 line_side_status"""
        pass
```

### 9.6 依赖关系

`qr_arrival` 模块依赖以下模块：

| 依赖模块 | 依赖原因 |
|----------|----------|
| `projects` | 需要项目信息（project_id） |
| `pbom` | 需要PBOM零件清单（需求数量） |
| `crawlers` | 需要仓库到货数据（已入库数量） |

### 9.7 新增 Python 依赖

```txt
# QR码生成
qrcode[pil]>=7.4.2
Pillow>=10.0.0
```

---

## 十、核心业务流程（Phase 1）

```
用户操作流程：

 1. 用户创建项目
    • 填写项目名称、项目号、试制申请单号、车型
    ↓

 2. 管理员在系统设置配置各数据源凭证
    • WMS: Authorization token
    • 飞书: app_id + app_secret + sheet_url
    • 采购系统: 相应凭证
    ↓

 3. 用户触发爬虫
    • 可选择全量同步 / 增量同步
    • 爬虫并发抓取三个数据源
    • 数据存入 delivery_detail 表，标记 source
    ↓

 4. 用户上传 PBOM Excel 文件
    • 支持 .xlsx/.xls
    ↓

 5. 系统执行三层递进配置列检测
    • Step 1: 规则引擎排除法 → 输出候选配置列
    • 如果所有列置信度都 ≥ 0.6 → 自动确认
    • 如果有低置信度列 → 返回前端让用户确认
    • Step 2: LLM 补刀 → 对歧义列给出评分和理由
    • Step 3: 用户确认 → 用户勾选哪些是真正的配置列，可修改显示名
    ↓

 6. 系统解析保存 PBOM
    • 零件保存到 project_parts 表
    • 配置保存到 configs 表
    • 零件-配置关联保存到 part_configs 表
    ↓

 7. 用户执行 PBOM 匹配
    • 系统按项目号+申请单号筛选到货数据
    • 按零件号精确匹配
    • 汇总每个零件的已入库数量
    • 更新零件和项目统计
    • 计算项目到货率
    ↓

 8. 用户查看匹配结果
    • 汇总概览（总零件数、总需求量、到货率等）
    • 零件列表（显示需求量、已入库、到货率、状态）
    • 可筛选未到货零件
    • 可导出 Excel
    ↓

 9. 用户生成项目二维码
    • 点击"生成二维码"按钮
    • 系统生成包含项目ID的二维码图片
    • 用户可下载/打印二维码，贴在现场工位
    ↓

10. 现场人员扫码录入到件信息
    • 手机扫描二维码，打开填写页面
    • 输入零件号、到货数量、到货时间、备注
    • 提交到件信息
    ↓

11. 系统自动执行三端匹配
    • 端1：PBOM需求清单（零件号 + 需求数量）
    • 端2：仓库到货/工联单到货（爬虫数据）
    • 端3：QR码现场录入（扫码填写）
    • 三端数量一致 → 更新状态为"线边到货"
    • 不匹配 → 记录原因，等待人工处理
```

---

## 十一、技术栈与依赖

### 11.1 基于 spiderV4 延续

```txt
# 基础依赖（复用 V4）
fastapi==0.103.2
uvicorn==0.22.0
pymysql==1.1.0
DBUtils==3.0.2
python-dotenv==0.21.1
requests==2.31.0
openpyxl==3.1.2
xlrd==2.0.1
python-multipart==0.0.6
aiofiles==23.2.1
```

### 11.2 V5 新增依赖

```txt
# Phase 1 需要：QR码生成
qrcode[pil]>=7.4.2
Pillow>=10.0.0

# Phase 2 需要（可选项，不影响 Phase 1）
openai>=1.3.0

# Phase 3 需要（可选项，不影响 Phase 1/2）
ortools>=9.7.0
```

### 11.3 技术选型决策

| 组件 | 选型 | 理由 |
|------|------|------|
| Web 框架 | FastAPI | V4 已用，成熟，自动文档 |
| 数据库连接 | pymysql + DBUtils 连接池 | V4 已验证，稳定 |
| SQL 风格 | 原生 SQL | 简单直接，便于调试，不用学 ORM 语法 |
| 爬虫 | requests 同步 | V4 已验证，稳定，分页爬取不需要异步 |
| Excel 处理 | openpyxl + xlrd | V4 已用，功能满足 |
| LLM 调用 | OpenAI GPT-4o-mini | 成本低（$0.0005/次），能力足够 |
| 约束求解 | Google OR-Tools CP-SAT | 工业界标准，Python 集成方便 |
| QR码生成 | qrcode + Pillow | 轻量纯Python库，无需外部依赖 |

---

## 十二、实施计划

### 第 1 天：基础设施与项目结构

1. 创建后端目录结构
2. 复制并适配 V4 的 `config.py`、`database.py`、`logger.py`
3. 创建 `requirements.txt`
4. 创建 `.env` 配置模板
5. 编写 `main.py` 注册路由
6. 创建数据库初始化脚本 `scripts/init_db.py`

### 第 2 天：项目管理模块 + 爬虫模块

1. 实现 `projects/` 模块（models, schemas, crud, router）
2. 实现 `crawlers/base.py` 基类
3. 适配 V4 `wms_crawler.py`（把 V4 spider_main.py 改造为类）
4. 创建 `feishu_crawler.py` 和 `purchase_crawler.py` 框架（可后续实现具体逻辑）
5. 实现 `crawler_manager.py`
6. 实现爬虫 API 路由

### 第 3-4 天：PBOM 解析模块（核心）

1. 实现 `excel_parser.py` Excel 解析
2. 实现 `column_detector.py` 三层递进检测
3. 实现 `pbom_matcher.py` 匹配逻辑
4. 实现 CRUD 和路由
5. 数据入库逻辑（零件 + 配置 + 关联）

### 第 5 天：QR码现场到件模块

1. 实现 `qr_generator.py` 二维码生成
2. 实现 `arrival_handler.py` 到件信息处理
3. 实现 `matcher.py` 三端匹配逻辑
4. 实现 QR码到件 API 路由
5. 实现手机端到件信息填写页面（HTML模板）

### 第 6 天：Phase 1 联调测试

1. 端到端测试：创建项目 → 爬取 → 上传 → 解析 → 匹配 → 生成QR码 → 扫码到件 → 三端匹配
2. 修复 Bug
3. 优化错误提示

**Phase 1 完成！** 此时已经可以：
- ✅ 从三个数据源爬取到货数据存入数据库
- ✅ 上传 PBOM Excel 并识别配置列
- ✅ 匹配 PBOM 零件和到货数据
- ✅ 查看匹配结果和统计
- ✅ 生成项目二维码，现场扫码录入到件信息
- ✅ 三端匹配（PBOM需求 ↔ 仓库到货 ↔ 现场录入），更新线边到货状态
- ✅ 导出 Excel

### 第 7-8 天：Phase 2 开发

1. 实现 `delivery/` 去重合并模块
2. 实现 `critical_parts/` 评分模块
3. 联调测试

**Phase 2 完成！** 在 Phase 1 基础上新增：
- ✅ 多源数据去重合并
- ✅ LLM 关键件评分

### 第 9-11 天：Phase 3 开发

1. 实现 `scheduling/` BFWS + CP-SAT
2. 实现 `system/` 系统设置
3. 联调测试

**全部完成！**

---

## 十三、扩展性保证

### 13.1 新增数据源不影响现有代码

```
新增数据源 XYZ → 只需要新增 crawlers/xyz_crawler.py 继承 BaseCrawler → 在 CrawlerManager 注册 → 完成
不需要修改现有爬虫代码，不影响已有功能
```

### 13.2 新增匹配策略不影响现有代码

```
新增模糊匹配策略 → 只需要新增类继承 BaseMatcher → 在匹配逻辑中可选调用 → 完成
精确匹配依然可用，不受影响
```

### 13.3 参数全可配置

所有阈值、权重、超时时间都存在 `system_params` 表，通过界面可修改，**不需要改代码重启**。

### 13.4 数据库增量变更

Phase 2/3 新增表和字段，都是 `ALTER TABLE ADD COLUMN`，不影响已有数据。

---

## 🎯 总结

| Phase | 范围 | 预估工期 | 可独立运行 |
|-------|------|----------|-----------|
| Phase 1 | 项目管理 + 多源爬取 + PBOM解析匹配 + QR码现场到件 | 6 天 | ✅ 是 |
| Phase 2 | 去重合并 + 关键件评分 | +2 天 | 在 Phase 1 基础上增量 |
| Phase 3 | BFWS排程 + 系统设置 | +3 天 | 在 Phase 2 基础上增量 |

**核心设计思想：**
1. **充分复用 spiderV4 成熟代码**：数据库连接、日志、配置、WMS 爬虫直接复用
2. **模块化清晰分离**：每个功能一个目录，单向依赖，无循环依赖
3. **增量开发**：按优先级实现，每个阶段完成都可运行，后续新增不影响已有
4. **开闭原则**：通过抽象基类扩展，新增功能不修改已有代码
5. **满足需求**：完整覆盖 V5 需求文档的所有功能点

---

**问题确认：**

请确认以下几点：

1. **数据库**：是否使用现有的 `warehouse_data` 数据库，还是需要新建 `spider_v5` 数据库？
2. **飞书共享表和采购系统**：是否已有 API 接口文档？还是需要后续调研接入方式？
3. **LLM**：是否使用 OpenAI API，还是有内部 LLM 服务？
4. **是否同意当前的目录结构和模块划分**？

确认后我就开始按此设计创建代码。