from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer

chatbot = ChatBot("test")
chatbot.set_trainer(ChatterBotCorpusTrainer)

chatbot.train(
    "./textData/",
)
while True:
    string = input()
    print(chatbot.get_response(string))
