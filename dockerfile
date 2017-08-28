FROM python:latest
ENV LANG C.UTF-8
ADD ./requirements.txt /
RUN pip install -r requirements.txt
ADD ./src /chatbot
WORKDIR /chatbot
