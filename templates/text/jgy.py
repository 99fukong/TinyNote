import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/receive_jianguoyun_doc', methods=['GET'])
def receive_jianguoyun_doc():
    # 通过 os.environ 访问环境变量
    # BASE_URL = os.environ.get('BASE_URL')
    # AUTH_USER = os.environ.get('AUTH_USER')
    # AUTH_PASSWORD = os.environ.get('AUTH_PASSWORD')
    # BIJIBEN = os.environ.get('BIJIBEN')
    BASE_URL = "https://dav.jianguoyun.com/dav/"
    AUTH_USER = "2011633957@qq.com"
    AUTH_PASSWORD = "av63imguhfr9agvx"
    BIJIBEN = '/坚果云/2022-1-1-Logseq/pages/测试.md'
    SAVE_PATH = 'received_document.md'  # 保存文档的本地路径
    
    # 使用 WebDAV 客户端下载坚果云文档
    try:
        response = requests.get(BASE_URL + BIJIBEN, auth=(AUTH_USER, AUTH_PASSWORD))
        if response.status_code == 200:
            # 如果成功获取文档内容，则保存到本地文件
            content = response.text
            with open(SAVE_PATH, 'w', encoding='utf-8') as file:
                file.write(content)
            return jsonify({'status': 'success', 'message': f'Document received and saved to {SAVE_PATH}'})
        else:
            return jsonify({'status': 'error', 'message': 'Failed to receive document from JianguoYun'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True)
