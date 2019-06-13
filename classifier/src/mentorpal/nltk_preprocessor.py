import string
from nltk.tokenize import RegexpTokenizer
from nltk import pos_tag
from nltk.stem import PorterStemmer

'''
This class contains the methods that operate on the questions to normalize them. The questions are tokenized, punctuations are
removed and words are stemmed to bring them to a common platform
'''
class NLTKPreprocessor(object):
    def __init__(self):
        self.punct = set(string.punctuation)
        self.stemmer=PorterStemmer()

    def inverse_transform(self, X):
        return [" ".join(doc) for doc in X]

    def transform(self, X):
        return list(self.tokenize(X))

    '''
    Tokenizes the input question. It also performs case-folding and stems each word in the question using Porter's Stemmer.
    '''
    def tokenize(self, sentence):
        tokenizer=RegexpTokenizer(r'\w+')
        # Break the sentence into part of speech tagged tokens
        tokenized_words=[]
        for token, tag in pos_tag(tokenizer.tokenize(sentence)):
            token = token.lower()
            token = token.strip()

            # If punctuation, ignore token and continue
            if all(char in self.punct for char in token):
                continue

            # Stem the token and yield
            try:
                stemmed_token=self.stemmer.stem(token)
            except:
                print("Unicode error. File encoding was changed when you opened it in Excel. ", end=" ")
                print("This is most probably an error due to csv file from Google docs being opened in Word. ", end=" ")
                print("Download the file from Google Docs and DO NOT open it in Excel. Run the program immediately. ", end=" ")
                print("If you want to edit using Excel and then follow instructions at: ")
                print("http://stackoverflow.com/questions/6002256/is-it-possible-to-force-excel-recognize-utf-8-csv-files-automatically")
                continue

            yield stemmed_token