# coding: utf-8

from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
chatbot = ChatBot(
    'Test',
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    logic_adapters=[
        'chatterbot.logic.BestMatch'
    ],
    filters=[
        'chatterbot.filters.RepetitiveResponseFilter'
    ],
    database_uri="mongodb://localhost:27017/",
    database='chatterbot-database3',
    read_only=True
    )

chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train("./output.yml")

print('可以開始輸入了...')

while True:
    try:
        print(chatbot.get_response(input()))

    # Press ctrl-c or ctrl-d on the keyboard to exit
    except (KeyboardInterrupt, EOFError, SystemExit):
        break
