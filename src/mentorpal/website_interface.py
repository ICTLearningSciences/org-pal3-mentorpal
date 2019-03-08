#THIS FIXES THE ERROR  https://github.com/extrabacon/python-shell/issues/113 Supresses the tensorflow warning

import interface
import json
from logger import Logger

global bi
bi=interface.BackendInterface("classifier")
bi.preload(['clint', 'dan', 'julianne', 'carlos'])
while True:	#for now, the overhead of threading module actually doesn't make that worthwhile, if the model gets more complicated it migth be worth it
	x = input("For Nodejs to enter value, but what is the question?  *use python3*")	#gets the question and id of the client
	y = x.split('~~');
	question = y[0]
	id = y[1]
	mentor = y[2]
	userID = y[3]
	blacklist = y[4]

	Logger.logUserID(userID, question)
	bi.set_blacklist(json.loads(blacklist))
	bi.set_mentor(mentor)

	video_file, transcript, score = bi.process_input_from_ui(question)
	output ="{0}\n{1}\n{2}\n{3}".format(id, video_file, transcript, score)
	output = output.split('\n')
	output = "~~"+output[0]+"~~"+output[1]+"~~"+output[2]+"~~"
	print(output,end='')
	print(' ')
