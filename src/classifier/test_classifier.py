from metrics import Metrics
from classifier_default import Classifier

metrics = Metrics()
classifier = Classifier()

metrics.get_answer_confidence(classifier, "who are you?")

# classification_score = 0.60
# test_metrics()

# def test_metrics(self):
#     metrics = Metrics.Metrics()
#     metrics.calculate_accuracy()

#     training_data_path = os.path.join(CORPUS_DIR, QUESTION_CLASSIFICATION_TRAINING_DATA)
#     df_question = pandas.read_csv(training_data_path, sep='|', header=0)
#     df_question_train, df_question_test = train_test_split(df_question, test_size=0.2, random_state=42)

#     predicted_class, clf, df_question_train_label, df_question_train = \
#         classify_question(df_question_train=df_question_train, df_question_test=df_question_test)

#     scores = cross_val_score(clf, df_question_train, df_question_train_label)

#     print("Accuracy: %0.2f (+/- %0.2f)" % (scores.mean(), scores.std() * 2))
#     print("SD:", scores.std())

#     assert scores.mean() > classification_score