from PIL import Image

# 打开图像文件
image = Image.open(r"web\static\img\path\to\favicon.png")

# 调整图像大小为32x32像素
image_resized = image.resize((32, 32))

# 保存调整大小后的图像
image_resized.save(r"web\static\img\path\to\favicon-32x32.png")
