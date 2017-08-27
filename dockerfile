FROM python:latest
ENV LANG C.UTF-8
ADD ./src /chatbot
WORKDIR /chatbot
RUN pip install -r requirements.txt
