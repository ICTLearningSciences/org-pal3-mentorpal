import lstm
import build_dataset
import logisticregression as lr
from gensim.models.keyedvectors import KeyedVectors


def create_data():
    print "Building dataset..."
    bd=build_dataset.BuildDataset()
    print "Reading topics..."
    bd.read_topics()
    print "Reading data..."
    bd.read_data()
    print "Generate w2v vectors..."
    bd.w2v_model=KeyedVectors.load_word2vec_format('../GoogleNews-vectors-negative300.bin', binary=True)
    bd.generate_training_vectors()
    bd.generate_sparse_topic_vectors()
    print "write data..."
    bd.write_data()

def train_lstm():
    print "Starting LSTM topic training..."
    tl=lstm.TopicLSTM()
    print "LSTM is reading training data..."
    tl.read_training_data()
    print "Training LSTM..."
    tl.train_lstm()
    print "Trained LSTM."

def train_lr():
    lc=lr.LogisticClassifier()
    lc.load_data()
    #lc.create_unfused_vectors()
    lc.create_fused_vectors()


if __name__=='__main__':
    #create_data()
    #train_lstm()
    train_lr()
