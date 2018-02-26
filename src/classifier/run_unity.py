import run
import vhmsg
import time

# send a message via vhmsg to the unity program
def vhmsg_send(message):
    vhmsg.sendMessage('MENTORPAL_MP2UNITY', message)

# handle the vhmsg that was received from unity
def vhmsg_callback(head, body):
    output = run.process_input(body)
    if run.end_flag:
        vhmsg.closeConnection()
    else:
        vhmsg_send(output)

run.start('ensemble')
vhmsg = vhmsg.VHMSG()
vhmsg.openConnection()
vhmsg.subscribe("MENTORPAL_UNITY2MP", vhmsg_callback)
vhmsg_send('_READY_')
while not run.end_flag:
    time.sleep(0.1)