# This is the web version/wrapper for the MentorPal Project
    *This allows MentorPal to be deployed to hundreds of users remotely onto their computer or mobile device*

#### To redeploy the server: (currently it is on an EC2 under the MentorPal account)
###### It is recommend using the DockerFile created for this purpose.  
- Install docker on a linux server or use an autodeploy method
- Copy this whole repository and insert the GoogleNews vector into the website_version folder
- Create the image and then deploy it
> sudo docker build -t ubuntu/node-web-app .
> sudo docker run -p 80:80 ubuntu/node-web-app
###### If you would like to do it manually for some reason:
- Follow the main python guide to install dependencies and setup the classifier.  The commands below are also written out in "commandsneeded.txt"
- Clone the whole repository including the web folder.
- Use Python3.
- Install all dependencies with pip3.
- This project doesn't use NPCEditor so that setup can be ignored
####### Next, setup the web server.
- Open terminal in the root directory (where app.js is) and type 'npm init' to install dependencies.
- Make sure the vector_models folder contains the GoogleNews vectors and the mentors folder is copied to the same level as package.json is
- Type 'node app' and the program should run.
- The python script will be called by node.js.
- If Linux is not used, Python3 might not be able to find its path.  Go to the index.js route to fix it.
- If the Tensorflow import takes a long time, node might believe that python crashed.  Suppress the warnings from Python-shell using this strategy (also commented in)
https://github.com/extrabacon/python-shell/issues/113
- Python errors will be piped through Node, so crashes on Node could occur from Python dependencies.
- The pickling library for python can throw a warning about conflicting versions or platforms when loading the classifier model.  With the current version, this can be ignored.
#### To add mentors to the program:
- First, follow the main guide to process the video data and create outputs for the classifier etc.
- As outlined in the other readme, the classifer.py framework needs the mentor added to it.
- The website_interface.py needs knowledge of the new mentor.  Copy paste another else if statement as explained in that comment block.
- Next, enter a 'route' in the node index.js to allow users to visit a certain mentor URL in the website.  Copy paste as explained in that comment block.
- To allow for users to visit mentors from each other's, copy paste another selection for the dropdown box in the navbar to that new url.
- Finally, edit the client index.js in the public folder to add a new mentor, again following that comment block.
## Why it was created this way:
#### UI:
- The look and feel of the original Unity3D MentorPal was functional and excellent for this task so a goal was to stay true to it.
- The web version could emulate its layout easily for desktops and then it was slightly edited for portrait mobile systems.
- To create the basic aesthetic and make the content responsive, Bootstrap was used.
- It needed to be cross-browser compatible, including the transcript and video format.
#### Classifier:
- To get responses from the questions, wrapping up the python classifer scripts was the fastest and easiest method.
- website_interface.py simplifies queries through this python classifier and sets up the imports efficiently
- The npm package for node python-shell runs this script in python shell using the keyboard input as its input method and print as the output.
#### Backend:
- Node.js was chosen for its scalability, ease of use, and abundance of libraries such as python shell, Watson etc.
- Python-shell node library was used. This meant that the python3 part and nodejs part has to be running on the same server, the Dockerimage has to have both python3 and nodejs installed, and each part cannot be offloaded to a different server.  However, its simplicity and efficiency did make it worthwhile for a smaller service such as this one.
- No templating engine and vanilla javascript was used as much as possible for simplification of the scripts.
- Socket.io a websockets library is used for simple client to server and server to client data transfer.

If anything else is needed, don't hesitate to contact the original REU intern, me/Kenneth Shaw at kshaw@gatech.edu.
