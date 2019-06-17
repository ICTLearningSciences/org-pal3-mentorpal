"""
Created on Apr 15, 2016
python implementation of the VHMSG
@author: auerbach
"""

import os
import stomp
from builtins import int
import threading
import urllib.parse
import time

# List of First Words
GAME_LOG = "GameLog"
COMM_API = "CommAPI"
VR_EXPRESS = "vrExpress"
UTTERANCE_MATCHES = "UtteranceMatches"
TRANSCRIPT_UPDATE = "TranscriptUpdate"
BEGIN_AAR = "BeginAAR"


VHMSG_SCOPE = "VHMSG_SCOPE"
VHMSG_SERVER = "VHMSG_SERVER"
VHMSG_STOMP_PORT = "VHMSG_STOMP_PORT"
MESSAGE_PREFIX = "MESSAGE_PREFIX"
STRING_ENCODING = "UTF8"
MULTIKEY = "multikey"

DEFAULT_SCOPE = "DEFAULT_SCOPE"
DEFAULT_PORT = "61613"
DEFAULT_SERVER = "localhost"

TOPIC_LABEL = "/topic/"


def getScopeFromEnvironment():
    return os.getenv(VHMSG_SCOPE, DEFAULT_SCOPE)


def getPortFromEnvironment():
    return os.getenv(VHMSG_STOMP_PORT, DEFAULT_PORT)


def getServerFromEnvironment():
    return os.getenv(VHMSG_SERVER, DEFAULT_SERVER)


class VHMSGListener(object):
    firstWord = None
    handler = None

    # handler function takes two arguments: first word and body
    def __init__(self, firstWord, handler):
        self.firstWord = firstWord
        self.handler = handler


class VHMSGEventHandler(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)
        # list of (header, msg) tuples
        self._messages = []
        # lock to make sure only one thread is manipulating the message List at a time
        self._messagesLock = threading.Lock()

        # list of VHMSGListeners
        self._listeners = []

        self.m_immediateMethod = True
        self.m_connectionOpen = False

    def addMessage(self, header, msg):
        self._messagesLock.acquire()
        self._messages.append((header, msg))
        self._messagesLock.release()

    def run(self):
        while self.m_immediateMethod and self.m_connectionOpen:
            self.poll()

    def poll(self):
        if len(self._messages) > 0:
            self._messagesLock.acquire()
            nextMessage = self._messages.pop(0)
            self._messagesLock.release()

            for listener in self._listeners:
                if listener.firstWord == nextMessage[0]:
                    listener.handler(nextMessage[0], nextMessage[1])


class VHMSG(object):
    def __init__(
        self,
        server=getServerFromEnvironment(),
        port=getPortFromEnvironment(),
        scope=getScopeFromEnvironment(),
    ):
        self.m_port = port
        self.m_scope = scope
        self.m_server = server
        self.m_connection = None
        self.m_isOpen = False

        self._eventHandler = None

    # returns boolean
    def openConnection(self):
        if self.m_isOpen:
            return True
        while not self.m_isOpen:
            try:
                if self.m_server is None or self.m_server is "":
                    self.m_server = getServerFromEnvironment()
                if self.m_scope is None or self.m_scope is "":
                    self.m_scope = getScopeFromEnvironment()
                if self.m_port is None or self.m_port is "":
                    self.m_port = getPortFromEnvironment()

                self.m_connection = stomp.Connection10(
                    [(self.m_server, int(self.m_port))]
                )
                self.m_connection.set_listener("stomp_listener", self)
                self.m_connection.start()
                self.m_connection.connect()
                self.m_connection.subscribe(TOPIC_LABEL + self.m_scope)

                self.m_isOpen = True

                self._eventHandler = VHMSGEventHandler()
                self._eventHandler.m_connectionOpen = True
                self._eventHandler.start()
                return True
            except Exception:
                print("Connection timed Out, waiting for ActiveMQ")

    def closeConnection(self):
        if not self.m_isOpen:
            return True
        print("stopping")
        # self.m_connection.stop()
        print("disconnecting")
        self.m_connection.disconnect()

        self.m_isOpen = False
        self._eventHandler.m_connectionOpen = False

        return True

    def subscribe(self, firstWord, handler):
        listener = VHMSGListener(firstWord, handler)
        self._eventHandler._listeners.append(listener)

    def on_message(self, headers, msg):
        # print('calling on_message at {0}, msg: {1}'.format(time.time(), msg))
        msg = urllib.parse.unquote(msg)
        msg = msg.replace("+", " ")
        splitString = msg.split(" ", 1)
        header = splitString[0]
        body = splitString[1]
        self._eventHandler.addMessage(header, body)

    def sendMessage(self, firstWord, body):
        if self.m_connection is None:
            return False

        headers = {
            "ELVISH_SCOPE": self.m_scope,
            "MESSAGE_PREFIX": firstWord,
            "type": "Text",
        }

        self.m_connection.send(
            destination=TOPIC_LABEL + self.m_scope,
            body=firstWord + " " + body,
            headers=headers,
            content_type="text/plain",
        )
        return True


"""
This class is intended to provide a base class for components communicating via the VHMSG.

implementors should override the registerHandlers function when creating the subclass.

"""


class VHMSGComponent(object):

    comm = None
    componentName = None

    def __init__(
        self,
        componentName="defaultComponentName",
        server=getServerFromEnvironment(),
        port=getPortFromEnvironment(),
        scope=getScopeFromEnvironment(),
    ):
        self.comm = VHMSG(server=server, port=port, scope=scope)
        self.componentName = componentName

        self.comm.openConnection()

    def registerHandlers(self):
        # subclass and place subcribe calls here
        # all components must be able to respond to the vrKill message so that's included.
        self.comm.subscribe("vrKill", self.vrKillHandler)

    def vrKillHandler(self, firstWord, body):
        if body == self.componentName or body == "all":
            self.comm.closeConnection()
