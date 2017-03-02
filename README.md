# MentorPAL - A virtual human to help students with STEM careers

Get Transcripts
---------------
To obtain transcripts for a particular video, do the following:

  1. Place the video and the timestamps file inside recordings/session_n/ where n is the session number (session_0 for example).
  2. The video must be named as video.mp4. The timestamps file must be timestamps.csv.
  3. Run the command 'python generate_transcript.py /example/path' where the path must be the absolute path to recordings/session_n.
  4. The program will first convert the video to audio and create audio.wav.
  5. Then, the program will cut the audio into chunks, based on the timestamps provided. The chunks are stored inside recordings/session_n/audiochunks and the chunks are named from q0.wav to qm.wav where m is the number of questions asked in the session.
  6. Once the chunks have been obtained, the program will automatically call the watson method in ibm_stt.py.
  7. The transcript will be automatically generated and stored as transcript.csv inside recordings/session_n.
  
  
Dependencies
------------
  The following packages are required for the program to run. All these can be installed from pip or easy_install.
    1. watson_developer_cloud : IBM Watson's Python wrapper to communicate with their STT service.
    2. ffmpy : A wrapper for FFmpeg, which is used to convert video to audio and also cut the audio file into chunks.
  
  
