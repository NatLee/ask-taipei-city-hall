# coding=utf-8
from fbMessageAPI import (
    Messager,
    ActionButton,
    ButtonType
)
import config


class FbClass:
    def __init__(self, confidence, response, input_message):
        self.bot = Messager(config.ACCESS_TOKEN)
        self.confidence = confidence
        self.response = response
        self.input_message = input_message

    def get_fb_format(self, user_id):
        # 判斷confidence，若其小於0.3則代表現在的response存在問題集合
        # 若其大於等於0.3則代表response可直接處理
        if self.confidence < 0.3:
            self.low_confidence_event(user_id)
        else:
            self.bot.send_text(user_id, self.response[2])

    def low_confidence_event(self, user_id):
        actions = []
        # 將response中list以\n進行分割得到型態為list的response_list（先不處理空白）
        response_list = self.response[3].split('\n')
        # pop掉最後一個空元素
        response_list.pop()
        # 計算list大小
        length = len(response_list)
        # 判斷list大小，若大於1則進入填入選單判斷式
        # 因空的list也算有1個元素
        if length > 1:
            # 填入選單
            self.get_menu(response_list, user_id)
            print('Bot: （因項目過多，送出選單）')
        else:
            # 下面是處理資料庫中找不到相關選項時的回應
            self.get_nofind_message(user_id)
            print('資料庫中找不到任何相關的選項')

        googleSearch = str(
            'https://www.google.com.tw/search?q=' + self.input_message)

        actions.append(ActionButton(
            ButtonType.WEB_URL,
            self.input_message,
            googleSearch
        )
        )
        self.bot.send_buttons(
            user_id,
            '對不起我不太懂您的問題>_<，所以我幫你餵了估狗，希望對您有幫助',
            actions
        )

    def get_menu(self, response_list, user_id):
        actions = []
        length = len(response_list)
        # 如果list長度超過3，則取前三個
        if length > 3:
            length = 3
        # 只要有相關問題則append 最多3個到選單上
        for i in range(length):
            actions.append(ActionButton(
                ButtonType.POSTBACK,
                title=str(response_list[i].replace(' ', '')[0:19]),
                payload=str(response_list[i].replace(' ', '')[0:999])
            )
            )
            # print(str(actions[0].payload))
        self.bot.send_image(
            user_id,
            'https://raw.githubusercontent.com/NatLee/test/master/PASSION.jpg'
        )
        print('選單的選項數: ' + str(len(actions)))
        self.bot.send_buttons(
            user_id,
            '或許下面可能有您想問的問題',
            actions
        )

    def get_nofind_message(self, user_id):
        self.bot.send_image(
            user_id,
            'https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg'
        )

    def setUserLog(self, userString, response, confidence):
        userDataLog = open("userdataFB.log", mode='a', encoding='utf-8')
        userDataLog.write(
            userString + '\n' + response[2] + '\n' + "confidence = " + str(confidence) + "\n")
        userDataLog.close()
