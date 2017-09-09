# coding: utf-8

from linebot.models import (
    MessageTemplateAction,
    TemplateSendMessage,
    ButtonsTemplate,
    TextSendMessage,
    ImageSendMessage
)
import lib.templateFunc import menuAction

class LineClass:

    def __init__(self, directBack,  response, input_message):
        self.directBack = directBack
        self.response = response
        self.input_message = input_message
        self.send = []

    def get_line_format(self):
        if self.directBack:
            self.send.append(TextSendMessage(text=self.response[0]["ans"]))
        else:
            self.low_confidence_event()
        return self.send

    def low_confidence_event(self):
        response_list = self.response
        if len(response_list) > 1:
            self.get_linebot_menu(response_list)
            print('Bot: （因項目過多，送出選單）')
        else:
            self.get_nofind_message()
            print('資料庫中找不到任何相關的選項')
            self.send.append(TextSendMessage(
                text='對不起我不太懂您的問題>_<，所以我幫你餵了估狗，希望對您有幫助\n' +
                'https://www.google.com.tw/search?q=' + self.input_message)
            )

    def get_linebot_menu(self, response_list):
        actions = menuAction('line', response_list)
        print('選單的選項數: ' + str(len(actions)))
        # 先將最可能的回應push送出給使用者
        self.send.append(TemplateSendMessage(
            alt_text='問題選單',
            template=ButtonsTemplate(
                thumbnail_image_url='https://raw.githubusercontent.com/NatLee/test/master/PASSION.jpg',
                title='您是不是想問...?',
                text='請選擇您想問的問題',
                actions=actions,
            )
        ))

    def get_nofind_message(self):
        self.send.append(ImageSendMessage(
            original_content_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg',
            preview_image_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg'
        ))
