# coding=utf-8
from flask import request
from chatbot import chatbot
import fbClass
import config


def fbResponse():
    if request.method == 'GET':
        return helloTokenFB()
    if request.method == 'POST':
        print("--------------FacebookBot--------------")
        text, user_id = getTextMessage()  # 這行可以得到使用者傳入的文字
        #print(text)
        response = str(chatbot.get_response(text)).split('_')
        # 透過分割後的response得到list中第0個元素即為confidence
        confidence = float(response[0])
        fbclass = fbClass.FbClass(confidence, response, text)
        userString = fbclass.getUserName + ': ' + text
        fbclass.get_fb_format(user_id)
        fbclass.setUserLog(userString, response, confidence)
        return "Success"


def helloTokenFB():
    if request.args.get("hub.verify_token") == config.VERIFY_TOKEN:
        return request.args.get("hub.challenge")
    else:
        return 'Invalid verification token'


def getTextMessage():
    text = ''
    recipient_id = ''
    output = request.get_json()
    #print(output)
    for event in output['entry']:
        messaging = event['messaging']
        for x in messaging:
            if x.get('message'):
                recipient_id = x['sender']['id']
                if x['message'].get('text'):
                    text = x['message']['text']
            elif x.get('postback'):
                recipient_id = x['sender']['id']
                if x['postback'].get('payload'):
                    text = x['postback']['payload']
            else:
                pass
    return text, recipient_id  # 抓不到就回傳空字串
