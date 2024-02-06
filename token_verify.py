import jwt
from functools import wraps
from flask import request, jsonify
import datetime

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


def token_required(func):
    @wraps(func)
    def decorated_func(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({"error": "Token is missing"}), 401

        decoded_data = verify_token(token)

        if not decoded_data:
            return jsonify({"error": "Token is invalid or expired"}), 401
        else:
             return func(*args, **kwargs)
            
    return decorated_func

