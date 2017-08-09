from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
chatbot = ChatBot(
    "test",
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri="mongodb://localhost:27017/"
    # database = "./chatbot"
    )
chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train(
    "./textData/TaipeiQA.yml"
)
