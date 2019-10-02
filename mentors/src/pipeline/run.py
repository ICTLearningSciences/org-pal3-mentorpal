from pipeline.mentorpath import MentorPath
from pipeline.process import sync_timestamps
from pipeline.training_data import QuestionsParaphrasesAnswersBuilder


class Pipeline:

    mpath: MentorPath = None

    def __init__(self, mentor: str, mentor_data_path: str):
        self.mpath = MentorPath(mentor_id=mentor, root_path=mentor_data_path)

    def sync_timestamps(self):
        # utterances_cur = self.mpath.load_utterances()
        utterances_new = sync_timestamps(self.mpath)
        print(f"utterances={utterances_new.to_dict()}")

    def data_update(self):
        utterances_new = sync_timestamps(self.mpath)
        mentor = self.mpath.get_mentor_id()
        qpab = QuestionsParaphrasesAnswersBuilder()
        qpab.add_row(question="question 1", mentor_id=mentor, answer="answer to question 1")
        qpab.add_row(question="question 2 diff", mentor_id=mentor, answer="answer to question 2 is diff")
        qpa_df = qpab.to_data_frame()
        self.mpath.write_questions_paraphrases_answers(qpa_df)
        print(f"utterances={utterances_new.to_dict()}")

