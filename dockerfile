FROM python:latest
ADD . /chatbot
WORKDIR /chatbot
RUN pip install -r requirements.txt
