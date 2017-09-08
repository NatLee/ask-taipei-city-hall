# coding=utf-8
from lib.fbMessageAPI import (
    Messager,
    ActionButton,
    ButtonType
)
import config


class FbClass:
    def __init__(self, directBack, response, input_message, user_id):
        self.bot = Messager(config.ACCESS_TOKEN)
        self.directBack = directBack
        self.response = response
        self.input_message = input_message
        self.user_id = user_id

    def get_fb_format(self):
        if self.directBack:
            self.bot.send_text(self.user_id, self.response[0]["ans"])
        else:
            self.low_confidence_event(self.user_id)

    def low_confidence_event(self):
        response_list = self.response
        # 計算list大小
        length = len(response_list)
        # 判斷list大小，若大於1則進入填入選單判斷式
        # 因空的list也算有1個元素
        if length > 1:
            # 填入選單
            self.get_menu(response_list)
            print('Bot: （因項目過多，送出選單）')
        else:
            # 下面是處理資料庫中找不到相關選項時的回應
            self.get_nofind_message()
            print('資料庫中找不到任何相關的選項')
            self.bot.send_buttons(
                self.user_id,
                '對不起我不太懂您的問題>_<，所以我幫你餵了估狗，希望對您有幫助',
                [ActionButton(
                    ButtonType.WEB_URL,
                    self.input_message,
                    'https://www.google.com.tw/search?q=' + self.input_message
                )]
            )

    def get_menu(self, response_list):
        actions = []
        length = len(response_list)
        # 如果list長度超過3，則取前三個
        if length > 4:
            length = 4
        # 只要有相關問題則append 最多3個到選單上
        for i in range(length):
            actions.append(ActionButton(
                ButtonType.POSTBACK,
                title=str(response_list[i]["qu_old"][0:19]),
                payload=str(response_list[i]["qu_old"])
            ))

        print('選單的選項數: ' + str(len(actions)))
        self.bot.send_buttons(
            self.user_id,
            '您是不是想問...?',
            actions
        )

    def get_nofind_message(self):
        self.bot.send_image(
            self.user_id,
            'https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg'
        )
