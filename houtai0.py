#houtai.py
import os
import csv
import re
from webdav4.client import Client
import io
import pymysql
import logging
import time
from webdav4.client import Client
from flask import Flask, request, jsonify, render_template,send_from_directory
import conf as CONF
from dotenv import load_dotenv
from token_verify import token_required
from token_verify import generate_token
app = Flask(__name__, template_folder=CONF.TEMPLATE_DIR,static_folder="data")

# 设置密钥，用于签名和验证 JWT
secret_key = "your_secret_key"

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


client = Client(base_url=BASE_URL,
                auth=(AUTH_USER, AUTH_PASSWORD))
# BIJIBEN = '/2022-1-1-笔记本/2022-1-1-Logseq/pages/笔记本.md'


# MySQL 连接配置
max_attempts = 5
attempts = 0
connection = None

# 等待MySQL服务准备好
while attempts < max_attempts:
    try:
        # 尝试连接MySQL
        connection = pymysql.connect(
            host="mysql",
            user="test",
            password="123456",
            database="diary_db",
            charset='utf8mb4',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor,
        )
        # 如果连接成功，退出循环
        break
    except pymysql.Error as err:
        # 如果连接失败，等待一段时间后重试
        attempts += 1
        logging.error(f"Failed to connect to MySQL (Attempt {attempts}/{max_attempts})")
        time.sleep(1)

# 检查是否成功连接，否则抛出错误
if attempts == max_attempts:
    raise ConnectionError("Failed to connect to MySQL after maximum attempts")

# 创建数据库
def create_database():
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS diary_db")
    connection.commit()

# 创建用户表
def create_user_table():
    with connection.cursor() as cursor:
        cursor.execute("""CREATE TABLE IF NOT EXISTS diary_db.user (
                          id INT NOT NULL AUTO_INCREMENT,
                          username VARCHAR(255) NOT NULL,
                          password VARCHAR(255) NOT NULL,
                          registration_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (id),
                          UNIQUE KEY (username)
                      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    connection.commit()

# 创建日记表
def create_diary_table():
    with connection.cursor() as cursor:
        cursor.execute("""CREATE TABLE IF NOT EXISTS diary_db.diary (
                          id INT NOT NULL AUTO_INCREMENT,
                          user_id INT NOT NULL,
                          title VARCHAR(255) NOT NULL,
                          content TEXT,
                          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (id),
                          FOREIGN KEY (user_id) REFERENCES user(id)
                      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    connection.commit()

# 检查并创建数据库和表
create_database()
create_user_table()
create_diary_table()


def int_csv():
    # 要创建的文件路径
    file_path = CONF.DIARY_CSV_DIR

    # 判断文件是否存在
    if not os.path.exists(file_path):
        # 如果文件不存在，创建该文件
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write('diary-log,tags')

        print(f'File {file_path} has been created.')
    else:
        with open(file_path, 'r+', encoding='utf-8') as file:
            if not file.read():
                file.write('diary-log,tags')
        print(f'File {file_path} already exists.')


def int_csv_t():
    # 要创建的文件路径
    file_path = CONF.ZTB_CSV_DIR

    # 判断文件是否存在
    if not os.path.exists(file_path):
        # 如果文件不存在，创建该文件
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write('diary-log,tags')

        print(f'File {file_path} has been created.')
    else:
        with open(file_path, 'r+', encoding='utf-8') as file:
            if not file.read():
                file.write('diary-log,tags')
        print(f'File {file_path} already exists.')

@app.route('/')
def index_html():
    
    return render_template('index.html')


@app.route('/login.html')
def login_htnl():    
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():

    # 获取请求中的用户名和密码
    request_data = request.get_json()
    username = request_data.get('username')
    password = request_data.get('password')

    # 固定密码， 以后有需求再改
    if  USERNAME == username and  PASSWORD == password:
        user_id = 1 # 假设'user_id' == 1
        token = generate_token(user_id)
        return jsonify({"token": token})

    return jsonify({"error": "Invalid credentials"}), 401


@app.route('/index.js')
def index_js():
    return send_from_directory('static', 'index.js')

@app.route('/static/index.css')
def index_css():
    return send_from_directory('static', 'index.css')

@app.route('/delete_diary/<int:diary_id>', methods=['DELETE'])
@token_required
def delete_diary(diary_id):
    # 从 CSV 文件中删除日记条目
    with open(CONF.DIARY_CSV_DIR, 'r', newline='', encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')
        data = []
        for i, row in enumerate(reader):
            if i != diary_id:
                data.append(row)
    with open(CONF.DIARY_CSV_DIR, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file, delimiter=',')
        writer.writerows(data)

    # 返回成功消息
    return jsonify({'status': 'success'})

@app.route('/tp.html')
def tp():
    
    return render_template('tp.html')


@app.route('/ztb.html')
def ztb():
    return render_template('ztb.html')


@app.route('/submit_diary', methods=['POST'])
def submit_diary():
    # 获取 JSON 格式的表单数据
    data = request.json

    # 获取日记内容
    origin_content = data['content']
    content = origin_content+'\n'+'*'*80+'\n'

    # 打开CSV文件并读取数据
    with open(CONF.DIARY_CSV_DIR, 'r+', newline='', encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')
        data = list(reader)

        # 匹配标签，找到所有的标签
        matches = re.findall(r"(?<!#)#\w+(?<!#)\s", content)
        tags = [match.strip('# \n') for match in matches]
        new_row = [content, ",".join(tags)]

        if not data:
            data.insert(0, new_row)
        else:
            data.insert(1, new_row)
        file.seek(0)
        writer = csv.writer(file, delimiter=',')
        writer.writerows(data)

    # 将新的日记内容发送到坚果云一个文件，是将日记内容更新到文件最前面
    with client.open(path=BIJIBEN, mode='r', encoding='utf-8') as file:
        jianguoyun_content = file.read()

    # 将文本数据写入 io.StringIO 对象
    text_data = content + jianguoyun_content
    fileobj = io.BytesIO(text_data.encode('utf-8'))
    # 将数据从 io.StringIO 对象上传到远程文件
    client.upload_fileobj(fileobj, BIJIBEN, overwrite=True)

    # 刷新页面
    return jsonify({'status': 'success', 'refresh': True})

@app.route('/submit_ztb', methods=['POST'])
def submit_diary_z():
    # 获取 JSON 格式的表单数据
    data = request.json
    #print(data)

    # 获取日记内容
    origin_content = data['content']
    content = origin_content+'\n'+'*'*80+'\n'

    # 打开CSV文件并读取数据
    
    with open(CONF.ZTB_CSV_DIR, 'r+', newline='',encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')
        data = list(reader)
        
        # 匹配标签，找到所有的标签
        matches = re.findall(r"(?<!#)#\w+(?<!#)\s", content)
        tags = [match.strip('# \n') for match in matches]
        new_row = [content,",".join(tags)]

        if not data:
            data.insert(0, new_row)
        else:
            data.insert(1, new_row)
        file.seek(0)
        writer = csv.writer(file, delimiter=',')
        writer.writerows(data)    

    # 返回保存的日记
    diary = {'content': content}
    return jsonify(diary)


@app.route('/get_diaries', methods=['GET'])
@token_required
def get_diaries():
    
    # 从文件中读取所有日记
        
    with open(CONF.DIARY_CSV_DIR, 'r+', newline='',encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')  
        diaries = list(reader)
        diaries = [{'content': line[0], 'lineNumber': index+1}
                   for index, line in enumerate(diaries[1:])]

    # 返回日记列表
    return jsonify(diaries)

@app.route('/get_ztb', methods=['GET'])
@token_required
def get_diaries_z():
      
    with open(CONF.ZTB_CSV_DIR, 'r+', newline='',encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')
        diaries = list(reader)
        diaries = [{'content': line[0]} for line in diaries[1:]]

    # 转换为字符串，二进制形式
    return jsonify(diaries)

if __name__ == '__main__':
    # 初始化csv文件
    int_csv()
    int_csv_t()
    # host 改为 0.0.0.0 或者本机的公网IP，否则外网方问有问题
    app.run(host="0.0.0.0", port=5050)
    
    
