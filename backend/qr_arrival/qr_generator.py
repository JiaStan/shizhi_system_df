import qrcode
from io import BytesIO
from typing import Optional
from backend.config import settings


class QRCodeGenerator:
    """项目二维码生成器

    生成包含项目ID的二维码，扫码后打开手机网页填写到件信息
    """

    def __init__(self, base_url: Optional[str] = None):
        if base_url is None:
            self.base_url = settings.qr_base_url
        else:
            self.base_url = base_url

    def generate(self, project_id: int) -> BytesIO:
        """生成项目二维码

        二维码内容: {base_url}/qr-arrival?project_id={project_id}

        Returns:
            BytesIO: PNG格式二维码图片的二进制流
        """
        url = f"{self.base_url}/qr-arrival.html?project_id={project_id}"
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


# 单例
_generator: Optional[QRCodeGenerator] = None


def get_qr_generator() -> QRCodeGenerator:
    global _generator
    if _generator is None:
        _generator = QRCodeGenerator()
    return _generator