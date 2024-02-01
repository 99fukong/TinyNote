import os
import csv
import re
from webdav4.client import Client
import io
from flask import Flask, request, jsonify, render_template
import conf as CONF
from dotenv import load_dotenv
import jwt
import datetime
from flask_cors import CORS

app = Flask(__name__, template_folder=CONF.TEMPLATE_DIR,static_folder="data")

# 设置密钥，用于签名和验证 JWT
secret_key = "your_secret_key"



def generate_token(user_id):
    expiration_time = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    token = jwt.encode({"user_id": user_id, "exp": expiration_time}, secret_key, algorithm="HS256")
    return token

def verify_token(token):
    try:
        decoded_data = jwt.decode(token, secret_key, algorithms=["HS256"])
        return decoded_data
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

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
    
    # # 打开文件
    # with open('/root/git_rep/web/templates/index.html', 'r', encoding='utf-8') as file:
    #     # 读取文件内容
    #     content = file.read()
    # return content
    
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

# @app.route('/protected', methods=['GET'])
# def protected():
#     token = request.headers.get('Authorization')

#     if not token:
#         return jsonify({"error": "Token is missing"}), 401

#     decoded_data = verify_token(token)

#     if decoded_data:
#         return jsonify({"message": "Access granted!", "user_id": decoded_data['user_id']})
#     else:
#         return jsonify({"error": "Token is invalid or expired"}), 401


@app.route('/index.js')
def index_js():    
    return render_template('index.js')

@app.route('/index.css')
def index_css():    
    return render_template('index.css')

@app.route('/delete_diary/<int:diary_id>', methods=['DELETE'])
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
def get_diaries():
    
    token = request.headers.get('Authorization')

    if not token:
        return jsonify({"error": "Token is missing"}), 401

    decoded_data = verify_token(token)

    if not decoded_data:
        return jsonify({"error": "Token is invalid or expired"}), 401
    
    # 从文件中读取所有日记
    # with open(CONF.DIARY_TXT_DIR, 'r', encoding='utf-8') as f:
    #     diaries = [{'content': line} for line in f]
        
    with open(CONF.DIARY_CSV_DIR, 'r+', newline='',encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=',')  
        diaries = list(reader)
        diaries = [{'content': line[0], 'lineNumber': index+1}
                   for index, line in enumerate(diaries[1:])]

    # 返回日记列表
    # print(diaries)
    # print(jsonify(diaries))
    # 转换为字符串，二进制形式
    return jsonify(diaries)

@app.route('/get_ztb', methods=['GET'])
def get_diaries_z():
    
    token = request.headers.get('Authorization')

    if not token:
        return jsonify({"error": "Token is missing"}), 401

    decoded_data = verify_token(token)

    if not decoded_data:
        return jsonify({"error": "Token is invalid or expired"}), 401
    
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
