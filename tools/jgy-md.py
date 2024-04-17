import io
import os
import re
import pymysql
from datetime import datetime
from dotenv import load_dotenv
from webdav4.client import Client

# 加载 .env 文件中的环境变量
load_dotenv()

# 通过 os.environ 访问环境变量
BASE_URL = os.environ.get('BASE_URL')
AUTH_USER = os.environ.get('AUTH_USER')
AUTH_PASSWORD = os.environ.get('AUTH_PASSWORD')
BIJIBEN = os.environ.get('BIJIBEN')
USERNAME = os.environ.get('USERNAME')
PASSWORD = os.environ.get('PASSWORD')

if not BASE_URL:
    raise TypeError("变量 BASE_URL 不能为 空或None ")
if not AUTH_USER:
    raise TypeError("变量 AUTH_USER  不能为 空或None")
if not AUTH_PASSWORD:
    raise TypeError("变量 AUTH_PASSWORD  不能为 空或None")
if not BIJIBEN:
    raise TypeError("变量 BIJIBEN  不能为 空或None")

# 初始化 webdav4 客户端
client = Client(base_url=BASE_URL, auth=(AUTH_USER, AUTH_PASSWORD))

# 初始化数据库连接配置
db_config = {
    "host": "localhost",   # 使用 MySQL 容器的 IP 地址
    "user": "root",
    "password": "123456",
    "database": "diary_db",
    "charset": 'utf8mb4',
    "port": 3306,
}

def download_file_from_jianguoyun(local_path):
    """
    从坚果云下载文件到本地。
    """
    try:
        # 从坚果云获取文件内容
        with client.open(path=BIJIBEN, mode='r', encoding='utf-8') as file:
            jianguoyun_content = file.read()
        
        # 将文件内容写入本地文件
        with open(local_path, 'w', encoding='utf-8') as local_file:
            local_file.write(jianguoyun_content)
        
        print("文件已成功下载到本地：", local_path)
    
    except Exception as e:
        print("下载文件时出现错误：", str(e))

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

            # 将时间戳添加到内容中
            content = splits[i - 1] + '\n' + splits[i].strip()

            add_diary_to_db("", content, created_at)  # 将内容添加到数据库

if __name__ == "__main__":
    # 要保存文件的本地路径
    local_path = "diary.txt"

    # 调用下载函数
    download_file_from_jianguoyun(local_path)

    # 调用处理 MD 文件函数
    process_md(local_path)
