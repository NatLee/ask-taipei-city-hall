# coding: utf-8

from linebot import *
from linebot.models import *
import linebot.exceptions


def get_linebot_menu(response_list):
    actions = []
    length = len(response_list)
    # 如果list長度超過3，則取前三個
    if length > 3:
        length = 3
    # 只要有相關問題則append 最多3個到選單上
    for i in range(length):
        actions.append(MessageTemplateAction(
            # 將空白取代後取前20個字填入（在此才將空白取代因最多也只有三項）
            label=str(response_list[i].replace(' ', '')[0:19]),
            text=str(response_list[i].replace(' ', '')[0:19]),
        ))

    print('選單的選項數: ' + str(len(actions)))

    # 先將最可能的回應push送出給使用者
    buttons_template_message = TemplateSendMessage(
        alt_text='問題選單',
        template=ButtonsTemplate(
            thumbnail_image_url='https://raw.githubusercontent.com/NatLee/test/master/PASSION.jpg',
            title='發現其他問題',
            text='或許下面可能有您想問的問題',
            actions=actions,
        )
    )
    return buttons_template_message


def get_nofind_message():
    return ImageSendMessage(
        original_content_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg',
        preview_image_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg'
    )


def get_user_session(line_bot_api, event):
    try:
        profile = line_bot_api.get_profile(event.source.user_id)
        userName = profile.display_name
    except:
        userName = ''
    userString = userName + ': ' + event.message.text
    print(userString)
    return userString


def send_message_back(line_bot_api, event, send):
    try:
        line_bot_api.reply_message(event.reply_token, send)
    except linebot.exceptions.LineBotApiError as e:
        print(e.status_code)
        print(e.error.message)
        print(e.error.details)
        line_bot_api.reply_message(
            event.reply_token, TextSendMessage(text='啊哦！關於這個問題或許我們遇到了點麻煩。'))


def low_confidence_event(line_bot_api,  event, response,  send):
    send.append(TextSendMessage(text='以上回答可能無法滿足您的需求'))
    # 將response中list以\n進行分割得到型態為list的response_list（先不處理空白）
    response_list = response[3].split('\n')
    # pop掉最後一個空元素
    response_list.pop()
    # 計算list大小
    length = len(response_list)
    # 判斷list大小，若大於1則進入填入選單判斷式
    # 因空的list也算有1個元素
    if length > 1:
        # 填入選單
        send.append(get_linebot_menu(response_list))
        print('Bot: （因項目過多，送出選單）')
    else:
        # 下面是處理資料庫中找不到相關選項時的回應
        send.append(get_nofind_message())
        print('資料庫中找不到任何相關的選項')

    send.append(TextSendMessage(
        text='或許您可以嘗試\n' +
        'https://www.google.com.tw/search?q=' + event.message.text)
    )
    send_message_back(line_bot_api, event, send)
