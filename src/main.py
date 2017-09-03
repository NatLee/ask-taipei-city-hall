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

line_bot_api1 = LineBotApi(config.channel_access_token1)
handler1 = WebhookHandler(config.channel_secret1)

line_bot_api2 = LineBotApi(config.channel_access_token2)
handler2 = WebhookHandler(config.channel_secret2)

@app.route('/')
def index():
    return "<p>Hello YEE!</p>"

def getSignAndReq():
        # get X-Line-Signature header value
        signature = request.headers['X-Line-Signature']
        # get request body as text
        body = request.get_data(as_text=True)
        app.logger.info("Request body: " + body)
        return signature, body

def getHandler(handler,body, signature):
    try:
        handler.handle(body, signature)
    except linebot.exceptions.InvalidSignatureError:
        abort(400)

def getCallback(handler):
        signature, body = getSignAndReq()
        getHandler(handler,body, signature)

@app.route("/callback1", methods=['POST'])
def callback1():
    getCallback(handler1)
    return 'OK_1'

@app.route("/callback2", methods=['POST'])
def callback2():
    getCallback(handler2)
    return 'OK_2'

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

def getHandleMessage(line_bot_api,event):
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
            print(e)
            line_bot_api.reply_message(
                event.reply_token, TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))
        setUserLog(userString, response, confidence)
        print("一次處理時間 : " + str(T.time() - timeTemp))


@handler1.add(MessageEvent, message=TextMessage)
def handle_message1(event):
    print("--------------BOT 1--------------")
    getHandleMessage(line_bot_api1,event)

@handler2.add(MessageEvent, message=TextMessage)
def handle_message2(event):
    print("--------------BOT 2--------------")
    getHandleMessage(line_bot_api2,event)


if __name__ == "__main__":
    app.run(host='0.0.0.0', threaded=True)
