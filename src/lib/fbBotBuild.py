# coding=utf-8
from flask import request
import config
import requests
import json
from lib.botClass import botClass
import lib.responseLogic as responseLogic

import logging
import logging.config


def loggingFb(string):
    logging.config.fileConfig('lib/logconfig.ini')
    fb = logging.getLogger("fb")
    fb.info(string)


def fbResponse():
    if request.method == 'GET':
        return helloTokenFB()
    if request.method == 'POST':
        text, user_id = getTextMessage()  # 這行可以得到使用者傳入的文字
        send_typing_on(user_id)
        jsonData = requests.get('https://graph.facebook.com/v2.6/' + user_id +
                                '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + config.ACCESS_TOKEN).json()
        userName = str(jsonData['last_name'] + jsonData['first_name'])

        # 透過分割後的response得到list中第0個元素即為confidence
        res = responseLogic.Response(text)
        directBack, response = res.get()

        fbclass = botClass(directBack, response, text, "fb", user_id)
        userString = userName + '_' + user_id + ': ' + text
        try:
            fbclass.get_format()
            loggingFb(userString + '\n' + response[0]["ans"] + '\n')
        except Exception as err:
            logging.error("錯誤訊息：" + err["error"]["message"] + '\n')
        
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
    # print(output)
    messaging = output['entry'][0]['messaging'][0]
    recipient_id = messaging['sender']['id']
    if(messaging.get('message') and messaging['message'].get('text')):
        text = messaging['message']['text']
    elif(messaging.get('postback') and messaging['postback'].get('payload')):
        text = messaging['postback']['payload']
    else:
        pass
    return text, recipient_id  # 抓不到就回傳空字串


def send_typing_on(to):
    post_message_url = 'https://graph.facebook.com/v2.6/me/messages?access_token={token}'.format(
        token=config.ACCESS_TOKEN)
    response_message = json.dumps({"recipient": {"id": to},
                                   "sender_action": "typing_on"})
    requests.post(post_message_url,
                  headers={"Content-Type": "application/json"},
                  data=response_message)
