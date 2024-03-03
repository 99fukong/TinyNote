import csv
import pymysql

# 数据库连接参数
db_config = {
    "host": "localhost",
    "user": "test",
    "password": "123456",
    "database": "diary_db",
    "charset": 'utf8mb4',
    "port": 3306,
}

def add_diary_to_db(tag, content, user_id=1):
    """
    将日记数据添加到数据库。
    """
    try:
        connection = pymysql.connect(**db_config)
        with connection.cursor() as cursor:
            sql = "INSERT INTO diary (tag, content, user_id) VALUES (%s, %s, %s)"
            cursor.execute(sql, (tag, content, user_id))
            connection.commit()
    except pymysql.MySQLError as e:
        print(f"Error {e.args[0]}, {e.args[1]}")
    finally:
        if connection:
            connection.close()

def process_csv(file_path):
    """
    读取CSV文件并处理每行数据。
    """
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        rows = list(reader)
        
        # 倒序处理每行数据
        for row in reversed(rows):
            # 假设CSV文件中每行只有内容字段
            content = row[0]
            
            # 删除80个星号
            content = content.replace('*' * 80, '')
            
            # 如果需要，可以根据内容解析出标签
            tag = ""  
            
            # 将处理后的内容添加到数据库
            add_diary_to_db(tag, content)

if __name__ == "__main__":
    csv_file_path = 'diary.csv'  # 更新为实际的文件路径
    process_csv(csv_file_path)
