# coding: utf-8

from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.models import TextMessage, MessageEvent, TextSendMessage

from chatbot import chatbot

import linebot.exceptions
import time as T
import lineClass

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
        getHandler(handler,body, signature)


def setUserLog(userString, response, confidence):
    userDataLog = open("userdata.log", mode='a', encoding='utf-8')
    userDataLog.write(
        userString + '\n' + response[2] + '\n' + "confidence = " + str(confidence) + "\n")
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

def getHandleMessage(line_bot_api,event):
        # 抓出使用者名字、ID跟訊息
        timeTemp = T.time()
        userString = getUserSession(line_bot_api, event)

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
        print("一次處理時間: " + str(T.time() - timeTemp))
