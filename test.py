from chatterbot import ChatBot

chatbot = ChatBot(
    "test",
    database = "./chatbot"
    )
while True:
    string = input()
    print(chatbot.get_response(string))
