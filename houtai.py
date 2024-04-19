import io
import os
import re
import pymysql
import csv
import logging
import time
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from webdav4.client import Client
from flask import Flask, request, jsonify, render_template, send_from_directory, url_for, redirect, session, make_response
import conf as CONF

# 初始化 Flask 应用
app = Flask(__name__, template_folder="templates", static_folder="static")
# 设置密钥，用于签名和验证 JWT
app.secret_key = "your_secret_key"


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
client = Client(base_url=BASE_URL,auth=(AUTH_USER, AUTH_PASSWORD))

# 初始化数据库连接配置
db_config = {
    "host": "mysql",   # 使用 MySQL 容器的 IP 地址或主机名
    "user": "test",
    "password": "123456",
    "database": "diary_db",
    "charset": 'utf8mb4',
    "port": 3306,
}

# MySQL 连接配置
max_attempts = 54
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


#检查当前的连接是否有效，如果无效（例如，因为连接已经关闭），则尝试重新建立连接。
def get_db_connection():
    global connection
    try:
        # 尝试查询以检查连接是否仍然有效
        connection.ping(reconnect=True)
    except (pymysql.err.OperationalError, pymysql.err.InterfaceError, AttributeError):
        # 连接无效，尝试重新连接
        logging.info("Reconnecting to the MySQL database...")
        connection = pymysql.connect(
            host="mysql",
            user="test",
            password="123456",
            database="diary_db",
            charset='utf8mb4',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor,
        )
    return connection


# 创建数据库和表格
def create_database_tables():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS diary_db")
        cursor.execute("""CREATE TABLE IF NOT EXISTS diary_db.user (
                          id INT NOT NULL AUTO_INCREMENT,
                          username VARCHAR(255) NOT NULL,
                          password VARCHAR(255) NOT NULL,
                          registration_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (id),
                          UNIQUE KEY (username)
                      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS diary_db.diary (
                        id INT NOT NULL AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        tag TEXT ,
                        content LONGTEXT,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        FOREIGN KEY (user_id) REFERENCES user(id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS diary_db.paste (
                        id INT NOT NULL AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        tag TEXT,
                        content TEXT,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        FOREIGN KEY (user_id) REFERENCES user(id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    connection.commit()
    
    # 创建粘贴板表
def create_paste_table():
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        cursor.execute("""CREATE TABLE IF NOT EXISTS diary_db.paste (
                        id INT NOT NULL AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        tag TEXT,
                        content TEXT,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        FOREIGN KEY (user_id) REFERENCES user(id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    connection.commit()


# 从坚果云下载文件内容到内存中
def download_file_from_jianguoyun():
    try:
        # 从坚果云获取文件内容
        with client.open(path=BIJIBEN, mode='r', encoding='utf-8') as file:
            jianguoyun_content = file.read()
        return jianguoyun_content
    except Exception as e:
        logging.error("下载文件时出现错误：", str(e))
        return None
        
        
# 处理 Markdown 文件
def process_md(content):
    # 清空数据库中的日记记录
    clear_diary_table()

    # 使用正则表达式匹配分割规则
    split_pattern = r'(## \d{4}/\d{1,2}/\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}:)'
    splits = re.split(split_pattern, content)

    splits = splits[1:]  # 去除第一个空字符串（因为第一个分割规则之前没有内容）

    for i in range(len(splits) - 1, -1, -2):
        created_at_str = splits[i - 1].strip()  # 提取创建时间字符串
        created_at = datetime.strptime(created_at_str, '## %Y/%m/%d %H:%M:%S:')  # 将字符串转换为日期时间对象

        content = splits[i - 1] + '\n' + splits[i].strip()

        add_diary_to_db("", content, created_at)  # 将内容添加到数据库


def clear_diary_table():
    """
    清空 diary 表中的所有记录。
    """
    connection = get_db_connection()  # 使用前面定义的 get_db_connection 方法获取数据库连接
    try:
        with connection.cursor() as cursor:
            sql = "DELETE FROM diary"
            cursor.execute(sql)
            connection.commit()
    except pymysql.MySQLError as e:
        print(f"Error {e.args[0]}, {e.args[1]}")
    finally:
        if connection:
            connection.close()


# 添加日记到数据库
def add_diary_to_db(tag, content, created_at, user_id=1):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO diary (tag, content, created_at, user_id) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (tag, content, created_at, user_id))
            connection.commit()
    except pymysql.MySQLError as e:
        print(f"Error {e.args[0]}, {e.args[1]}")
    finally:
        if connection:
            connection.close()





# 注册用户
def register_user(username, password):
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        try:
            sql = "INSERT INTO user (username, password) VALUES (%s, %s)"
            cursor.execute(sql, (username, password))
            connection.commit()
            return None
        except pymysql.IntegrityError:
            return "Username already exists"

# 编辑日记
def edit_diary(diary_id, tag, content):
    connection = get_db_connection()  # 获取有效的数据库连接
    # 添加日志
    logging.info(f"Editing diary with ID {diary_id}, tag: {tag}, content: {content}")
    with connection.cursor() as cursor:
        try:
            sql = "UPDATE diary SET tag=%s, content=%s WHERE id=%s"
            cursor.execute(sql, (tag, content, diary_id))
            connection.commit()
            logging.info("Diary successfully edited.")
        except Exception as e:
            logging.error(f"Error editing diary: {e}")
    sync_diaries_to_jianguoyun()
    

# 删除日记
def delete_diary(diary_id):
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        sql = "DELETE FROM diary WHERE id=%s"
        cursor.execute(sql, (diary_id,))
        connection.commit()
    sync_diaries_to_jianguoyun()
    

# 添加日记
def add_diary(tag, content, user_id):
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        sql = "INSERT INTO diary (tag, content, user_id) VALUES (%s, %s, %s)"
        cursor.execute(sql, (tag, content, user_id))
        connection.commit()
        

# 获取当前登录用户的所有日记，按创建时间降序排序
def get_user_diaries(user_id):
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        # sql = "SELECT * FROM diary WHERE user_id=%s ORDER BY created_at DESC"
        sql = "SELECT * FROM diary WHERE user_id=%s ORDER BY id DESC"
        cursor.execute(sql, (user_id,))
        return cursor.fetchall()


# 用户登录
def login_user(username, password):
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM user WHERE username=%s AND password=%s", (username, password))
        user = cursor.fetchone()
        if user:
            return user
        else:
            return None

# 生成JWT Token
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1)  # Token有效期1天
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token

# 验证JWT Token
def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None  # Token已过期
    except jwt.InvalidTokenError:
        return None  # Token无效

# 登录验证装饰器
def login_required(route_function):
    def wrapper(*args, **kwargs):
        token = session.get('token')
        if not token:
            return redirect(url_for('login'))
        user_id = verify_token(token)
        if not user_id:
            return redirect(url_for('login'))
        return route_function(*args, **kwargs)  # 返回被装饰的函数
    wrapper.__name__ = route_function.__name__
    return wrapper

#获取所有日记内容，并将它们格式化为一个字符串
def get_all_diaries_formatted():
    connection = get_db_connection()  # 获取有效的数据库连接
    with connection.cursor() as cursor:
        sql = "SELECT * FROM diary ORDER BY id DESC"
        cursor.execute(sql)
        diaries = cursor.fetchall()
        # 格式化日记内容
        formatted_diaries = ""
        for diary in diaries:
            formatted_diaries += f"{diary['content']}\n"
        return formatted_diaries
    
#坚果云更新函数
def sync_diaries_to_jianguoyun():
    connection = get_db_connection()  # 获取有效的数据库连接
    # 获取格式化后的所有日记内容
    formatted_diaries = get_all_diaries_formatted()
    # 将文本数据转换为字节流
    fileobj = io.BytesIO(formatted_diaries.encode('utf-8'))
    # 上传到坚果云
    try:
        client.upload_fileobj(fileobj, BIJIBEN, overwrite=True)
    except Exception as e:
        logging.error(f"Error uploading diaries to JianguoYun: {e}")



@app.route('/get_diaries')
@login_required
def get_diaries():
    user_id = verify_token(session.get('token'))
    diaries = get_user_diaries(user_id)
    return jsonify(diaries)



@app.route('/tp.html')
def tp():
    
    return render_template('tp.html')


@app.route('/ztb.html')
def ztb():
    return render_template('ztb.html')



# 添加笔记
@app.route('/submit_diary', methods=['POST'])
def submit_diary():
    # 获取 JSON 格式的表单数据
    data = request.json
    
    # 获取日记内容
    origin_content = data['content']
    content = origin_content + '\n'

    # 解析session中的token获取user_id
    token = session.get('token')
    user_id = verify_token(token)
    if user_id is None:
        return jsonify({'status': 'error', 'message': 'User not authenticated'})

    # 将日记内容插入数据库
    tag = ""  # 假设没有从客户端发送 tag 数据
    add_diary(tag, content, user_id)  # 调用添加日记的函数
    
    # 将新的日记内容发送到坚果云一个文件，是将日记内容更新到文件最前面
    with client.open(path=BIJIBEN, mode='r', encoding='utf-8') as file:
        jianguoyun_content = file.read()

    # 将文本数据写入 io.BytesIO 对象
    text_data = content + jianguoyun_content
    fileobj = io.BytesIO(text_data.encode('utf-8'))
    
    # 将数据从 io.BytesIO 对象上传到远程文件并添加文件上传错误处理
    try:
        client.upload_fileobj(fileobj, BIJIBEN, overwrite=True)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error uploading file: {str(e)}'})
    
    # 返回 JSON 响应，指示客户端刷新页面
    return jsonify({'status': 'success', 'refresh': True})

#拉取坚果云文件并处理
@app.route('/pull_from_jianguoyun', methods=['GET'])
def ull_from_jianpguoyun():
    try:
        # 要保存文件的本地路径
        # local_path = "diary.md"  # 假设你想将文件保存为diary.md

        # 调用下载函数
        jianguoyun_content = download_file_from_jianguoyun()

        # 调用处理 MD 文件函数
        process_md(jianguoyun_content)

        return jsonify({"status": "success", "message": "文件已成功从坚果云拉取并处理。"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})



#编辑笔记
@app.route('/edit/<int:diary_id>', methods=['GET', 'POST'])
@login_required
def edit(diary_id):
    print("Inside edit view function")
    if request.method == 'GET':
        with connection.cursor() as cursor:
            sql = "SELECT * FROM diary WHERE id=%s"
            cursor.execute(sql, (diary_id,))
            diary = cursor.fetchone()
        return render_template('edit.html', diary=diary)
    elif request.method == 'POST':
        tag = request.form['tag']
        content = request.form['content']
        edit_diary(diary_id, tag, content)
        return redirect(url_for('index'))
    


#用户登录
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    elif request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = login_user(username, password)
        if user:
            token = generate_token(user['id'])
            session['token'] = token
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error="Invalid username or password")
        
        
#用户注册
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
    elif request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        error = register_user(username, password)
        if error:
            return render_template('register.html', error=error)
        else:
            return redirect(url_for('index'))
        
        
#主页
@app.route('/')
@login_required
def index():
    user_id = verify_token(session.get('token'))
    diaries = get_user_diaries(user_id)
    return render_template('index.html', diaries=diaries)


#添加笔记
@app.route('/add', methods=['POST'])
@login_required
def add():
    # tag = request.json['tag']
    content = request.form['content']
    user_id = verify_token(session.get('token'))
    # add_diary(tag, content, user_id)
    add_diary( content, user_id)
    return redirect(url_for('index'))

#删除cookie接收POST请求
@app.route('/clear_cookie', methods=['POST'])
def clear_cookie():
    # 创建响应对象并设置成功消息和状态码
    response = make_response("Cookie cleared successfully", 200)
    # 设置名为'session'的cookie为空值，并设置过期时间为0，即立即失效
    # response.set_cookie('session', '', expires=0)
    session.clear()  # 清空 session 数据
    return response
    

#删除笔记
@app.route('/delete/<int:diary_id>', methods=['POST'])
@login_required
def delete(diary_id):
    delete_diary(diary_id)
    return redirect(url_for('index'))


#----------------------------csv-ztb-------------------------------------------------
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

@app.route('/get_ztb', methods=['GET'])
def get_diaries_z():

    with open(CONF.ZTB_CSV_DIR, 'r+', newline='',encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')
        diaries = list(reader)
        diaries = [{'content': line[0]} for line in diaries]

    # 转换为字符串，二进制形式
    return jsonify(diaries)


if __name__ == '__main__':
    connection.select_db('diary_db')
    create_database_tables()
    create_paste_table()  # 创建粘贴板表
    app.run(host="0.0.0.0", debug=True, port=5050)
