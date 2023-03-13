from flask import Flask, request, jsonify, render_template

# app = Flask(__name__)
app = Flask(__name__, template_folder='/root/git_rep/web/templates')

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

    # 保存日记到文件
    with open('diary.txt', 'a', encoding='utf-8') as f:
        f.write(content + '\n')

    # 返回保存的日记
    diary = {'content': content}
    return jsonify(diary)

@app.route('/get_diaries', methods=['GET'])
def get_diaries():
    # 从文件中读取所有日记
    with open('diary.txt', 'r', encoding='utf-8') as f:
        diaries = [{'content': line.strip()} for line in f]

    # 返回日记列表
    return jsonify(diaries)

if __name__ == '__main__':
    # host 改为 0.0.0.0 或者本机的公网IP，否则外网方问有问题
    app.run(host="0.0.0.0", port=5050)
