from webdav4.client import Client
import io
from flask import Flask, request, jsonify, render_template
import conf as CONF

app = Flask(__name__, template_folder=CONF.TEMPLATE_DIR)

client = Client(base_url='https://dav.jianguoyun.com/dav/',
                auth=('2011633957@qq.com', 'av63imguhfr9agvx'))
BIJIBEN = '/2022-1-1-笔记本/2022-1-1-Logseq/pages/笔记本.md'

@app.route('/')
def index():
    
    # # 打开文件
    # with open('/root/git_rep/web/templates/index.html', 'r', encoding='utf-8') as file:
    #     # 读取文件内容
    #     content = file.read()
    # return content
    
    return render_template('index.html')

@app.route('/submit_diary', methods=['POST'])
def submit_diary():
    # 获取 JSON 格式的表单数据
    data = request.json
    print(data)

    # 获取日记内容
    content = data['content']
    content = content+'\n********************************\n'

    # 将新的内容添加到diary.txt 最前面       
    with open(CONF.DIARY_TXT_DIR, 'r+', encoding='utf-8') as file:
        old_content = file.read()
        file.seek(0)
        # print(content+'\n\n\n' + old_content)
        file.write(content + old_content)

    # 将新的日记内容发送*到坚果云一个文件，是将日记内容更新到文件最前面
    with client.open(path=BIJIBEN, mode='r', encoding='utf-8') as file:
        jianguoyun_content = file.read()
        # print(jianguoyun_content)
    #将文本数据写入io.StringIO对象
    text_data = content + jianguoyun_content 
    fileobj = io.BytesIO(text_data.encode('utf-8'))
    # 将数据从io.StringIO对象上传到远程文件
    client.upload_fileobj(fileobj, BIJIBEN, overwrite=True)

    # 返回保存的日记
    diary = {'content': content}
    return jsonify(diary)

@app.route('/get_diaries', methods=['GET'])
def get_diaries():

    # 从文件中读取所有日记
    with open(CONF.DIARY_TXT_DIR, 'r', encoding='utf-8') as f:
        diaries = [{'content': line.strip()} for line in f]

    # 返回日记列表
    # print(diaries)
    # print(jsonify(diaries))
    return jsonify(diaries)

if __name__ == '__main__':
    # host 改为 0.0.0.0 或者本机的公网IP，否则外网方问有问题
    app.run(host="0.0.0.0", port=5050)
