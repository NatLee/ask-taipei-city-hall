FROM python:latest
ENV LANG C.UTF-8
ADD . /chatbot
WORKDIR /chatbot
RUN pip install -r requirements.txt
