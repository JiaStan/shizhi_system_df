---
kind: external_dependency
name: DeepSeek 大模型（关键件语义评估）
slug: deepseek-llm
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
source_files:
    - backend/critical_parts/llm_evaluator.py
    - backend/config.py
    - backend/.env.example
    - backend/requirements.txt
---

### DeepSeek LLM
- 角色：对关键件进行二次语义评估，结合六维量化分数生成“一句话评估意见”，辅助分级决策。
- 调用参数：`max_tokens=200`、`temperature=0.3`，prompt 将零件名称与装配顺序/大小/报废难度/安全/价值/关重力矩六项分数拼接传入。
- 验证要点：该能力为 Phase 2 可选依赖，不影响主流程；若网络不可达或配额耗尽会返回错误字符串而非抛异常。