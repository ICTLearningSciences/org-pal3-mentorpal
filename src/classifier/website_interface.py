#THIS FIXES THE ERROR  https://github.com/extrabacon/python-shell/issues/113 Supresses the tensorflow warning

import classify
import mentor

'''clint = classify.Classify()
clintModel = mentor.Mentor('clint')	#this name is decided by classifer and the model has to be added to that with the cooresponding name
clint.set_mentor(clintModel)

dan = classify.Classify()
danModel = mentor.Mentor('dan');
dan.set_mentor(danModel);

julianne = classify.Classify()
julianneModel = mentor.Mentor('julianne')
julianne.set_mentor(julianneModel)

carlos = classify.Classify()
carlosModel = mentor.Mentor('carlos')
carlos.set_mentor(carlosModel)'''


global bi
bi=interface.BackendInterface(mode=answer_mode)
bi.preload(['clint', 'dan', 'julianne', 'carlos'])

while True:
	x = input("For Nodejs to enter value, but what is the question?  *use python3*")	#gets the question and id of the client
	y = x.split(',');
	question = y[0]
	id = y[1]
	if (y[2]=='clint'):
		#output = clint.get_answer(question)	#sends back the answer and the client id
	elif (y[2]=='dan'):
		output = dan.get_answer(question)
	elif (y[2]=='julianne'):
		output = julianne.get_answer(question)
	elif (y[2]=='carlos'):
		output = carlos.get_answer(question)
	print(output,end='')
	print(id)
