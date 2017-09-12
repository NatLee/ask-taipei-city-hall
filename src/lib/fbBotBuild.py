# coding=utf-8
from flask import request
import config
import requests
from lib.botClass import botClass
import lib.responseLogic as responseLogic
import time as T
import logging
import logging.config


def fbResponse():
    if request.method == 'GET':
        return helloTokenFB()
    if request.method == 'POST':
        timeTemp = T.time()
        text, user_id = getTextMessage()  # 這行可以得到使用者傳入的文字
        jsonData = requests.get('https://graph.facebook.com/v2.6/' + user_id +
                                '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + config.ACCESS_TOKEN).json()
        userName = str(jsonData['last_name'] + jsonData['first_name'])

        res = responseLogic.Response(text)
        directBack, response = res.get()

        fbclass = botClass(directBack, response, text, "fb", user_id)
        logging.info("使用者:" + userName + ":" + text)
        try:
            fbclass.get_format()
        except Exception as err:
            logging.error("錯誤訊息：" + err["error"]["message"] + '\n')
        logging.info("一次處理時間: " + str(T.time() - timeTemp))
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
    messaging = output['entry'][0]['messaging'][0]
    recipient_id = messaging['sender']['id']
    if(messaging.get('message') and messaging['message'].get('text')):
        text = messaging['message']['text']
    elif(messaging.get('postback') and messaging['postback'].get('payload')):
        text = messaging['postback']['payload']
    else:
        pass
    return text, recipient_id  # 抓不到就回傳空字串
