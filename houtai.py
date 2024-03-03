import os
import pymysql
import logging
import time
import io
from webdav4.client import Client
from flask import Flask, request, jsonify, render_template, send_from_directory, url_for, redirect, session
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta

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

client = Client(base_url=BASE_URL,
                auth=(AUTH_USER, AUTH_PASSWORD))

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
                        tag TEXT ,
                        content TEXT,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        FOREIGN KEY (user_id) REFERENCES user(id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")

    connection.commit()
    
    # 创建粘贴板表
def create_paste_table():
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


# 注册用户
def register_user(username, password):
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
    
    
    
# def get_pastes():
#     with connection.cursor() as cursor:
#         sql = "SELECT * FROM paste"
#         cursor.execute(sql)
#         return cursor.fetchall()


# 删除日记
def delete_diary(diary_id):
    with connection.cursor() as cursor:
        sql = "DELETE FROM diary WHERE id=%s"
        cursor.execute(sql, (diary_id,))
        connection.commit()
    sync_diaries_to_jianguoyun()
    
# # 删除粘贴板条目
# def delete_paste(paste_id):
#     with connection.cursor() as cursor:
#         sql = "DELETE FROM paste WHERE id=%s"
#         cursor.execute(sql, (paste_id,))
#         connection.commit()


# 添加日记
def add_diary(tag, content, user_id):
    with connection.cursor() as cursor:
        sql = "INSERT INTO diary (tag, content, user_id) VALUES (%s, %s, %s)"
        cursor.execute(sql, (tag, content, user_id))
        connection.commit()
        
# # 添加粘贴板条目
# def add_paste(user_id, content):
#     with connection.cursor() as cursor:
#         sql = "INSERT INTO paste (user_id, content) VALUES (%s, %s)"
#         cursor.execute(sql, (user_id, content))
#         connection.commit()

# 获取当前登录用户的所有日记，按创建时间降序排序
def get_user_diaries(user_id):
    with connection.cursor() as cursor:
        # sql = "SELECT * FROM diary WHERE user_id=%s ORDER BY created_at DESC"
        sql = "SELECT * FROM diary WHERE user_id=%s ORDER BY id DESC"
        cursor.execute(sql, (user_id,))
        return cursor.fetchall()


# 用户登录
def login_user(username, password):
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

# @app.route('/get_pastes')
# @login_required
# def get_pastes_route():
#     pastes = get_pastes()
#     return jsonify(pastes)


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

# # 显示特定用户ztb
# @app.route('/get_paste/<int:paste_id>')
# @login_required
# def get_paste_route(paste_id):
#     paste = get_paste_by_id(paste_id)
#     if paste:
#         return jsonify(paste)
#     else:
#         return jsonify({'status': 'error', 'message': 'Paste not found'}), 404


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
# #编辑ztb
# @app.route('/edit_paste/<int:paste_id>', methods=['POST'])
# @login_required
# def edit_paste_route(paste_id):
#     data = request.json
#     content = data['content']
#     edit_paste(paste_id, content)
#     return jsonify({'status': 'success', 'message': 'Paste updated successfully'})


#注册用户
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
        
        
#登录笔记
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


#删除笔记
@app.route('/delete/<int:diary_id>', methods=['POST'])
@login_required
def delete(diary_id):
    delete_diary(diary_id)
    return redirect(url_for('index'))

# #删除ztb
# @app.route('/delete_paste/<int:paste_id>', methods=['POST'])
# @login_required
# def delete_paste_route(paste_id):
#     delete_paste(paste_id)
#     return jsonify({'status': 'success', 'message': 'Paste deleted successfully'})


if __name__ == '__main__':
    create_database()
    connection.select_db('diary_db')
    create_user_table()
    create_diary_table()
    create_paste_table()  # 创建粘贴板表
    app.run(host="0.0.0.0", debug=True, port=5050)
