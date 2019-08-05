### Classification Data Pipeline Info
---------------
#### Pipeline Overview
The classification data pipeline can be used to create all data needed for a usable
mentor from raw recording files.

As a prerequisite of running the pipeline the following files are needed for each
part of each session. These files should be uploaded into the `mentorpal-source-videos`
S3 bucket in `usc-ict-aws-mentor-pal` AWS account:
- {mentor}/data/recordings/session{session#}/part{part#}_video.mp4
- {mentor}/data/recordings/session{session#}/part{part#}_audio.wav
- {mentor}/data/recordings/session{session#}/part{part#}_transcripts.csv

After running the pipeline the following files will be generated:
- {mentor}/data/classifier_data.csv
- {mentor}/data/metadata.csv
- {mentor}/data/topics.csv
- {mentor}/data/utterance_data.csv

Additionally the following intermediate build files will be generated. These can
be used to debug different parts of a pipeline
- {mentor}/build/recordings/session{session#}/out/audiochunks/*
- {mentor}/build/recordings/session{session#}/out/transcript.csv
- {mentor}/data/questions_paraphrases_answers.csv
- {mentor}/data/prompts_utterances.csv

#### Pipeline Usage
Pipeline usage is fully documented in the Makefile.
- `make {mentor}/data` runs a full build of {mentor} if data folder is not present
- `make {mentor}/data/update` runs a full build of {mentor} regardless of whether data folder is present
- `make {mentor}/build` downloads and preprocesses {mentor} data if build folder is not present
- `make {mentor}/build/update` downloads and preprocesses {mentor} data  regardless of whether build folder is present
- `make shell` opens an interactive terminal in the data pipeline docker image.
Useful for debugging these scripts
- `make docker-build` rebuilds the data pipeline docker container. Useful for developing these scripts.
- `make clean` removes all build data for all mentors
- `make clean/{mentor}` removes build data for {mentor}

##### Outdated Documentation -> Provides insights on scripts but unreliable
To obtain transcripts for a particular video, do the following:
  1. After the interview is done, watch it fully and note down the start and end timestamps for each question. Format: HH:MM:SS. Download the timestamps sheet and video. Look at existing timestamp sheets for exact format of the sheet.
  2. Place the video and the timestamps file inside **recordings/session1/**, **recordings/session2/**, etc.
  3. The video must be named as **session1part1.mp4**. The timestamps file must be **session1part1_timestamps.csv**. The session number and part number will change based on what you have. If a session has only one part, then it will be session3part1.mp4, session3part1_timestamps.csv. Part numbering begins at 1.
  4. Activate **data-pipeline-env** virtualenv with `source data-pipeline-env/bin/activate`
  5. Run the command `python mentors/src/data_pipeline/prepare_data.py <mentor>/recordings/session<N>` from root directory of the git repository. Replace `<mentor>` with the mentor's name and `<N>` with the session number.
      - The program will first convert the video to audio and create **session1part1.wav.**, etc. based on what the video name is. The audio file has same name, except the extension
      - Then, the program will cut the audio into chunks, based on the timestamps provided. The chunks are stored inside **recordings/session1/audiochunks** and the chunks are named from **a0.wav** to **qm.wav** where *m* is the number of questions asked in the session.
      - Once the chunks have been obtained, the program will automatically call the IBM Watson method in `ibm_stt.py`.
      - The transcript will be automatically generated and stored as **transcript.csv** inside **recordings/session_n.**
  6. Once the transcripts have been generated, put them on Google Sheets and manually edit them to make them coherent.
  7. Work on generating the paraphrases for each question. Also assign Tags and Helper Tags to each question.
  8. Combine the paraphrases and answers and add them to the **questions_paraphrases_answers** sheet inside MentorPAL/Dialogue on Google Drive. Do the same with the prompts and utterances and add them to **prompts_utterances**.
  9. Download that sheet and **prompts_utterances** as XLSX and name them **questions_paraphrases_answers.xlsx** and **prompts_utterances.xlsx**. Place them inside MentorPAL/data on your local machine (the root, not inside your mentor folder)
  10. Run `python mentors/src/data_pipeline/post_process_data.py example\path\to\mentor <start_session> <end_session>`. `<start_session>` and `<end_session>` are session numbers. Example, giving 1 4 will make the code run from session1 to session4. Giving 2 2 will make code run only for session2.
  11. This will generate **classifier_data.csv**, **npceditor_data.xlsx** and **metadata.csv**. The first file is for use by the classifier. The second file should be imported into NPCEditor (More on this later) and the third file contains metadata about what was processed. If you have 5 sessions so far and then, you record a sixth session, you don't need to run the post_process_data.py from scratch. You can just run python src/post_process_data.py /example/path/to/mentor 6 6` and data from the sixth session will be appended to **classifier_data.csv** and **npceditor_data.xlsx**. **metadata.csv** will also be updated and you can add more new sessions like this. Yould still have to run prepare_data.py for the new sessions every time and have to do the manual work (paraphrases, tags, manual transcription cleanup) for each session.
  12. Now, data for the ensemble classifier is ready and you can proceed to training the classifier and NPCEditor.

  **Troubleshooting of timestamps (Appended 6/19/18..if you need help since it's a pain kshaw@gatech.edu has touched it most recently)**
  1. Extra lines can't exist in the csv since ",,,," will break the python script and believe that the columns are empty
  2. The filenames must be exact even in lower/uppercase
  3. Any generated files must be deleted if you want to run the generator again, or it will give a exit code 1 error.
  4. The column names in the csv need to be exact even in case or Pandas error might occur.

  **WARNING: Opening any csv/xlsx file downloaded from Google Sheets in Excel will mess up the encoding of text in the files. Google Sheets uses UTF-8 encoding whereas Excel uses Windows-1252. The files must be in UTF-8 only. Always edit the file in Google Sheets and just download it. Never open it on your host machine.**

  **If using LibreOffice Calc, the default encoding seems to be UTF-8. Hence, it should be safe to open the csv/xlsx files in LibreOffice**


-----
