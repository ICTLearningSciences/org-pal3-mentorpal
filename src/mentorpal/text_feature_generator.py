import re
import numpy as np

'''
This class contains the methods that operate on the questions to generate text features that can help the classifier make better decisions.
'''
class TextFeatureGenerator(object):
    def __init__(self):
        pass

    def any_negation(self, question_text):
        for word in question_text.lower().split():
            if word in ['n', 'no', 'non', 'not'] or re.search(r"\wn't", word):
                return 1
        return 0

    def log_wordcount(self, question_text):
        wordcount = len(question_text.split())
        return np.log(1 + wordcount)

    def negation_mod(self, question_text):
        count = 0
        for word in question_text.lower().split():
            if word in ['n', 'no', 'non', 'not'] or re.search(r"\wn't", word):
                count = count + 1
        return count%2 
        
    def what_question(self, question_text):
        if 'what' in question_text.lower().split():
            return 1
        return 0

    def how_question(self, question_text):
        if 'how' in question_text.lower().split():
            return 1
        return 0
    
    def why_question(self, question_text):
        if 'why' in question_text.lower().split():
            return 1
        return 0
    
    def when_question(self, question_text):
        if 'when' in question_text.lower().split():
            return 1
        return 0
    
    def where_question(self, question_text):
        if 'where' in question_text.lower().split():
            return 1
        return 0

    def univariate_features(self, question_text):
        negation_feature = self.any_negation(question_text)
        wordcount_feature = self.log_wordcount(question_text) or 0
        negmod_feature = self.negation_mod(question_text)
        whatques_feature = self.what_question(question_text)
        howques_feature = self.how_question(question_text)
        whyques_feature = self.why_question(question_text)
        whenques_feature = self.when_question(question_text)
        whereques_feature = self.where_question(question_text)

        return [negation_feature, wordcount_feature, negmod_feature, whatques_feature, howques_feature, whyques_feature, whenques_feature, whereques_feature]