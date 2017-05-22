# MentorPAL

Data Preparation
---------------
To obtain transcripts for a particular video, do the following:

  0. After the interview is done, watch it fully and note down the start and end timestamps for each question. Format: HH:MM:SS. Download the timestamps sheet and video. Look at existing timestamp sheets for exact format of the sheet.
  1. Place the video and the timestamps file inside **recordings/session1/**, **recordings/session2/**, etc.
  2. The video must be named as **session1part1.mp4**. The timestamps file must be **session1part1_timestamps.csv**. The session number and part number will change based on what you have. If a session has only one part, then it will be session3part1.mp4, session3part1_timestamps.csv. Part numbering begins at 1.
  3. Run the command `python src/data_pipeline/prepare_data.py /example/path/ICT/Recordings/sessionN` from root directory of the git repository. *N* is the session number.
  4. The program will first convert the video to audio and create **session1part1.wav.**, etc. based on what the video name is. The audio file has same name, except the extension
  5. Then, the program will cut the audio into chunks, based on the timestamps provided. The chunks are stored inside **recordings/session1/audiochunks** and the chunks are named from **a0.wav** to **qm.wav** where *m* is the number of questions asked in the session.
  6. Once the chunks have been obtained, the program will automatically call the IBM Watson method in `ibm_stt.py`.
  7. The transcript will be automatically generated and stored as **transcript.csv** inside **recordings/session_n.**
  8. Once the transcripts have been generated, put them on Google Sheets and manually edit them to make them coherent.
  9. Work on generating the paraphrases for each question. Also assign Tags and Helper Tags to each question.
  10. Combine the paraphrases and answers and add them to the **Questions_Paraphrases_Answers** sheet inside MentorPAL/Dialogue on Google Drive.
  11. Download that sheet as CSV and name it **Questions_Paraphrases_Answers.csv**. Place it inside MentorPAL/data on your local machine.
  12. Run `python src/post_process_data.py /example/path/ICT/Recordings <start_session> <end_session>`. start_session and end_session are session numbers. Example, giving 1 4 will make the code run from session1 to session4. Giving 2 2 will make code run only for session2.
  13. This will generate **classifier_data.csv**, **NPCEditor_data.xlsx** and **metadata.txt**. The first file is for use by the classifier. The second file should be imported into NPCEditor (More on this later) and the third file contains metadata about what was processed. If you have 5 sessions so far and then, you record a sixth session, you don't need to run the post_process_data.py from scratch. You can just run python src/post_process_data.py /example/path/ICT/Recordings 6 6` and data from the sixth session will be appended to **classifier_data.csv** and **NPCEditor_data.xlsx**. **metadata.txt** will also be updated and you can add more new sessions like this. Yould still have to run prepare_data.py for the new sessions every time and have to do the manual work (paraphrases, tags, manual transcription cleanup) for each session.
  14. Now, data for the ensemble classifier is ready and you can proceed to training the classifier and NPCEditor.
  
Dependencies
------------
The following packages are required for the program to run. All these can be installed from pip or easy_install.
  
  1. **watson_developer_cloud** : IBM Watson's Python wrapper to communicate with their STT service.
  2. **ffmpy** : A wrapper for FFmpeg, which is used to convert video to audio and also cut the audio file into chunks.
  3. **keras** : Neural network library
  4. **scikit-learn** : Python Machine Learning library
  5. **numpy** : Python scientific computing
  6. **pandas** : High-performance data structures for Python
  7. **gensim** : Topic Modelling - needed for word2vec
  
  
