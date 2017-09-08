# coding: utf-8

from flask import request, abort
from linebot.models import TextSendMessage

import lib.responseLogic as responseLogic
import linebot.exceptions
import time as T
import lib.lineClass as lineClass


def getSignAndReq(app):
    # get X-Line-Signature header value
    signature = request.headers['X-Line-Signature']
    # get request body as text
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)
    return signature, body


def getHandler(handler, body,  signature):
    try:
        handler.handle(body, signature)
    except linebot.exceptions.InvalidSignatureError:
        abort(400)


def getCallback(app, handler):
    signature, body = getSignAndReq(app)
    getHandler(handler, body, signature)


def setUserLog(userString, response):
    userDataLog = open("userdataLine.log", mode='a', encoding='utf-8')
    userDataLog.write(userString + '\n' + response + '\n')
    userDataLog.close()


def getUserSession(line_bot_api, event):
    try:
        profile = line_bot_api.get_profile(event.source.user_id)
        userName = profile.display_name
    except:
        userName = ''
    userString = userName + ': ' + event.message.text
    print(userString)
    return userString


def getHandleMessage(line_bot_api, event):
    # 抓出使用者名字、ID跟訊息
    timeTemp = T.time()
    userString = getUserSession(line_bot_api, event)

    # 丟入使用者輸入的資料得到response
    res = responseLogic.Response(event.message.text)
    directBack, response = res.get()

    lineclass = lineClass.LineClass(directBack,  response, event.message.text)
    send = lineclass.get_line_format()
    try:
        line_bot_api.reply_message(event.reply_token, send)
    except linebot.exceptions.LineBotApiError as e:
        print(e)
        line_bot_api.reply_message(
            event.reply_token, TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))
    setUserLog(userString, response[0]["ans"])
    print("一次處理時間: " + str(T.time() - timeTemp))
