import re
import pymysql
from datetime import datetime
import pytz  # 导入 pytz 模块以支持时区

db_config = {
    "host": "localhost",   # 使用 MySQL 容器的 IP 地址
    "user": "root",
    "password": "123456",
    "database": "diary_db",
    "charset": 'utf8mb4',
    "port": 3306,
}


def add_diary_to_db(tag, content, created_at, user_id=1):
    """
    将日记数据添加到数据库。
    """
    connection = None  # 初始化连接变量
    try:
        connection = pymysql.connect(**db_config)
        with connection.cursor() as cursor:
            sql = "INSERT INTO diary (tag, content, created_at, user_id) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (tag, content, created_at, user_id))
            connection.commit()
    except pymysql.MySQLError as e:
        print(f"Error {e.args[0]}, {e.args[1]}")
    finally:
        if connection:
            connection.close()


def process_md(file_path):
    """
    读取.md文件并处理每个分割的内容。
    """
    # 设置北京时区
    beijing_tz = pytz.timezone('Asia/Shanghai')
    
    with open(file_path, 'r', encoding='utf-8') as md_file:
        md_content = md_file.read()

        # 使用正则表达式匹配分割规则
        split_pattern = r'(## \d{4}/\d{1,2}/\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}:)'
        splits = re.split(split_pattern, md_content)

        # 去除第一个空字符串（因为第一个分割规则之前没有内容）
        splits = splits[1:]

        # 初始化变量以保存上一个时间戳和对应的内容
        prev_created_at = None
        prev_content = ""

        # 遍历分割后的内容并添加到数据库
        for i in range(len(splits) - 1, -1, -2):
            created_at_str = splits[i - 1].strip()  # 提取创建时间字符串
            created_at = datetime.strptime(created_at_str, '## %Y/%m/%d %H:%M:%S:')  # 将字符串转换为日期时间对象
            created_at = pytz.utc.localize(created_at)
            
            
            # 将时间戳添加到内容中
            content = splits[i - 1] + '\n' + splits[i].strip()

            add_diary_to_db("", content, created_at)  # 将内容添加到数据库


if __name__ == "__main__":
    md_file_path = 'diary.md'  # 更新为实际的.md文件路径
    process_md(md_file_path)
