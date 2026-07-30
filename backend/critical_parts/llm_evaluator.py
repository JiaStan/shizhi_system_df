from backend.config import settings
from backend.logger import logger


class LLMEvaluator:
    """LLM 智能评估器

    使用 DeepSeek API 对关键件进行二次评估，提供语义理解
    """

    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.model = settings.DEEPSEEK_MODEL

    def is_available(self) -> bool:
        return bool(self.api_key)

    def evaluate(self, part_name: str, scores: dict) -> str:
        """调用 LLM 对零件进行语义评估

        Args:
            part_name: 零件名称
            scores: 六维评分 {"assembly": 30, "size": 20, "disposal": 15, "safety": 15, "value": 10, "torque": 10}

        Returns:
            LLM 评估意见
        """
        if not self.is_available():
            return "LLM未配置，跳过评估"

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key, base_url=self.base_url)

            prompt = (
                f"你是一个汽车零部件专家。请评估以下零件的关键程度：\n\n"
                f"零件名称: {part_name}\n"
                f"装配顺序优先级: {scores.get('assembly', 0)}/30\n"
                f"零件大小/体量: {scores.get('size', 0)}/20\n"
                f"报废处理难度: {scores.get('disposal', 0)}/15\n"
                f"安全相关性: {scores.get('safety', 0)}/15\n"
                f"高价值零件: {scores.get('value', 0)}/10\n"
                f"关重力矩: {scores.get('torque', 0)}/10\n\n"
                f"请用一句话评估该零件的关键程度，并说明理由。"
            )

            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3,
            )

            result = response.choices[0].message.content.strip()
            logger.info("LLM评估完成: %s -> %s", part_name, result[:50])
            return result

        except Exception as e:
            logger.warning("LLM评估失败: %s", str(e))
            return f"评估失败: {str(e)}"