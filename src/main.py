# coding: utf-8

from flask import Flask, request, abort
from linebot import *
from linebot.models import *

import lineClass
#from getLineMenu import *
from chatbot import *


import linebot.exceptions

import config
import sys


#sys.stderr = open('server.log', 'a')

app = Flask(__name__)

line_bot_api = LineBotApi(config.channel_access_token)
handler = WebhookHandler(config.channel_secret)


@app.route('/')
def index():
    return "<p>Hello YEE!</p>"


@app.route("/callback", methods=['POST'])
def callback():
    # get X-Line-Signature header value
    signature = request.headers['X-Line-Signature']
    # get request body as text
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)
    # handle webhook body
    try:
        handler.handle(body, signature)
    except linebot.exceptions.InvalidSignatureError:
        abort(400)
    return 'OK'


def setUserLog(userString, response, confidence):
    userDataLog = open("userdata.log", mode='a', encoding='utf-8')
    userDataLog.write(
        userString + '\n' + response[2] + '\n' + "confidence = " + str(confidence) + "\n")
    userDataLog.close()


@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 抓出使用者名字、ID跟訊息
    userString = lineClass.get_user_session(line_bot_api, event)

    '''
    資料格式：
    response.text = str(response.confidence) + '_' + closest_match.text + '_' + response.text
    if response.confidence<0.3:
        response.text += '_' + self.all_statement_list
    '''

    # 丟入使用者輸入的資料得到response並使用底線切割
    response = str(chatbot.get_response(event.message.text)).split('_')
    # 透過分割後的response得到list中第0個元素即為confidence
    confidence = float(response[0])

    # 先回找到的答案在判斷要補輸出什麼
    send = []
    send.append(TextSendMessage(text=response[2]))

    # 判斷confidence，若其小於0.3則代表現在的response存在問題集合
    # 若其大於等於0.3則代表response可直接處理
    if confidence < 0.3:
        lineClass.low_confidence_event(line_bot_api,  event, response,  send)
    else:
        lineClass.send_message_back(line_bot_api, event, send)

    setUserLog(userString, response, confidence)


if __name__ == "__main__":
    app.run(host='0.0.0.0')
