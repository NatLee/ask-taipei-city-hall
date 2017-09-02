# coding: utf-8

from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.models import TextMessage, MessageEvent, TextSendMessage
import time as T
import lineClass
from chatbot import chatbot
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


def get_user_session(line_bot_api, event):
    try:
        profile = line_bot_api.get_profile(event.source.user_id)
        userName = profile.display_name
    except:
        userName = ''
    userString = userName + ': ' + event.message.text
    print(userString)
    return userString


@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    # 抓出使用者名字、ID跟訊息
    timeTemp = T.time()
    userString = get_user_session(line_bot_api, event)

    # 丟入使用者輸入的資料得到response並使用底線切割
    response = str(chatbot.get_response(event.message.text)).split('_')
    # 透過分割後的response得到list中第0個元素即為confidence
    confidence = float(response[0])
    lineclass = lineClass.LineClass(confidence, response, event.message.text)
    send = lineclass.get_line_format()

    try:
        line_bot_api.reply_message(event.reply_token, send)
    except linebot.exceptions.LineBotApiError as e:
        print(e.status_code)
        print(e.error.message)
        print(e.error.details)
        line_bot_api.reply_message(
            event.reply_token, TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))
    setUserLog(userString, response, confidence)
    print("一次處理時間" + str(T.time() - timeTemp))


if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
