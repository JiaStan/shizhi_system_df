# spiderV5 PBOM 智能装配系统

本项目包含 FastAPI 后端、静态页面以及一个前端参考工程。为减少体积，已移除 `node_modules`、`dist`、日志、缓存和编译产物；这些内容都可以通过依赖安装或构建命令重新生成。

## 目录结构

```text
spiderV5/
├── backend/          # FastAPI 后端服务
├── static/           # 当前可直接托管的静态页面与图片资源
├── webui_ref/        # React/Nest 前端参考工程源码
├── docs/             # 业务说明文档
└── uploads/          # 运行时上传目录，默认不纳入版本管理
```

## 后端运行

```bash
cd spiderV5
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
python backend/scripts/init_db.py
python backend/main.py
```

默认服务地址为 `http://localhost:8000`。如需修改数据库、端口、跨域域名或第三方接口密钥，请编辑 `backend/.env`。

## 前端参考工程

```bash
cd spiderV5/webui_ref
npm install
npm run dev
```

`webui_ref` 是参考工程源码，不再包含依赖目录和构建输出。需要生产构建时执行 `npm run build` 即可重新生成 `dist`。

## 打包建议

发布或传输源码时，只保留源码、配置模板、锁文件和必要静态资源。不要打包以下内容：

- `node_modules/`
- `dist/`、`build/`
- `logs/`
- `__pycache__/`、`*.pyc`
- `*.tsbuildinfo`
- `.env`
