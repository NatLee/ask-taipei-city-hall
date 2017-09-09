# coding = utf-8
from linebot.models import (
    MessageTemplateAction,
    TemplateSendMessage,
    ButtonsTemplate,
    TextSendMessage,
    ImageSendMessage
)

from lib.fbMessageAPI import (
    Messager,
    ActionButton,
    ButtonType
)


def menuAction(fbOrLine, response_list):
    actions = []
    length = len(response_list)
    if length > 3:
        length = 3
    for i in range(length):
        label=str(response_list[i]["qu_old"][0:19])
        text=str(response_list[i]["qu_old"])

        if fbOrLine is 'fb' :
            actions.append(ActionButton(
                ButtonType.POSTBACK,
                title=label,
                payload=text
            ))
        elif fbOrLine is 'line' :
            actions.append(MessageTemplateAction(
                label=label,
                text=text
            ))
    return actions
