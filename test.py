from chatterbot import ChatBot

chatbot = ChatBot(
    "test",
    storage_adapter="chatterbot.storage.MongoDatabaseAdapter",
    database_uri="mongodb://localhost:27017/"
    # database = "./chatbot"
    )
while True:
    string = input()
    print(chatbot.get_response(string))
