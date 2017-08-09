from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
chatbot = ChatBot(
    "test",
    database = "./chatbot"
    )
chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train(
    "./textData/TaipeiQA.yml"
)
