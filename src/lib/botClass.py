# coding = utf-8
from lib.fbMessageAPI import (
    Messager,
    ActionButton,
    ButtonType
)
from linebot.models import (
    MessageTemplateAction,
    TemplateSendMessage,
    ButtonsTemplate,
    TextSendMessage,
    ImageSendMessage
)
import config

import logging
import logging.config


class botClass:
    def __init__(self, directBack, response, input_message, bot_type, user_id):
        self.directBack = directBack
        self.response = response
        self.input_message = input_message
        self.bot_type = bot_type
        self.user_id = user_id

        self.bot = Messager(config.ACCESS_TOKEN)
        self.send = []
        self.img_url = "https://raw.githubusercontent.com/NatLee/test/master/"
        logging.config.fileConfig('lib/logconfig.ini')

    def get_format(self):
        if self.directBack:
            if self.bot_type is 'line':
                self.send.append(TextSendMessage(text=self.response[0]["ans"]))
            elif self.bot_type is 'fb':
                if len(self.response[0]["ans"]) <= 600:
                    self.bot.send_text(self.user_id, self.response[0]["ans"])
                else:
                    self.bot.send_longText(
                        self.user_id, self.response[0]["ans"])
            logging.info(self.bot_type + ":" + self.response[0]["ans"])
        else:
            self.low_confidence_event()
        return self.send

    def low_confidence_event(self):
        response_list = self.response

        if len(response_list) >= 1:
            self.get_menu(response_list)
            logging.info('Bot: （因項目過多，送出選單）')
        else:
            logging.info('資料庫中找不到任何相關的選項,已回傳google搜尋')
            self.get_nofind_message()

    def get_menu(self, response_list):
        actions = self._menuAction(self.bot_type, response_list)
        logging.info('選單的選項數: ' + str(len(actions)))
        if self.bot_type is 'line':
            self.send.append(TemplateSendMessage(
                alt_text='問題選單',
                template=ButtonsTemplate(
                    thumbnail_image_url=self.img_url + 'PASSION.jpg',
                    title='您是不是想問...?',
                    text='請選擇您想問的問題',
                    actions=actions,
                )
            ))
        elif self.bot_type is 'fb':
            self.bot.send_buttons(
                self.user_id,
                '您是不是想問...?',
                actions
            )

    def get_nofind_message(self):
        google_url = "https://www.google.com.tw/search?q="
        if self.bot_type is 'line':
            self.send.append(TemplateSendMessage(
                alt_text='問題選單',
                template=ButtonsTemplate(
                    thumbnail_image_url=self.img_url + 'SMILE.jpg',
                    title='對不起我不太懂您的問題>_<，所以我幫你餵了估狗，希望對您有幫助',
                    text='點選按鈕直接解答',
                    actions=[ActionButton(
                        ButtonType.POSTBACK,
                        title=self.input_message,
                        payload=google_url + self.input_message
                    )],
                )
            ))
        elif self.bot_type is 'fb':
            self.bot.send_image(
                self.user_id,
                self.img_url + 'SMILE.jpg'
            )
            self.bot.send_buttons(
                self.user_id,
                '對不起我不太懂您的問題>_<，所以我幫你餵了估狗，希望對您有幫助',
                [ActionButton(
                    ButtonType.WEB_URL,
                    self.input_message,
                    google_url + self.input_message
                )]
            )

    def _menuAction(self, fbOrLine, response_list):
        actions = []
        length = len(response_list)
        logging.info("回傳選單" + str(response_list))
        if length > 3:
            length = 3
        for i in range(length):
            label = str(response_list[i]["qu_old"][0:19])
            text = str(response_list[i]["qu_old"])

            if fbOrLine is 'fb':
                actions.append(ActionButton(
                    ButtonType.POSTBACK,
                    title=label,
                    payload=text
                ))
            elif fbOrLine is 'line':
                actions.append(MessageTemplateAction(
                    label=label,
                    text=text
                ))
        return actions
