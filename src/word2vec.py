import gensim
import nltk
import os
import csv
import sys
import porterstemmer

class corpus(object):
    def __init__(self, dirname):
        self.dirname=dirname

    def __iter__(self):
        for fname in os.listdir(self.dirname):
            csvfile=open(os.path.join(self.dirname, fname, 'transcript.csv'))
            csvreader=csv.reader(csvfile)
            for row in csvreader:
                yield row[0].lower().split()


def main():
    sentences=corpus(sys.argv[1])
    model = gensim.models.Word2Vec.load_word2vec_format('./model/GoogleNews-vectors-negative300.bin', binary=True)
    model=gensim.models.Word2Vec(sentences, min_count=1, hs=1, negative=0)
    # vocab=[k for (k,v) in model.wv.vocab.iteritems()]
    # print vocab
    print "Enter input now"
    a=raw_input()
    while a != '1':
        print model.score([a.split()])
        b=a.split()
        for word in b:
            print model.wv[word]
        a=raw_input()



if __name__=="__main__":
    main()
