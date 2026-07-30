#!/usr/bin/env bash
# ====================================================================
#  spiderV5 打包脚本：生成 Windows 部署压缩包
#  用法：
#    chmod +x build_windows_package.sh
#    ./build_windows_package.sh
#  产物：
#    spiderV5_for_Windows_YYYYMMDD.zip
# ====================================================================

set -euo pipefail

# --- 1) 基本信息 ---
# 注意：$0 所在路径可能含特殊字符（如 ~），改用 PWD 显式传参更稳妥
SCRIPT_DIR="$(pwd)"
if [ -f "${SCRIPT_DIR}/build_windows_package.sh" ]; then
    PROJECT_ROOT="${SCRIPT_DIR}"
else
    # 回退方案：尝试相对路径查找
    PROBE="$(cd "$(dirname "$0")" && pwd -P)"
    if [ -d "${PROBE}/backend" ]; then
        PROJECT_ROOT="${PROBE}"
    else
        echo "[ERROR] 无法确定项目根目录，请在此脚本所在目录执行: cd /path/to/spiderV5 && ./build_windows_package.sh"
        exit 1
    fi
fi
cd "${PROJECT_ROOT}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PKG_DIR_NAME="spiderV5_for_Windows"
PKG_DIR="/tmp/${PKG_DIR_NAME}"
OUTPUT_ZIP="${PROJECT_ROOT}/${PKG_DIR_NAME}_${TIMESTAMP}.zip"

echo "============================================================"
echo " spiderV5 - Windows 部署包打包"
echo " 项目根目录:   ${PROJECT_ROOT}"
echo " 临时打包目录: ${PKG_DIR}"
echo " 输出文件:     ${OUTPUT_ZIP}"
echo "============================================================"

# --- 2) 清理旧临时目录 ---
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"

# --- 3) 复制核心源码 ---
echo "[1/7] 复制核心源码 (backend / static / index.html) ..."
mkdir -p "${PKG_DIR}/backend"
# 用 find 复制，规避 glob 对非 ASCII / 特殊路径的兼容问题
(cd "${PROJECT_ROOT}" && find backend -type d -exec mkdir -p "${PKG_DIR}/{}" \;)
(cd "${PROJECT_ROOT}" && find backend -type f -exec cp -f "{}" "${PKG_DIR}/{}" \;)
# 清理 Python 缓存文件
find "${PKG_DIR}/backend" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "${PKG_DIR}/backend" -type f -name "*.pyc" -delete 2>/dev/null || true
# 不复制真实的 .env（防止打包时带出密码），保留 .env.example 供用户生成
if [ -f "${PKG_DIR}/backend/.env" ]; then
    rm -f "${PKG_DIR}/backend/.env"
    echo "      已移除 backend/.env（防止泄露真实密码）"
fi

# 复制静态页面
mkdir -p "${PKG_DIR}/static"
if [ -d "${PROJECT_ROOT}/static" ]; then
    # 用 find -exec 复制，避免 shell 对非 ASCII 文件名的 glob 问题
    # 先确保目录结构存在
    (cd "${PROJECT_ROOT}" && find static -type d -exec mkdir -p "${PKG_DIR}/{}" \;)
    # 再复制文件
    (cd "${PROJECT_ROOT}" && find static -type f -exec cp -f "{}" "${PKG_DIR}/{}" \;)
fi

# 复制根目录 index.html
if [ -f "${PROJECT_ROOT}/index.html" ]; then
    cp "${PROJECT_ROOT}/index.html" "${PKG_DIR}/index.html"
fi

# 复制根目录的 .md / 其他说明文件
for f in README.md frontend-reproduction-spec.md PBOM智能装配路线图_合订版v2.md spiderV5_后端设计概要.md; do
    if [ -f "${PROJECT_ROOT}/${f}" ]; then
        cp "${PROJECT_ROOT}/${f}" "${PKG_DIR}/"
    fi
done

if [ -f "${PROJECT_ROOT}/insert_credentials.py" ]; then
    cp "${PROJECT_ROOT}/insert_credentials.py" "${PKG_DIR}/"
fi

# --- 4) 复制 docs 文档目录 ---
echo "[2/7] 复制业务说明文档 (docs/) ..."
if [ -d "${PROJECT_ROOT}/docs" ]; then
    cp -r "${PROJECT_ROOT}/docs" "${PKG_DIR}/docs"
fi

# --- 5) 复制 Windows 专用部署脚本 ---
echo "[3/7] 复制 Windows 部署脚本 (windows_setup/) ..."
if [ -d "${PROJECT_ROOT}/windows_setup" ]; then
    cp -r "${PROJECT_ROOT}/windows_setup" "${PKG_DIR}/windows_setup"
else
    echo "      [警告] 未找到 windows_setup 目录，跳过"
fi

# --- 6) 创建运行时目录（空目录，保证 Windows 解压后有对应文件夹） ---
echo "[4/7] 创建必要的空目录 (logs/ / uploads/) ..."
mkdir -p "${PKG_DIR}/logs"
mkdir -p "${PKG_DIR}/uploads"
# 添加占位文件（防止某些压缩工具丢弃空目录）
echo "# spiderV5 runtime log directory" > "${PKG_DIR}/logs/.gitkeep"
echo "# spiderV5 runtime upload directory" > "${PKG_DIR}/uploads/.gitkeep"

# --- 7) 复制前端参考工程（可选，体积较大时建议单独分发） ---
echo "[5/7] 复制前端参考工程 (webui_ref/) ..."
if [ -d "${PROJECT_ROOT}/webui_ref" ]; then
    # 排除 node_modules / dist 等大目录
    mkdir -p "${PKG_DIR}/webui_ref"
    # 使用 rsync 精确复制，若没有 rsync 则退化为 cp 并手动清理
    if command -v rsync >/dev/null 2>&1; then
        rsync -a \
            --exclude 'node_modules' \
            --exclude 'dist' \
            --exclude 'build' \
            --exclude '.git' \
            --exclude '*.log' \
            "${PROJECT_ROOT}/webui_ref/" "${PKG_DIR}/webui_ref/"
    else
        cp -r "${PROJECT_ROOT}/webui_ref"/* "${PKG_DIR}/webui_ref/"
        rm -rf "${PKG_DIR}/webui_ref/node_modules" \
               "${PKG_DIR}/webui_ref/dist" \
               "${PKG_DIR}/webui_ref/build" \
               "${PKG_DIR}/webui_ref/.git" 2>/dev/null || true
        find "${PKG_DIR}/webui_ref" -type f -name "*.log" -delete 2>/dev/null || true
    fi
fi

# --- 8) 在根目录增加 Windows 快速启动指引文件 ---
echo "[6/7] 写入根目录快速启动说明 ..."
cat > "${PKG_DIR}/Windows_快速部署指南.txt" <<'EOF'
============================================================
 spiderV5 —— Windows 快速部署指引
============================================================

初次部署（仅需执行一次）：
    1. 双击 windows_setup\step1_create_mysql_db.bat
         -> 输入 MySQL root 密码，自动创建 warehouse_data 数据库
    2. 双击 windows_setup\step2_configure_env.bat
         -> 生成 backend\.env，按提示修改数据库密码
    3. 双击 windows_setup\step3_install_python_deps.bat
         -> 安装 Python 依赖（自动使用清华镜像加速）
    4. 双击 windows_setup\step4_init_db_tables.bat
         -> 初始化数据库表结构

日常运行：
    5. 双击 windows_setup\step5_start_server.bat
         -> 启动服务，浏览器访问 http://localhost:8000

懒人模式：
    双击 windows_setup\run_all.bat 一键执行 1~5 步。

详细说明：
    见 windows_setup\README_WINDOWS.txt

============================================================
EOF

cat > "${PKG_DIR}/Quick_Start_Windows.txt" <<'EOF'
============================================================
 spiderV5 —— Quick Start for Windows (English)
============================================================

1) Prerequisites
   - Python 3.8+ installed AND added to PATH
   - MySQL 5.7 or 8.0 running on 127.0.0.1:3306
   - Know MySQL root password

2) First-Time Deployment (run once)
   Double-click in this order:
     - windows_setup\step1_create_mysql_db.bat     (create DB)
     - windows_setup\step2_configure_env.bat        (edit .env)
     - windows_setup\step3_install_python_deps.bat  (install deps)
     - windows_setup\step4_init_db_tables.bat       (create tables)

3) Daily Run
   Double-click:
     - windows_setup\step5_start_server.bat
   Then open your browser at:  http://localhost:8000

4) One-Click Alternative
   Double-click:  windows_setup\run_all.bat

For details, see: windows_setup\README_WINDOWS.txt
============================================================
EOF

# --- 9) 打包为 zip ---
echo "[7/7] 生成压缩包 ${OUTPUT_ZIP} ..."
cd /tmp
rm -f "${OUTPUT_ZIP}"
# 使用 zip 命令，若没有则使用 python -m zipfile
if command -v zip >/dev/null 2>&1; then
    zip -r -q "${OUTPUT_ZIP}" "${PKG_DIR_NAME}"
else
    echo "      (未检测到 zip 命令，改用 python 压缩)"
    python3 -c "
import zipfile, os
src='${PKG_DIR}'
out='${OUTPUT_ZIP}'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        for fn in files:
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, os.path.dirname(src))
            z.write(full, rel)
    print(f'      ZIP written: {os.path.getsize(out)} bytes')
"
fi

# --- 10) 显示结果 ---
SIZE_KB=$(( ( $(stat -c%s "${OUTPUT_ZIP}") + 1023 ) / 1024 ))
echo ""
echo "============================================================"
echo " 打包完成！"
echo "   文件: ${OUTPUT_ZIP}"
echo "   大小: ${SIZE_KB} KB ($(( SIZE_KB / 1024 )) MB)"
echo ""
echo " 下一步："
echo "   1) 将此 .zip 文件复制到 Windows 机器"
echo "   2) 解压到任意目录（例如 C:\spiderV5\）"
echo "   3) 按 windows_setup\README_WINDOWS.txt 执行部署"
echo "============================================================"

# 可选：清理临时目录
echo "是否删除临时打包目录 ${PKG_DIR}？[Y/n] "
read -r cleanup_choice
if [ -z "$cleanup_choice" ] || [ "$cleanup_choice" = "Y" ] || [ "$cleanup_choice" = "y" ]; then
    rm -rf "$PKG_DIR"
    echo "已清理。"
fi