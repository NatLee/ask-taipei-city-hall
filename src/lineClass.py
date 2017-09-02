# coding: utf-8

from linebot.models import (
    MessageTemplateAction,
    TemplateSendMessage,
    ButtonsTemplate,
    TextSendMessage,
    ImageSendMessage
)


class LineClass:

    def __init__(self, confidence, response, input_message):
        self.confidence = confidence
        self.response = response
        self.input_message = input_message
        self.send = []

    def get_line_format(self):
        self.send.append(TextSendMessage(text=self.response[2]))
        # 判斷confidence，若其小於0.3則代表現在的response存在問題集合
        # 若其大於等於0.3則代表response可直接處理
        if self.confidence < 0.3:
            self.low_confidence_event()
        return self.send

    def low_confidence_event(self):
        self.send.append(TextSendMessage(text='以上回答可能無法滿足您的需求'))
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
            self.get_linebot_menu(response_list)
            print('Bot: （因項目過多，送出選單）')
        else:
            # 下面是處理資料庫中找不到相關選項時的回應
            self.get_nofind_message()
            print('資料庫中找不到任何相關的選項')

        self.send.append(TextSendMessage(
            text='或許您可以嘗試\n' +
            'https://www.google.com.tw/search?q=' + self.input_message)
        )

    def get_linebot_menu(self, response_list):
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
        self.send.append(TemplateSendMessage(
            alt_text='問題選單',
            template=ButtonsTemplate(
                thumbnail_image_url='https://raw.githubusercontent.com/NatLee/test/master/PASSION.jpg',
                title='發現其他問題',
                text='或許下面可能有您想問的問題',
                actions=actions,
            )
        ))

        def get_nofind_message():
            self.sned.append(ImageSendMessage(
                original_content_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg',
                preview_image_url='https://raw.githubusercontent.com/NatLee/test/master/SMILE.jpg'
            ))
