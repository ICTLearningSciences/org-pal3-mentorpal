import xml.etree.cElementTree as ET
import os
from subprocess import call
class NPCEditor(object):
    def __init__(self):
        self.requests=ET.Element('requests', ID='L1', agentName='Clint')

    def create_xml(self, question):
        request=ET.SubElement(self.requests,'request', target="All", ID="1", source="bar")
        ET.SubElement(request, "field", name="text").text = question
        tree=ET.ElementTree(self.requests)
        tree.write('xml_messages/npceditor_request.xml')
        self.send_request()
    
    def send_request(self):
        call(["java", "-cp", "/Applications/NPCEditor.app/npceditor.jar:/Applications/NPCEditor.app/plugins/batch_plugin.jar", "edu.usc.ict.npc.server.net.ipc.BatchModule", "--stdin", "xml_messages/npceditor_request.xml"])

def main():
    npc=NPCEditor()
    npc.create_xml("what is your name")


if __name__=='__main__':
    main()