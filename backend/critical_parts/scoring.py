from backend.database import query_one, query_all
from backend.logger import logger


class CriticalScorer:
    """关键件六维评分（基于PBOM零件关键程度评价标准）

    评分维度及权重:
    - 装配顺序优先级: 30分
    - 零件大小/体量: 20分
    - 报废处理难度: 15分
    - 安全相关性: 15分
    - 高价值零件: 10分
    - 关重力矩: 10分

    满分 100 分

    分级标准:
    - ≥68分 → 关键件（红色）
    - 40-67分 → 一般件（黄色）
    - <40分 → 次要件（绿色）
    """

    def __init__(self):
        pass

    def _score_assembly_order(self, part_name: str) -> int:
        """装配顺序优先级评分（30分）
        
        内饰一/内饰二/仪表分装=30分; 车门/发动机/前桥/后桥/前端模块分装=20分; 
        底盘一/底盘二=15分; 最终线=10分
        """
        name = part_name.lower()
        keywords_30 = ["内饰", "仪表分装", "仪表"]
        keywords_20 = ["车门", "发动机", "前桥", "后桥", "前端模块", "前端分装"]
        keywords_15 = ["底盘", "车桥"]
        keywords_10 = ["最终线", "总装线"]
        
        if any(kw in name for kw in keywords_30):
            return 30
        if any(kw in name for kw in keywords_20):
            return 20
        if any(kw in name for kw in keywords_15):
            return 15
        if any(kw in name for kw in keywords_10):
            return 10
        return 10

    def _score_size(self, part_name: str) -> int:
        """零件大小/体量评分（20分）
        
        大件(总成/电池/电机/座椅/保险杠/雷达/灯/转向盘等)=20分; 
        中件(线束/水管/支架等)=10分; 小件(螺栓/螺母/堵盖/卡扣/标签等)=5分
        """
        name = part_name.lower()
        keywords_big = ["总成", "电池", "电机", "座椅", "保险杠", "雷达", "灯", "转向盘",
                        "车身", "底盘", "发动机", "变速箱", "车架", "大梁", "空调", "轮胎"]
        keywords_small = ["螺栓", "螺母", "堵盖", "卡扣", "标签", "垫片", "垫圈", "螺钉",
                         "螺丝", "销", "铆钉", "弹簧", "夹子"]
        keywords_medium = ["线束", "水管", "支架", "油管", "线束总成", "护板", "盖板",
                          "装饰板", "密封条", "软管"]
        
        if any(kw in name for kw in keywords_big):
            return 20
        if any(kw in name for kw in keywords_small):
            return 5
        if any(kw in name for kw in keywords_medium):
            return 10
        return 10

    def _score_disposal(self, part_name: str) -> int:
        """报废处理难度评分（15分）
        
        高(电池/燃油/制冷剂/机油/制动液相关)=15分; 
        一般=10分; 低(紧固件/堵盖/标签等)=5分
        """
        name = part_name.lower()
        keywords_high = ["电池", "燃油", "制冷剂", "冷媒", "机油", "润滑油", "制动液",
                        "冷却液", "液压油", "气囊", "安全气囊"]
        keywords_low = ["螺栓", "螺母", "堵盖", "卡扣", "标签", "垫片", "垫圈", "螺钉",
                       "螺丝", "铆钉"]
        
        if any(kw in name for kw in keywords_high):
            return 15
        if any(kw in name for kw in keywords_low):
            return 5
        return 10

    def _score_safety(self, part_name: str) -> int:
        """安全相关性评分（15分）
        
        高(制动/转向/气囊/安全带/雷达/灯/后视镜/轮胎/摄像头等)=15分; 
        一般=10分; 低(装饰件/堵盖/标签等)=5分
        """
        name = part_name.lower()
        keywords_high = ["制动", "刹车", "转向", "气囊", "安全气囊", "安全带", "雷达",
                        "灯", "后视镜", "轮胎", "摄像头", "ABS", "ESP", "安全",
                        "防撞", "防抱死", "电控稳定"]
        keywords_low = ["装饰", "堵盖", "标签", "贴纸", "饰条", "盖板", "护板"]
        
        if any(kw in name for kw in keywords_high):
            return 15
        if any(kw in name for kw in keywords_low):
            return 5
        return 10

    def _score_value(self, part_name: str) -> int:
        """高价值零件评分（10分）
        
        高(电池/控制器/显示屏/座椅/雷达/智能驾驶模块/灯/转向盘等)=10分; 
        一般=5分; 低(紧固件等)=2分
        """
        name = part_name.lower()
        keywords_high = ["电池", "控制器", "显示屏", "座椅", "雷达", "智能驾驶",
                        "自动驾驶", "导航", "中控", "车机", "灯", "转向盘", "电机",
                        "变速箱", "空调", "音响", "传感器"]
        keywords_low = ["螺栓", "螺母", "螺钉", "螺丝", "垫片", "垫圈", "销",
                       "铆钉", "卡扣", "堵盖"]
        
        if any(kw in name for kw in keywords_high):
            return 10
        if any(kw in name for kw in keywords_low):
            return 2
        return 5

    def _score_torque(self, part_name: str, torque_mark: str = "") -> int:
        """关重力矩评分（10分）
        
        有★标识=10分; 有工作力矩要求无★=5分; 无力矩要求=2分
        """
        if torque_mark and "★" in torque_mark:
            return 10
        
        name = part_name.lower()
        keywords_torque = ["螺栓", "螺母", "螺钉", "螺丝", "紧固", "连接", "安装"]
        
        if any(kw in name for kw in keywords_torque):
            return 5
        return 2

    def score_part(self, part_name: str, torque_mark: str = "") -> tuple:
        """计算单个零件的总分
        
        Returns:
            (score: int, critical_level: str, is_critical: bool)
        """
        scores = [
            self._score_assembly_order(part_name),
            self._score_size(part_name),
            self._score_disposal(part_name),
            self._score_safety(part_name),
            self._score_value(part_name),
            self._score_torque(part_name, torque_mark),
        ]
        
        total = sum(scores)
        
        if total >= 68:
            level = "red"
        elif total >= 40:
            level = "yellow"
        else:
            level = "green"
        
        is_critical = total >= 68
        return total, level, is_critical, scores

    def score_project_parts(self, project_id: int) -> dict:
        """对项目所有零件进行评分"""
        parts = query_all(
            "SELECT pp.part_code, pp.part_name, pp.demand_quantity, pp.received_quantity "
            "FROM project_parts pp WHERE pp.project_id = %s",
            (project_id,),
        )
        
        if not parts:
            return {"total_parts": 0, "red_count": 0, "yellow_count": 0, "green_count": 0, "parts": []}
        
        results = []
        red = yellow = green = 0
        
        for p in parts:
            part_name = (p.get("part_name") or p.get("part_code") or "").lower()
            torque_mark = p.get("process_requirement") or p.get("remark") or ""
            
            total, level, is_critical, scores = self.score_part(part_name, torque_mark)
            
            if level == "red":
                red += 1
            elif level == "yellow":
                yellow += 1
            else:
                green += 1
            
            reasons = []
            if scores[0] >= 20:
                reasons.append("装配优先级高")
            if scores[1] == 20:
                reasons.append("大件")
            if scores[2] == 15:
                reasons.append("报废难度高")
            if scores[3] == 15:
                reasons.append("安全件")
            if scores[4] == 10:
                reasons.append("高价值")
            if scores[5] >= 5:
                reasons.append("关重力矩")
            reason = "、".join(reasons) if reasons else "常规件"
            
            results.append({
                "part_code": p.get("part_code", ""),
                "part_name": p.get("part_name"),
                "assembly_score": scores[0],
                "size_score": scores[1],
                "disposal_score": scores[2],
                "safety_score": scores[3],
                "value_score": scores[4],
                "torque_score": scores[5],
                "critical_score": total,
                "critical_level": level,
                "is_critical": is_critical,
                "reason": reason,
            })
        
        logger.info("关键件评分完成: 项目=%d, 总数=%d, 关键=%d, 一般=%d, 次要=%d",
                     project_id, len(results), red, yellow, green)
        
        return {
            "total_parts": len(results),
            "red_count": red,
            "yellow_count": yellow,
            "green_count": green,
            "parts": results,
        }
